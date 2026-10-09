"use client";

import { useState } from "react";

const PARAMS = [
  { name: "hazard", desc: "Hazard type. v0.1 only ships landslide.", ex: "landslide" },
  { name: "country", desc: "Country name substring or code, case-insensitive.", ex: "Nepal" },
  { name: "since", desc: "Earliest event date.", ex: "2026-01-01" },
  { name: "until", desc: "Latest event date.", ex: "2026-10-09" },
  { name: "confidence", desc: "Extraction confidence tier.", ex: "high" },
  { name: "limit", desc: "Page size, 1 to 100. Default 20.", ex: "20" },
  { name: "offset", desc: "Page offset. Default 0.", ex: "0" },
];

const EXAMPLE_RES = `{
  "sample": true,
  "total": 3,
  "limit": 20,
  "offset": 0,
  "events": [
    {
      "id": "hl-7bb6b703c838",
      "hazard_type": "landslide",
      "title": "Rompimento de tubulacao da sabesp causa deslizamento em varzea paulista",
      "country": "Brazil",
      "country_code": "BR",
      "lat": -23.482,
      "lon": -47.435,
      "date": "2026-10-01",
      "severity_note": null,
      "sources": [
        { "url": "https://g1.globo.com/.../rompimento-de-tubulacao-da-sabesp-causa-deslizamento-em-varzea-paulista.ghtml", "publisher": "g1.globo.com" }
      ],
      "extraction_method": "doc-api-slug-geocode-v1",
      "confidence": "high",
      "confidence_note": "Landslide keyword in the article URL slug; place geocoded in the story's country. Article body not read; counts unverified."
    }
  ]
}`;

export default function ApiDocs() {
  const [copied, setCopied] = useState(false);
  const curl = `curl "https://hazards.nshipyard.com/api/v1/events?hazard=landslide&country=Nepal&limit=5"`;
  return (
    <section id="api" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 md:py-24">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#2563eb]">API</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
        Query the dataset yourself.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
        One endpoint, no key. Every response is marked <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px]">sample: true</code> and
        every event carries its extraction method and confidence. Machine-readable
        contract at <a href="/api/openapi.json" className="font-medium text-[#2563eb] underline decoration-[#2563eb]/30 underline-offset-2 hover:decoration-[#2563eb]">/api/openapi.json</a> (OpenAPI 3.1).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-[10px] border border-[#ececec]">
          <div className="border-b border-[#ececec] bg-neutral-50 px-5 py-3">
            <code className="font-mono text-sm font-semibold">GET /api/v1/events</code>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {PARAMS.map((p) => (
                <tr key={p.name} className="border-b border-[#f3f3f3] last:border-0">
                  <td className="px-5 py-3 font-mono text-[13px] font-medium text-neutral-900">{p.name}</td>
                  <td className="px-5 py-3 text-neutral-600">{p.desc}</td>
                  <td className="hidden px-5 py-3 font-mono text-[13px] text-neutral-400 sm:table-cell">{p.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div>
          <div className="rounded-[10px] border border-[#ececec] bg-neutral-950 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs text-neutral-400">Example request</p>
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(curl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs text-white transition-colors hover:bg-white/20"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-neutral-200">{curl}</pre>
          </div>
          <div className="mt-4 rounded-[10px] border border-[#ececec] bg-neutral-50 p-5">
            <p className="mb-3 font-mono text-xs text-neutral-400">Example response (trimmed)</p>
            <pre className="max-h-72 overflow-auto font-mono text-[12px] leading-relaxed text-neutral-700">{EXAMPLE_RES}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
