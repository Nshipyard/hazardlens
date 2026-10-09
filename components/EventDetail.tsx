"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { HazardEvent } from "@/lib/events";

interface Props {
  event: HazardEvent | null;
  onClose: () => void;
}

export default function EventDetail({ event, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!event) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Event details"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[10px] bg-white p-6 shadow-xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2563eb]">
            {event.hazard_type} &middot; {event.date}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{event.title}</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {event.place_name === event.country ? event.country : `${event.place_name}, ${event.country}`}
          {event.severity_note ? <span className="font-medium text-neutral-900"> &middot; {event.severity_note}</span> : null}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[10px] bg-neutral-50 px-3 py-2">
            <dt className="text-xs text-neutral-500">Coordinates</dt>
            <dd className="font-medium text-neutral-900">{event.lat}, {event.lon}</dd>
          </div>
          <div className="rounded-[10px] bg-neutral-50 px-3 py-2">
            <dt className="text-xs text-neutral-500">Geocoding level</dt>
            <dd className="font-medium text-neutral-900">{event.geo_level} ({event.confidence} confidence)</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">{event.confidence_note}</p>

        <h3 className="mt-6 text-sm font-semibold">Sources ({event.sources.length})</h3>
        <ul className="mt-2 space-y-2">
          {event.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[10px] border border-[#ececec] px-4 py-2.5 text-sm transition-colors hover:border-[#2563eb] hover:bg-blue-50/50"
              >
                <span className="font-medium text-[#2563eb]">{s.publisher}</span>
                <span className="mt-0.5 block truncate text-xs text-neutral-400">{s.url}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-neutral-400">
          Extracted {event.extraction_method} from GDELT 2.0 GKG. Article bodies were not read; verify details against the sources.
        </p>
      </div>
    </div>,
    document.body,
  );
}
