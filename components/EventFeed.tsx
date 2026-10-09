"use client";

import { useMemo, useState } from "react";
import type { HazardEvent } from "@/lib/events";

const CONF_STYLE: Record<string, string> = {
  high: "bg-blue-50 text-[#1d4ed8] ring-blue-200",
  medium: "bg-sky-50 text-sky-700 ring-sky-200",
  low: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

interface Props {
  events: HazardEvent[];
  countries: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function EventFeed({ events, countries, selectedId, onSelect }: Props) {
  const [country, setCountry] = useState("");
  const [confidence, setConfidence] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (country && e.country !== country) return false;
      if (confidence && e.confidence !== confidence) return false;
      if (since && e.date < since) return false;
      if (until && e.date > until) return false;
      return true;
    });
  }, [events, country, confidence, since, until]);

  const activeFilters = [country, confidence, since, until].some(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-[10px] border border-[#ececec] bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Confidence</span>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            className="rounded-[10px] border border-[#ececec] bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">Any confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Since</span>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded-[10px] border border-[#ececec] bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#2563eb] focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Until</span>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="rounded-[10px] border border-[#ececec] bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#2563eb] focus:outline-none"
          />
        </label>
        {activeFilters && (
          <button
            type="button"
            onClick={() => { setCountry(""); setConfidence(""); setSince(""); setUntil(""); }}
            className="rounded-[10px] border border-[#ececec] px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Clear
          </button>
        )}
        <p className="ml-auto text-sm text-neutral-500">
          {filtered.length} of {events.length} events
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-[10px] border border-dashed border-[#ececec] bg-neutral-50 px-6 py-12 text-center">
          <p className="font-medium text-neutral-900">No events match these filters.</p>
          <p className="mt-1 text-sm text-neutral-500">
            This is a {events.length}-event sample, not a census. Widen the filters or clear them.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelect(e.id === selectedId ? null : e.id)}
                className={`block w-full rounded-[10px] border bg-white p-5 text-left transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                  e.id === selectedId ? "border-[#2563eb] ring-2 ring-[#2563eb]/20" : "border-[#ececec]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold tracking-tight text-neutral-900">{e.title}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${CONF_STYLE[e.confidence]}`}>
                    {e.confidence}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {e.place_name} &middot; {e.date}
                  {e.severity_note ? <span className="font-medium text-neutral-900"> &middot; {e.severity_note}</span> : null}
                </p>
                <p className="mt-3 text-xs text-neutral-400">
                  {e.sources.length} source{e.sources.length === 1 ? "" : "s"} &middot; {e.extraction_method} &middot; {e.geo_level}-level geocoding
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
