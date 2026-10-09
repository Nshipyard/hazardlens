import { loadDataset } from "@/lib/events";

/**
 * GET /api/openapi.json
 * OpenAPI 3.1 description of the hazardlens API.
 */
export async function GET() {
  const ds = loadDataset();
  const base = "https://hazards.nshipyard.com";
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "hazardlens API",
      version: "0.1.0",
      description:
        "Queryable access to the hazardlens landslide sample dataset: news-derived, geo-tagged hazard events extracted from GDELT 2.0 GKG. The dataset is a fixed sample with documented extraction limits, not a live feed and not a census of events. Extraction method and confidence are carried on every event.",
      license: { name: "MIT" },
    },
    servers: [{ url: base, description: "Production" }],
    paths: {
      "/api/v1/events": {
        get: {
          summary: "List landslide events",
          description:
            "Filterable list of extracted landslide events, newest first. Every response is marked sample:true.",
          parameters: [
            { name: "hazard", in: "query", schema: { type: "string", example: "landslide" }, description: "Hazard type filter. v0.1 only ships landslide." },
            { name: "country", in: "query", schema: { type: "string", example: "Nepal" }, description: "Case-insensitive substring match on country name, or exact country code." },
            { name: "since", in: "query", schema: { type: "string", format: "date", example: ds.date_range?.from ?? "2026-10-01" }, description: "Earliest event date (YYYY-MM-DD)." },
            { name: "until", in: "query", schema: { type: "string", format: "date", example: ds.date_range?.to ?? "2026-10-09" }, description: "Latest event date (YYYY-MM-DD)." },
            { name: "confidence", in: "query", schema: { type: "string", enum: ["high", "medium", "low"], example: "high" }, description: "Extraction confidence tier." },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Page size." },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 }, description: "Page offset." },
          ],
          responses: {
            "200": {
              description: "A page of events",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/EventList" },
                },
              },
            },
            "400": { description: "Bad date format" },
          },
        },
      },
    },
    components: {
      schemas: {
        EventList: {
          type: "object",
          required: ["sample", "total", "limit", "offset", "events"],
          properties: {
            sample: { type: "boolean", example: true },
            sample_note: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            total: { type: "integer", example: ds.event_count },
            limit: { type: "integer", example: 20 },
            offset: { type: "integer", example: 0 },
            events: { type: "array", items: { $ref: "#/components/schemas/HazardEvent" } },
          },
        },
        HazardEvent: {
          type: "object",
          required: ["id", "hazard_type", "country", "lat", "lon", "date", "sources", "extraction_method"],
          properties: {
            id: { type: "string", example: "hl-20261009014500-123" },
            hazard_type: { type: "string", example: "landslide" },
            title: { type: "string", example: "Chile mudslide las condes cars swept away" },
            country: { type: "string", example: "Chile" },
            country_code: { type: "string", example: "CI" },
            admin1: { type: "string", nullable: true, example: "CI12" },
            place_name: { type: "string", example: "Las Condes, Región Metropolitana, Chile" },
            geo_level: { type: "string", enum: ["city", "admin1", "country", "unknown"] },
            lat: { type: "number", format: "float", example: -33.367 },
            lon: { type: "number", format: "float", example: -70.517 },
            date: { type: "string", format: "date", example: "2026-10-09" },
            severity_note: { type: "string", nullable: true, example: "3 reported killed" },
            reported_killed: { type: "integer", nullable: true },
            reported_injured: { type: "integer", nullable: true },
            sources: {
              type: "array",
              items: {
                type: "object",
                required: ["url", "publisher"],
                properties: {
                  url: { type: "string", format: "uri" },
                  publisher: { type: "string" },
                },
              },
            },
            extraction_method: { type: "string", example: "doc-api-slug-geocode-v1" },
            match_tier: { type: "string", example: "slug" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            confidence_note: { type: "string" },
          },
        },
      },
    },
  });
}
