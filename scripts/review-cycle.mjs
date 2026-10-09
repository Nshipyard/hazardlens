// Product review cycle for hazardlens.
// Verifies UI-level behavior a unit test cannot catch: map renders with
// markers, filters work, event detail opens with sources, API docs render,
// honest sample labeling is visible, and the console is clean, at desktop
// and mobile viewports. Run against a production build:
//
//   npm run build && (npx next start -p 3105 &) && sleep 5 && node scripts/review-cycle.mjs
//
// Exits non-zero on any failed check. Screenshots land in /tmp/hl-review.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.REVIEW_BASE || "http://localhost:3105";
const OUT = "/tmp/hl-review";
mkdirSync(OUT, { recursive: true });

// Tile cache: OSM tiles via curl (browser User-Agent + referer, per the tile
// usage policy) so screenshots work behind the proxy.
const TILE_CACHE = "/tmp/hl-tile-cache";
mkdirSync(TILE_CACHE, { recursive: true });
function fetchTile(url) {
  const cachePath = join(TILE_CACHE, Buffer.from(url).toString("base64url") + ".png");
  if (existsSync(cachePath)) return readFileSync(cachePath);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const buf = execFileSync("curl", ["-s", "--max-time", "20",
        "-A", "hazardlens/0.1 (review screenshots)",
        "--referer", "http://localhost:3105/", url], { maxBuffer: 4 * 1024 * 1024 });
      if (buf.length < 500) throw new Error("tile too small: " + url);
      writeFileSync(cachePath, buf);
      return buf;
    } catch (e) {
      if (attempt === 1) {
        // Serve a transparent tile rather than aborting: keeps the review
        // at zero console errors when a single tile is unreachable.
        return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=", "base64");
      }
    }
  }
}

function parseProxy(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const proxy = { server: `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}`, bypass: "localhost,127.0.0.1" };
    if (u.username) proxy.username = decodeURIComponent(u.username);
    if (u.password) proxy.password = decodeURIComponent(u.password);
    return proxy;
  } catch { return null; }
}
const proxy = parseProxy(process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) ?? undefined;

let failures = 0;
const errors = [];
function check(name, cond, detail) {
  if (cond) console.log("PASS  " + name);
  else { failures++; console.log("FAIL  " + name + (detail ? " -- " + detail : "")); }
}

const browser = await chromium.launch();

async function newPage(viewport, section) {
  const context = await browser.newContext({ viewport, ...(proxy ? { proxy } : {}) });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("[" + section + " " + viewport.width + "x" + viewport.height + "] console.error: " + msg.text());
  });
  page.on("pageerror", (err) => errors.push("[" + section + " " + viewport.width + "x" + viewport.height + "] pageerror: " + err.message));
  await page.route("**://tile.openstreetmap.org/**", async (route) => {
    try { await route.fulfill({ body: fetchTile(route.request().url()), contentType: "image/png" }); }
    catch { await route.abort(); }
  });
  return { context, page };
}

// ---------- Desktop ----------
{
  const { context, page } = await newPage({ width: 1440, height: 900 }, "desktop");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  const heroText = await page.locator("main").innerText();
  check("sample badge visible", /Sample dataset/i.test(heroText));
  check("event count shown", /landslide events/.test(heroText));

  const mapBox = await page.locator(".leaflet-container").boundingBox();
  check("map visible", !!mapBox && mapBox.height > 300, JSON.stringify(mapBox));
  const markers = await page.locator(".leaflet-container path.leaflet-interactive").count();
  check("map has event markers", markers > 0, "markers=" + markers);
  const tiles = await page.locator(".leaflet-container img.leaflet-tile").count();
  check("map tiles loaded", tiles > 4, "tiles=" + tiles);
  await page.locator("#map").screenshot({ path: join(OUT, "map-desktop.png") });

  // Click the first feed card -> detail modal with sources
  const firstCard = page.locator("#feed ul li button").first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  const dialogText = await page.locator('[role="dialog"]').innerText();
  check("detail modal opens", dialogText.length > 50);
  check("detail shows sources", /Sources \(\d+\)/.test(dialogText));
  check("detail shows confidence note", /Article body not read/i.test(dialogText));
  const srcLinks = await page.locator('[role="dialog"] a[target="_blank"]').count();
  check("source links present and external", srcLinks > 0, "links=" + srcLinks);
  await page.screenshot({ path: join(OUT, "detail-desktop.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Filters: pick a country from the dropdown
  const countryOptions = await page.locator("#feed select").first().locator("option").count();
  check("country filter has options", countryOptions > 2, "options=" + countryOptions);
  await page.locator("#feed select").first().selectOption({ index: 1 });
  await page.waitForTimeout(500);
  const countText = await page.locator("#feed").innerText();
  check("country filter narrows feed", /of \d+ events/.test(countText), countText.slice(0, 100));
  await page.screenshot({ path: join(OUT, "feed-desktop.png") });

  // API docs section renders with example
  await page.locator("#api").scrollIntoViewIfNeeded();
  const apiText = await page.locator("#api").innerText();
  check("api docs render", /GET \/api\/v1\/events/.test(apiText));
  check("openapi link present", /\/api\/openapi.json/.test(apiText));

  // Method section with limits
  await page.locator("#method").scrollIntoViewIfNeeded();
  const methodText = await page.locator("#method").innerText();
  check("method documents limits", /Known limits/.test(methodText) && /not a census/i.test(methodText));

  // API itself
  const apiRes = await page.request.get(BASE + "/api/v1/events?limit=2");
  check("api 200", apiRes.ok());
  const apiJson = await apiRes.json();
  check("api sample flag", apiJson.sample === true && Array.isArray(apiJson.events));
  check("api event shape", apiJson.events.length > 0 && !!apiJson.events[0].confidence_note,
    JSON.stringify(Object.keys(apiJson.events[0] || {})));
  const apiFiltered = await page.request.get(BASE + "/api/v1/events?country=Chile&limit=5");
  const afj = await apiFiltered.json();
  check("api country filter", afj.events.every((e) => /chile/i.test(e.country)),
    JSON.stringify(afj.events.map((e) => e.country)));
  const apiBad = await page.request.get(BASE + "/api/v1/events?since=not-a-date");
  check("api bad date 400", apiBad.status() === 400);
  const oa = await page.request.get(BASE + "/api/openapi.json");
  check("openapi 200 + version", oa.ok() && (await oa.json()).openapi === "3.1.0");

  await context.close();
}

// ---------- Mobile ----------
{
  const { context, page } = await newPage({ width: 390, height: 844 }, "mobile");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const mapBox = await page.locator(".leaflet-container").boundingBox();
  check("mobile map visible", !!mapBox && mapBox.height > 200, JSON.stringify(mapBox));
  const noHOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("mobile no horizontal overflow", noHOverflow);
  await page.screenshot({ path: join(OUT, "hero-mobile.png") });
  await page.locator("#feed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "feed-mobile.png") });
  await page.locator("#feed ul li button").first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  const dlg = await page.locator('[role="dialog"] > div').boundingBox();
  check("mobile dialog fits viewport", !!dlg && dlg.y >= 0 && dlg.y + dlg.height <= 845, JSON.stringify(dlg));
  await page.screenshot({ path: join(OUT, "detail-mobile.png") });
  await context.close();
}

await browser.close();

console.log(errors.length === 0 ? "console errors: none" : "console errors: " + errors.length + "\n" + errors.join("\n"));
if (errors.length > 0) failures++;
console.log(failures === 0 ? "ALL REVIEW CHECKS PASSED" : failures + " CHECK(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
