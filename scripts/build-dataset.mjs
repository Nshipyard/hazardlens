// hazardlens dataset builder: GDELT doc API -> landslide events sample.
//
// What it does (the extractor, documented honestly):
//   1. Queries the GDELT 2.0 DOC API (artlist mode) for landslide terms over
//      the last 3 months. One request per term, paced >=10s apart (GDELT asks
//      for one per 5s; shared IPs get HTTP 429 under load, so each query
//      retries with backoff and the run continues with whatever succeeded).
//   2. Keeps articles whose URL slug contains a landslide keyword
//      (publisher-written topic descriptor; English + Spanish, Portuguese,
//      French, German, Italian). Drops election metaphors ("landslide
//      victory") and midterms coverage.
//   3. Geocodes a place name for each article: candidate place words are cut
//      from the URL slug (hazard keywords, infrastructure words, casualty
//      and news jargon stripped), then looked up via Nominatim
//      (OpenStreetMap) with the story's country as a hint. The top
//      country-matching result is taken. Nominatim's 1 req/s usage policy
//      is honored.
//   4. Dedupes to one event per (date, country, ~1-degree cell), merging
//      source URLs.
//
// What it does NOT do (limits):
//   - No article body is fetched or read; matching is keyword-level.
//   - Place-name extraction from slugs is heuristic. Slugs like
//     "flood-and-landslide-control-using-chepang-knowledge" yield weak
//     candidates; the geocoder then does its best and the confidence tier
//     records that.
//   - Geocoding can mismatch (wrong town, wrong country). Country-level
//     fallbacks are approximate by definition.
//   - GDELT artlist carries no casualty data, so severity_note is null
//     unless the slug itself states casualties (e.g. "kills-12").
//   - Coverage follows news coverage: under-reported regions are
//     under-represented. This is a sample of reported events, not a census.
//   - The GDELT doc API is rate-limited; a run may return fewer articles
//     than exist. Raw API responses are cached in the cache dir for reruns.
//
// Usage:
//   node scripts/build-dataset.mjs --max-events 150
//
// Output: data/events-sample.json (+ data/build-stats.json)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const QUERIES = [
  "landslide", "mudslide", "rockslide",
  "deslizamiento", "deslizamento", "glissement de terrain", "erdrutsch", "frana",
];
const PER_QUERY = 250;

const SLUG_KEYWORDS = [
  "landslide", "mudslide", "rockslide", "debris flow", "land slip",
  "earthflow", "mudflow", "slope failure",
  "deslizamiento", "deslizamento", "glissement", "erdrutsch", "frana",
  "landverschuiving", "osuwisko", "jordskred", "landslid",
];
const EXCLUSIONS = [
  "landslide victory", "landslide win", "landslide defeat", "election",
  "ballot", "candidate", "parliament", "senate", "campaign", "polls show",
  "won the vote", "electoral", "midterm", "midterms",
];
// Words stripped from slugs before place-name extraction: hazard keywords,
// infrastructure words, casualty/news jargon, and directional/generic terms.
// Without these, the geocoder gets phrases like "two one injured" and fails.
const SLUG_STOPWORDS = new Set([
  "landslide", "landslides", "mudslide", "mudslides", "rockslide", "rockslides",
  "deslizamiento", "deslizamento", "glissement", "terrain", "erdrutsch", "frana",
  "debris", "flow", "road", "roads", "highway", "street", "route",
  "kills", "kill", "killed", "dead", "death", "deaths", "dies", "hit", "hits",
  "injured", "injuries", "missing", "trapped", "hospital",
  "after", "again", "reopens", "reopen", "removal", "remove", "blocked", "block",
  "blocks", "swept", "away", "threatens", "threaten", "warning", "watch",
  "control", "using", "new", "live", "update", "updates", "breaking", "video",
  "photos", "photo", "watchlive", "confirmed", "toll", "rises", "rise", "rising",
  "rescue", "rescued", "operations", "devastating", "devastation", "heavy",
  "rains", "rain", "flood", "floods", "flooding", "amid", "among", "aftermath",
  "reported", "reports", "report", "say", "says", "stranded", "evacuated",
  "national", "international", "news", "world", "local",
  "district", "region", "regions", "area", "areas", "city", "town", "towns",
  "state", "province", "county", "river", "village", "villages",
  "north", "south", "east", "west", "central", "upper", "lower",
  "soil", "excavation", "examination", "examined", "climate", "change", "risk",
  "morning", "major", "dozens", "metro", "closes", "close", "new", "hits",
  "commute", "closures", "closure", "concerns", "minister",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "the", "a", "an", "in", "on", "at", "of", "and", "or", "to", "for",
  "with", "by", "from", "near", "as",
]);
// Election/governance contexts the base exclusions miss.
const EXTRA_EXCLUSIONS = [
  "governor", "mayor", "house hopeful", "nailbiter",
  "raising-the-risk", "risk-of-deadly", "consolidamento",
];
// Tricky multi-word places that naive tokenizing mangles.
const PLACE_OVERRIDES = [
  { match: "new-mexico", place: "New Mexico" },
];

const COUNTRY_CODES = {
  "nepal": "NP", "india": "IN", "indonesia": "ID", "philippines": "PH",
  "china": "CN", "japan": "JP", "colombia": "CO", "peru": "PE", "brazil": "BR",
  "mexico": "MX", "italy": "IT", "switzerland": "CH", "austria": "AT",
  "canada": "CA", "pakistan": "PK", "bangladesh": "BD", "vietnam": "VN",
  "thailand": "TH", "myanmar": "MM", "malaysia": "MY", "taiwan": "TW",
  "south korea": "KR", "kenya": "KE", "uganda": "UG", "rwanda": "RW",
  "ethiopia": "ET", "guatemala": "GT", "honduras": "HN", "el salvador": "SV",
  "costa rica": "CR", "panama": "PA", "ecuador": "EC", "bolivia": "BO",
  "chile": "CL", "argentina": "AR", "venezuela": "VE", "sri lanka": "LK",
  "united states": "US", "united kingdom": "GB", "france": "FR", "germany": "DE",
  "spain": "ES", "portugal": "PT", "greece": "GR", "turkey": "TR", "iran": "IR",
  "afghanistan": "AF", "australia": "AU", "new zealand": "NZ",
  "papua new guinea": "PG", "dominican republic": "DO", "haiti": "HT",
  "russia": "RU", "ukraine": "UA", "belarus": "BY", "kazakhstan": "KZ",
  "uzbekistan": "UZ", "kyrgyzstan": "KG", "tajikistan": "TJ", "georgia": "GE",
  "armenia": "AM", "azerbaijan": "AZ", "norway": "NO", "sweden": "SE",
  "finland": "FI", "denmark": "DK", "poland": "PL", "netherlands": "NL",
  "belgium": "BE", "czechia": "CZ", "slovakia": "SK", "romania": "RO",
  "hungary": "HU", "serbia": "RS", "croatia": "HR", "bulgaria": "BG",
  "egypt": "EG", "morocco": "MA", "algeria": "DZ", "nigeria": "NG",
  "ghana": "GH", "south africa": "ZA", "saudi arabia": "SA", "iraq": "IQ",
  "israel": "IL", "lebanon": "LB", "syria": "SY", "yemen": "YE", "oman": "OM",
};
// Endonyms common in non-English slugs/titles, mapped to the same codes.
const ALIAS_CODES = {
  "italia": "IT", "deutschland": "DE", "espana": "ES", "brasil": "BR",
  "nederland": "NL", "turkiye": "TR", "polska": "PL",
};
const ALL_CODES = { ...COUNTRY_CODES, ...ALIAS_CODES };
// Multi-word regions that contain a country name ("new mexico" has "mexico").
const REGION_CODES = { "new mexico": "US", "puerto rico": "US", "hong kong": "HK" };
function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const CODE_NAMES = Object.fromEntries(Object.entries(COUNTRY_CODES).map(([k, v]) => [v, k.replace(/\b\w/g, (c) => c.toUpperCase())]));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const MAX_EVENTS = parseInt(arg("max-events", "150"), 10);
const ONLY_QUERIES = arg("only-queries", ""); // comma-separated subset of QUERIES
const SKIP_DISCOVERY = process.argv.includes("--skip-discovery");
const CACHE = arg("cache-dir", join(tmpdir(), "hl-doc"));
mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "hazardlens/0.1 (research data pipeline)" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429) {
        console.log(`  429, waiting 60s (try ${t + 1}/${tries})`);
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      console.log(`  error ${e.message}, waiting 30s`);
      await sleep(30000);
    }
  }
  throw new Error("exhausted retries");
}

/**
 * Geocode via Nominatim (OpenStreetMap). Open-Meteo's geocoder proved too
 * weak for this job: it misses well-known regions ("New Mexico", "Tibet")
 * and its comma-joined queries often return nothing. Nominatim usage policy
 * (1 req/s, identifying User-Agent) is honored: callers sleep 1200ms between
 * queries, total volume is ~150 requests per run.
 */
async function geocode(place, countryHint) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=jsonv2&limit=5&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "hazardlens/0.1 (research data pipeline; open dataset of landslide events)" },
    });
    if (!res.ok) return null;
    const hits = await res.json();
    if (!Array.isArray(hits) || hits.length === 0) return null;
    const hint = (countryHint || "").toLowerCase();
    const ranked = [...hits].sort((a, b) => {
      const ac = ((a.address && a.address.country) || "").toLowerCase();
      const bc = ((b.address && b.address.country) || "").toLowerCase();
      return (hint && ac.includes(hint) ? 0 : 1) - (hint && bc.includes(hint) ? 0 : 1);
    });
    const h = ranked[0];
    const addr = h.address || {};
    const hCountry = addr.country || "";
    const type = h.type || "";
    const granularity =
      addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.neighbourhood || addr.municipality || addr.county ? "city"
      : addr.state || addr.province || addr.region || ["state", "province", "region"].includes(type) ? "admin1"
      : "country";
    return {
      name: h.display_name ? h.display_name.split(",").slice(0, 3).join(",") : place,
      country: hCountry || countryHint || "",
      admin1: addr.state || addr.province || addr.region || null,
      lat: parseFloat(h.lat),
      lon: parseFloat(h.lon),
      countryMatch: !!hint && hCountry.toLowerCase().includes(hint),
      granularity,
      placeClass: h.category || "",
    };
  } catch {
    return null;
  }
}

/** Cut place-name candidates from a URL slug, best-first.
 *  Single distinctive words come before 2-word windows before the full
 *  phrase: the geocoder resolves "kerala" far better than
 *  "news national kerala two one injured". */
function slugPlaceCandidates(url) {
  let path = "";
  try { path = new URL(url).pathname.toLowerCase(); } catch { return []; }
  // Drop words with digits (article IDs like "article71490291" are never places).
  const words = path.split(/[^a-z0-9\u00c0-\u024f]+/).filter((w) => w.length > 2 && !SLUG_STOPWORDS.has(w) && !/\d/.test(w));
  const cands = [];
  // Single words, longest first (most distinctive).
  const singles = [...words].sort((a, b) => b.length - a.length).filter((w) => w.length >= 4);
  // 2-word windows FIRST: compound place names ("oak glen", "las condes")
  // are more distinctive than any single word and rarely fuzzy-match junk.
  for (let i = 0; i + 1 < words.length; i++) {
    const w = `${words[i]} ${words[i + 1]}`;
    if (!cands.includes(w)) cands.push(w);
  }
  for (const w of singles) {
    if (!cands.includes(w)) cands.push(w);
  }
  // Full cleaned phrase as a last resort.
  const phrase = words.join(" ");
  if (phrase.length >= 3 && !cands.includes(phrase)) cands.push(phrase);
  return cands.slice(0, 6);
}

function humanizeSlug(url) {
  try {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    const last = segs.pop() || "";
    const words = last
      .replace(/\.(html?|php|aspx?|cms|ghtml|ece|shtml)$/i, "")
      .replace(/[-_+]+/g, " ")
      .replace(/^\d+\s*/, "")
      .replace(/\s+\d{4,}$/, "") // trailing article IDs
      .trim();
    if (words.length < 10 || !/[a-zA-Z]{3,}/.test(words)) return null;
    return words.charAt(0).toUpperCase() + words.slice(1);
  } catch {
    return null;
  }
}

function slugHasKeyword(url) {
  let path = "";
  try { path = new URL(url).pathname.toLowerCase(); } catch { return false; }
  return SLUG_KEYWORDS.some((k) => path.includes(k));
}

function excluded(a) {
  const hay = `${a.title || ""} ${a.url} ${a.domain || ""}`.toLowerCase();
  return EXCLUSIONS.some((e) => hay.includes(e)) || EXTRA_EXCLUSIONS.some((e) => hay.includes(e)) ||
    // Opinion/analysis pieces are not events.
    hay.includes("/opinion/") || hay.includes("/columns/");
}

/** Find a country/region name mentioned in the slug/title (longest match wins).
 *  Returns { name, cc } or null. Regions are checked first so "new mexico"
 *  does not resolve to the country Mexico. */
function storyCountry(a) {
  const hay = `${a.title || ""} ${a.url}`.toLowerCase().replace(/[-_]/g, " ");
  const hit = (names) => {
    for (const n of Object.keys(names).sort((x, y) => y.length - x.length)) {
      if (n.length < 4) continue;
      if (new RegExp(`\\b${reEscape(n)}\\b`).test(hay)) return n;
    }
    return "";
  };
  const r = hit(REGION_CODES);
  if (r) return { name: r, cc: REGION_CODES[r] };
  const c = hit(ALL_CODES);
  return c ? { name: c, cc: ALL_CODES[c] } : null;
}

async function main() {
  const t0 = Date.now();
  const seen = new Map(); // url -> article

  const queries = ONLY_QUERIES
    ? QUERIES.filter((q) => ONLY_QUERIES.split(",").map((s) => s.trim().toLowerCase()).includes(q.toLowerCase()))
    : QUERIES;
  if (!SKIP_DISCOVERY) {
  for (const q of queries) {
    const cacheFile = join(CACHE, `artlist-${createHash("md5").update(q).digest("hex")}.json`);
    let data = null;
    if (existsSync(cacheFile)) {
      console.log(`query "${q}": cached`);
      data = JSON.parse(readFileSync(cacheFile, "utf-8"));
    } else {
      console.log(`query "${q}": fetching...`);
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&format=json&maxrecords=${PER_QUERY}&sort=datedesc`;
      try {
        data = await fetchJson(url);
        writeFileSync(cacheFile, JSON.stringify(data));
      } catch (e) {
        console.log(`query "${q}" FAILED: ${e.message}; continuing with other queries`);
      }
      await sleep(10000); // respect GDELT pacing
    }
    const articles = (data && data.articles) || [];
    console.log(`  -> ${articles.length} articles`);
    for (const a of articles) {
      if (!a.url || seen.has(a.url)) continue;
      if (!slugHasKeyword(a.url)) continue;
      if (excluded(a)) continue;
      seen.set(a.url, a);
    }
  }
  } else {
    // Load previously cached artlist responses (all queries).
    for (const q of QUERIES) {
      const cacheFile = join(CACHE, `artlist-${createHash("md5").update(q).digest("hex")}.json`);
      if (!existsSync(cacheFile)) continue;
      const data = JSON.parse(readFileSync(cacheFile, "utf-8"));
      for (const a of (data.articles || [])) {
        if (!a.url || seen.has(a.url)) continue;
        if (!slugHasKeyword(a.url)) continue;
        if (excluded(a)) continue;
        seen.set(a.url, a);
      }
    }
    console.log(`loaded ${seen.size} unique slug-matching articles from cache.`);
  }
  console.log(`${seen.size} unique slug-matching articles.`);

  // Geocode each article's place.
  const events = [];
  let i = 0;
  for (const a of seen.values()) {
    i++;
    const cands = slugPlaceCandidates(a.url);
    // Story geography beats publisher geography for international news.
    const sc = storyCountry(a);
    const detected = sc ? sc.name : "";
    const detectedCc = sc ? sc.cc : "";
    const countryHint = detected
      ? (CODE_NAMES[detectedCc] || detected)
      : (a.sourcecountry || "");
    // Hard overrides for places tokenizing mangles.
    const slugLower = a.url.toLowerCase();
    const override = PLACE_OVERRIDES.find((o) => slugLower.includes(o.match));
    // The detected story country goes first: strongest signal, and a
    // country-level hit beats a fuzzy junk match on a long random word.
    const ordered = detected ? [detected, ...cands.filter((c) => c !== detected)] : cands;
    let geo = null;
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const tryGeo = async (place, hint) => {
      const g = await geocode(place, hint);
      await sleep(1200); // Nominatim usage policy: max 1 req/s
      if (!g) return null;
      // When the story names a country, reject hits in any other country:
      // Nominatim fuzzy-matches junk words to random places worldwide.
      if (detectedCc) {
        const gcc = ALL_CODES[(g.country || "").toLowerCase()] || "";
        if (gcc && gcc !== detectedCc) return null;
      }
      // The result's name must contain a distinctive token from the query.
      // Kills matches like query "tibet" -> "Society, Gulshan-e-Iqbal Town".
      if (place !== detected) {
        const tokens = norm(place).split(/\s+/).filter((t) => t.length >= 4);
        if (tokens.length > 0 && !tokens.some((t) => norm(g.name).includes(t))) return null;
      }
      // No story country: the event must be in the publisher's country.
      // (Story-country cases are checked above.) This drops unplaceable
      // international items instead of pinning them to a random country.
      if (!detectedCc && a.sourcecountry) {
        const scc = ALL_CODES[a.sourcecountry.toLowerCase()] || "";
        const gcc = ALL_CODES[(g.country || "").toLowerCase()] || "";
        if (scc && gcc && gcc !== scc) return null;
      }
      return g;
    };
    if (override) {
      geo = await tryGeo(override.place, "");
    } else {
      for (const c of ordered) {
        geo = await tryGeo(c, countryHint);
        if (geo) break;
      }
    }
    if (!geo) {
      console.log(`  [${i}/${seen.size}] no geo: ${a.url.slice(0, 80)}`);
      continue;
    }
    const seendate = a.seendate || "";
    const date = seendate.length >= 8 ? `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}` : null;
    if (!date) continue;
    const cc = ALL_CODES[(geo.country || countryHint || "").toLowerCase()] || detectedCc || "";
    const title = humanizeSlug(a.url) || a.title || `Landslide reported (${date})`;
    // Casualty hint from the slug itself (e.g. "kills-12").
    let killed = null;
    const km = a.url.toLowerCase().match(/kill(?:s|ed)?-(\d{1,4})/);
    if (km) killed = parseInt(km[1], 10);
    const granular = geo.granularity === "city" || geo.granularity === "admin1";
    // Cap confidence when the match is a business/POI rather than a real place
    // (Nominatim class "amenity", "shop", "tourism", ...): the name matched a
    // word in the slug, but it is not the event location.
    const placeLike = ["place", "boundary", "highway", "natural", "waterway", "landuse"].includes(geo.placeClass);
    const baseConf = granular && geo.countryMatch ? "high" : granular ? "medium" : "low";
    const confidence = !placeLike && baseConf === "high" ? "medium" : baseConf;
    events.push({
      id: `hl-${createHash("md5").update(a.url).digest("hex").slice(0, 12)}`,
      hazard_type: "landslide",
      title: title.length > 120 ? title.slice(0, 120) : title,
      country: geo.country || CODE_NAMES[cc] || countryHint || "Unknown",
      country_code: cc,
      admin1: geo.admin1,
      place_name: geo.name,
      geo_level: granular ? "city" : "country",
      lat: Math.round(geo.lat * 1000) / 1000,
      lon: Math.round(geo.lon * 1000) / 1000,
      date,
      severity_note: killed ? `${killed} reported killed (from headline slug; unverified)` : null,
      reported_killed: killed,
      reported_injured: null,
      sources: [{ url: a.url, publisher: a.domain || "unknown" }],
      extraction_method: "doc-api-slug-geocode-v1",
      match_tier: "slug",
      confidence,
      confidence_note: granular
        ? (geo.countryMatch
          ? "Landslide keyword in the article URL slug; place geocoded in the story's country. Article body not read; counts unverified."
          : "Landslide keyword in the article URL slug; geocoded place is outside the detected story country, so the location is less certain. Article body not read.")
        : "Landslide keyword in the article URL slug, but only country-level geocoding was possible. Treat location as approximate; article body not read.",
    });
    if (i % 20 === 0) console.log(`  geocoded ${i}/${seen.size}`);
    if (events.length >= MAX_EVENTS * 2) break;
  }

  // Dedupe by (date, country, ~1-degree cell), merging sources.
  const byKey = new Map();
  for (const e of events) {
    const key = `${e.date}|${e.country_code}|${Math.round(e.lat)}|${Math.round(e.lon)}`;
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, e); continue; }
    if (!prev.sources.some((s) => s.url === e.sources[0].url) && prev.sources.length < 5) {
      prev.sources.push(e.sources[0]);
    }
    if (e.reported_killed && !prev.reported_killed) {
      prev.reported_killed = e.reported_killed;
      prev.severity_note = e.severity_note;
    }
  }
  let final = [...byKey.values()];
  final.sort((a, b) =>
    (b.reported_killed || 0) - (a.reported_killed || 0) ||
    (b.date < a.date ? -1 : 1),
  );
  final = final.slice(0, MAX_EVENTS);

  const countries = [...new Set(final.map((e) => e.country))].sort();
  const dates = final.map((e) => e.date).sort();
  const out = {
    dataset: "hazardlens landslide sample",
    sample: true,
    generated_at: new Date().toISOString(),
    source: "GDELT 2.0 DOC API, artlist mode (global news, default 3-month window); geocoding via Nominatim (OpenStreetMap)",
    extractor: "scripts/build-dataset.mjs (doc-api-slug-geocode-v1): artlist queries per landslide term, URL-slug keyword match, election/governance/risk-analysis exclusions, place-name extraction from slug, Nominatim geocoding with story-country hint (detected from slug/title, publisher country ignored for international news), date+country+grid dedupe. No article bodies fetched. See script header for limits.",
    event_count: final.length,
    date_range: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    countries,
    events: final,
  };
  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(join(ROOT, "data", "events-sample.json"), JSON.stringify(out, null, 2));
  writeFileSync(join(ROOT, "data", "build-stats.json"), JSON.stringify({
    generated_at: out.generated_at,
    queries: QUERIES,
    unique_articles: seen.size,
    geocoded: events.length,
    events_kept: final.length,
    elapsed_s: Math.round((Date.now() - t0) / 1000),
  }, null, 2));
  console.log(`Wrote data/events-sample.json: ${final.length} events, ${countries.length} countries, ${dates[0]} to ${dates[dates.length - 1]}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
