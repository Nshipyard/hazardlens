"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HazardEvent } from "@/lib/events";

const CONF_COLORS: Record<string, string> = {
  high: "#1d4ed8",
  medium: "#60a5fa",
  low: "#cbd5e1",
};

interface Props {
  events: HazardEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function EventMap({ events, selectedId, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const cbRef = useRef(onSelect);
  useEffect(() => { cbRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !divRef.current || mapRef.current) return;
      const map = leaflet.map(divRef.current, {
        worldCopyJump: true,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      // Esri World Street Map: keyless, no API key. Replaces tile.openstreetmap.org
      // (403s from shared egress IPs and policy-fragile) with honest attribution.
      leaflet
        .tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
          attribution:
            'Basemap: <a href="https://www.esri.com">Esri</a> &middot; &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 12,
          minZoom: 2,
        })
        .addTo(map);
      layerRef.current = leaflet.layerGroup().addTo(map);
      map.setView([20, 10], 2);
      setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 250);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;
      layer.clearLayers();
      const bounds: [number, number][] = [];
      events.forEach((e) => {
        const selected = e.id === selectedId;
        leaflet
          .circleMarker([e.lat, e.lon], {
            radius: selected ? 10 : 6 + (e.reported_killed ? 2 : 0),
            color: "#ffffff",
            weight: 2,
            fillColor: CONF_COLORS[e.confidence] ?? "#94a3b8",
            fillOpacity: selected ? 1 : 0.85,
          })
          .bindTooltip(
            `<b>${e.title}</b><br>${e.country}, ${e.date}${e.severity_note ? `<br>${e.severity_note}` : ""}`,
            { direction: "top" },
          )
          .on("click", () => cbRef.current(selected ? null : e.id))
          .addTo(layer);
        bounds.push([e.lat, e.lon]);
      });
      if (bounds.length > 0 && !selectedId) {
        map.fitBounds(leaflet.latLngBounds(bounds), { padding: [40, 40] });
      }
    })();
    return () => { cancelled = true; };
  }, [events, selectedId]);

  return (
    <div className="relative">
      <div ref={divRef} className="h-[420px] w-full md:h-[520px]" />
      <div className="absolute bottom-3 left-3 z-[500] rounded-[10px] bg-white/95 px-3 py-2 text-[11px] leading-5 text-neutral-700 shadow-lg backdrop-blur">
        <div className="font-semibold text-neutral-900">Marker color: extraction confidence</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" /> High</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#60a5fa]" /> Medium</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#cbd5e1]" /> Low</span>
        </div>
      </div>
    </div>
  );
}
