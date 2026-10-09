// Typed access to the hazardlens sample dataset.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface EventSource {
  url: string;
  publisher: string;
}

export interface HazardEvent {
  id: string;
  hazard_type: string;
  title: string;
  country: string;
  country_code: string;
  admin1: string | null;
  place_name: string;
  geo_level: "city" | "admin1" | "country" | "unknown";
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD
  severity_note: string | null;
  reported_killed: number | null;
  reported_injured: number | null;
  sources: EventSource[];
  extraction_method: string;
  match_tier: string;
  confidence: "high" | "medium" | "low";
  confidence_note: string;
}

export interface DatasetMeta {
  dataset: string;
  sample: boolean;
  generated_at: string;
  source: string;
  extractor: string;
  event_count: number;
  date_range: { from: string; to: string } | null;
  countries: string[];
  events: HazardEvent[];
}

let cache: DatasetMeta | null = null;

export function loadDataset(): DatasetMeta {
  if (cache) return cache;
  const raw = readFileSync(join(process.cwd(), "data", "events-sample.json"), "utf-8");
  cache = JSON.parse(raw) as DatasetMeta;
  return cache;
}

export interface EventFilter {
  hazard?: string;
  country?: string;
  since?: string;
  until?: string;
  confidence?: string;
  limit: number;
  offset: number;
}

export function filterEvents(filter: EventFilter): { events: HazardEvent[]; total: number } {
  const ds = loadDataset();
  let list = ds.events;
  if (filter.hazard) list = list.filter((e) => e.hazard_type === filter.hazard);
  if (filter.country) {
    const q = filter.country.toLowerCase();
    list = list.filter(
      (e) => e.country.toLowerCase().includes(q) || e.country_code.toLowerCase() === q,
    );
  }
  if (filter.since) list = list.filter((e) => e.date >= filter.since!);
  if (filter.until) list = list.filter((e) => e.date <= filter.until!);
  if (filter.confidence) list = list.filter((e) => e.confidence === filter.confidence);
  // Newest first; events with reported deaths first within a day.
  list = [...list].sort(
    (a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : (b.reported_killed || 0) - (a.reported_killed || 0)),
  );
  const total = list.length;
  const events = list.slice(filter.offset, filter.offset + filter.limit);
  return { events, total };
}
