const STEPS = [
  {
    n: "01",
    title: "GDELT watches the news",
    body: "GDELT 2.0 monitors global news in 65+ languages and updates every 15 minutes. hazardlens queries its DOC API in artlist mode, one query per landslide term across 6 languages, paced to respect rate limits.",
  },
  {
    n: "02",
    title: "Keyword match on URL slugs",
    body: "A landslide keyword (English, Spanish, Portuguese, French, German, Italian) in the article URL slug marks a candidate. Slugs are publisher-written topic descriptors, far more precise than theme tags. Election metaphors and opinion pieces are excluded.",
  },
  {
    n: "03",
    title: "Slug geocoding with Nominatim",
    body: "Each candidate's place name is cut from the URL slug, then geocoded with Nominatim (OpenStreetMap), preferring the story's country over the publisher's. Junk fuzzy matches are rejected by country-agreement and name-containment checks.",
  },
  {
    n: "04",
    title: "Dedupe, label, publish",
    body: "Candidates collapse to one event per date, country and grid cell, with merged source links. Every event ships with its extraction method, match tier, confidence and the limits of what was measured.",
  },
];

const LIMITS = [
  "No article body is fetched or read. Matching is keyword-level on URL slugs, so a follow-up report can look like a new event.",
  "Place names come from slugs, not article text. Geocoding can pin the wrong town; country-level events are approximate by definition.",
  "Casualty counts are parsed from headline slugs and are unverified. Treat them as leads.",
  "News coverage is the sampling frame. Under-reported regions are under-represented. This sample is not a census of landslides.",
];

export default function MethodSection() {
  return (
    <section id="method" className="scroll-mt-20 border-t border-[#ececec] bg-neutral-50/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#2563eb]">Method</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
          Exactly what the machine does.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
          The pipeline is deterministic and auditable: the same artlist responses always
          produce the same dataset. The extractor&apos;s limits are part of the
          product, printed next to the data, not buried in a footnote.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-[10px] border border-[#ececec] bg-white p-6">
              <p className="font-mono text-xs font-semibold text-[#2563eb]">{s.n}</p>
              <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-[10px] border border-amber-200 bg-amber-50/60 p-6">
          <h3 className="text-[15px] font-semibold text-amber-900">Known limits</h3>
          <ul className="mt-3 space-y-2">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-amber-900/80">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-amber-500">!</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-neutral-500">
          Reproduce it: <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px]">node scripts/build-dataset.mjs --max-events 150</code>.
          The script header documents every choice. GDELT rate-limits shared IPs, so queries are paced 10 seconds apart with backoff retries; Nominatim geocoding honors 1 request per second.
        </p>
      </div>
    </section>
  );
}
