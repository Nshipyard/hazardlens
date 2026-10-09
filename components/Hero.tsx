import type { DatasetMeta } from "@/lib/events";

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Hero({ meta }: { meta: DatasetMeta }) {
  const stats = [
    { n: String(meta.event_count), label: "landslide events" },
    { n: String(meta.countries.length), label: "countries" },
    { n: meta.date_range ? `${shortDate(meta.date_range.from)} to ${shortDate(meta.date_range.to)}` : "n/a", label: "date range" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-10 pt-14 md:pt-20">
      <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
        Sample dataset: {meta.event_count} reported events, not a census
      </p>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
        Landslides, as the news saw them.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
        hazardlens reads global news through GDELT and turns landslide reports
        into structured, mappable data: where, when, how bad, and the article
        it came from. Floods got this treatment years ago. Landslides did not.
      </p>
      <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-[#ececec] bg-white px-4 py-4">
            <dt className="order-2 mt-1 text-xs text-neutral-500">{s.label}</dt>
            <dd className="order-1 text-2xl font-semibold tracking-tight text-[#2563eb]">{s.n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-neutral-400">
        Source: GDELT 2.0 GKG (global news, updated every 15 minutes). Extracted
        {meta.generated_at ? ` ${new Date(meta.generated_at).toISOString().slice(0, 10)}` : ""} with the
        documented doc-api-slug-geocode-v1 extractor. Every event carries its provenance.
      </p>
    </section>
  );
}
