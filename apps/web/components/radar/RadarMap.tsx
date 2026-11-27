"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicEvent } from "@hp1/shared";

import { freeSeats, whenLabel } from "@/components/events/formatEvent";

/** Phase 4 switches tile providers through this env var. */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "&copy; OpenStreetMap contributors";

export interface RadarItem {
  event: PublicEvent;
  distanceKm: number;
}

/**
 * Leaflet map for the radar. Client-only: load it with next/dynamic + ssr:false.
 * Plots district-level `event.coords` only (AGENTS.md rule 4); popups are built
 * with textContent, never innerHTML, because titles are user input.
 */
export default function RadarMap({
  center,
  neighborhood,
  radiusKm,
  radarActive,
  items,
  onOpenEvent,
}: {
  center: [number, number];
  neighborhood: string;
  radiusKm: number;
  radarActive: boolean;
  items: RadarItem[];
  onOpenEvent: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [42.7, 25.3], zoom: 7, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 17 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    map.setView(center, radiusKm > 15 ? 10 : 12, { animate: true });

    // District search radius around the viewer's neighbourhood, never personal GPS.
    L.circle(center, {
      radius: radiusKm * 1000,
      color: "#1C4532",
      weight: 1.5,
      dashArray: "6 6",
      fillColor: "#1C4532",
      fillOpacity: radarActive ? 0.1 : 0.04,
    }).addTo(group);

    const me = document.createElement("div");
    me.style.fontSize = "13px";
    const meTitle = document.createElement("strong");
    meTitle.textContent = `Твоят район: ${neighborhood}`;
    const meNote = document.createElement("div");
    meNote.textContent = "Точната локация никога не се споделя.";
    me.append(meTitle, meNote);
    L.circleMarker(center, { radius: 8, color: "#FDFBF7", weight: 2.5, fillColor: "#1C4532", fillOpacity: 1 })
      .bindPopup(me)
      .addTo(group);

    for (const { event, distanceKm } of items) {
      const inRange = distanceKm <= radiusKm;
      const tone = inRange ? "#7C232B" : "#5D5348";

      // ~350 m zone instead of a pin, for privacy.
      L.circle(event.coords, { radius: 350, color: tone, weight: 1.5, fillColor: tone, fillOpacity: 0.16 }).addTo(group);

      const popup = document.createElement("div");
      popup.style.minWidth = "210px";
      const title = document.createElement("div");
      title.style.cssText = "font-weight:700;font-size:14px;color:#1E1915;margin-bottom:4px;";
      title.textContent = event.title;
      const meta = document.createElement("div");
      meta.style.cssText = "font-size:12px;color:#5D5348;margin-bottom:8px;";
      meta.textContent = `${event.city}, ${event.neighborhood} · ${whenLabel(event.startsAt)} · Свободни места: ${freeSeats(event)} · ~${distanceKm.toFixed(1)} км`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Отвори сбирката";
      btn.style.cssText =
        "width:100%;min-height:40px;padding:7px 12px;background:#1C4532;color:#F7F3EC;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;";
      btn.onclick = () => onOpenEvent(event.id);
      popup.append(title, meta, btn);

      L.circleMarker(event.coords, { radius: 9, color: "#FDFBF7", weight: 2, fillColor: tone, fillOpacity: 0.95 })
        .bindPopup(popup)
        .addTo(group);
    }
  }, [center, items, neighborhood, onOpenEvent, radarActive, radiusKm]);

  return <div ref={containerRef} className="h-[360px] w-full sm:h-[460px]" aria-label="Карта на сбирките по квартали" role="region" />;
}
