"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import EventMap from "@/components/EventMap";
import EventFeed from "@/components/EventFeed";
import EventDetail from "@/components/EventDetail";
import MethodSection from "@/components/MethodSection";
import ApiDocs from "@/components/ApiDocs";
import Footer from "@/components/Footer";
import type { DatasetMeta } from "@/lib/events";

export default function HomeClient({ meta }: { meta: DatasetMeta }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => meta.events.find((e) => e.id === selectedId) ?? null,
    [meta.events, selectedId],
  );

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <Header />
      <main>
        <Hero meta={meta} />

        <section id="map" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Recent events</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {meta.event_count} reported landslides on the map. Click a marker for sources.
              </p>
            </div>
          </div>
          <EventMap events={meta.events} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        <section id="feed" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Event feed</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Filter the sample by country, confidence, or date. Click a card for full provenance.
          </p>
          <div className="mt-6">
            <EventFeed
              events={meta.events}
              countries={meta.countries}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </section>

        <MethodSection />
        <ApiDocs />
      </main>
      <Footer />
      <EventDetail event={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
