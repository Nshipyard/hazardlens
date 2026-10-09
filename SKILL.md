---
name: hazardlens
description: Queryable open dataset of news-derived landslide events (GDELT 2.0 GKG). Use when an agent needs recent reported landslide events by country or date: location, date, severity hints, and source article links, each with extraction provenance and confidence.
---

# hazardlens skill

hazardlens answers "where have landslides been reported recently" with structured event data extracted from global news via GDELT 2.0 GKG.

## Demo status (read this first)

The API serves a **fixed sample dataset**, not a live feed. Every response carries `sample: true`. Coverage follows news coverage; under-reported regions are under-represented. This is a sample of reported events, never a census. Every event carries `extraction_method`, `match_tier`, `confidence` (high/medium/low), and a `confidence_note` stating the limits. No article bodies were read; casualty counts are unverified leads. The extraction pipeline is deterministic and re-runnable: `node scripts/build-dataset.mjs --max-events 150` (queries GDELT 2.0 DOC API artlist mode, geocodes via Nominatim).

## API

Base URL: `https://hazards.nshipyard.com` (local dev: `http://localhost:3000`). No key.

### List events

`GET /api/v1/events?hazard=landslide&country=Nepal&since=2026-01-01&limit=20`

Query params: `hazard` (v0.1: landslide), `country` (name substring or code, case-insensitive), `since` / `until` (YYYY-MM-DD), `confidence` (high/medium/low), `limit` (1-100, default 20), `offset` (default 0).

Response:

```json
{
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
      "place_name": "Alameda Jundiaí, Jardim Isaura, Sorocaba",
      "geo_level": "city",
      "lat": -23.482,
      "lon": -47.435,
      "date": "2026-10-01",
      "severity_note": null,
      "sources": [{ "url": "https://g1.globo.com/.../rompimento-de-tubulacao-da-sabesp-causa-deslizamento-em-varzea-paulista.ghtml", "publisher": "g1.globo.com" }],
      "extraction_method": "doc-api-slug-geocode-v1",
      "confidence": "high",
      "confidence_note": "Landslide keyword in the article URL slug; place geocoded in the story's country. Article body not read; counts unverified."
    }
  ]
}
```

### OpenAPI contract

`GET /api/openapi.json` returns the OpenAPI 3.1 description.

## Usage guidance for agents

- Prefer `confidence=high` when the downstream decision matters; treat `low` as leads.
- `geo_level: "country"` means the location is approximate by definition.
- Always surface `sources` links so a human can verify; never present `severity_note` counts as confirmed.
- For a full refresh, run the pipeline script; the API only serves the bundled sample.
