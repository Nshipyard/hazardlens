import { NextRequest } from "next/server";
import { filterEvents, loadDataset } from "@/lib/events";

/**
 * GET /api/v1/events?hazard=landslide&country=Nepal&since=2026-01-01&until=2026-12-31&confidence=high&limit=20&offset=0
 *
 * Queryable access to the hazardlens sample dataset. Every response carries
 * sample:true; this endpoint serves the bundled sample, not a live pipeline.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const limitRaw = parseInt(q.get("limit") ?? "20", 10);
  const offsetRaw = parseInt(q.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 20, 1), 100);
  const offset = Math.max(isFinite(offsetRaw) ? offsetRaw : 0, 0);

  const since = q.get("since");
  const until = q.get("until");
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (since && !dateRe.test(since)) {
    return Response.json({ error: "since must be YYYY-MM-DD" }, { status: 400 });
  }
  if (until && !dateRe.test(until)) {
    return Response.json({ error: "until must be YYYY-MM-DD" }, { status: 400 });
  }

  const ds = loadDataset();
  const { events, total } = filterEvents({
    hazard: q.get("hazard") ?? undefined,
    country: q.get("country") ?? undefined,
    since: since ?? undefined,
    until: until ?? undefined,
    confidence: q.get("confidence") ?? undefined,
    limit,
    offset,
  });

  return Response.json({
    sample: true,
    sample_note:
      "This endpoint serves a fixed sample dataset extracted from GDELT 2.0 GKG. It is not a live feed and is not a census of landslide events. See /api/openapi.json and the method section on the site.",
    generated_at: ds.generated_at,
    total,
    limit,
    offset,
    events,
  });
}
