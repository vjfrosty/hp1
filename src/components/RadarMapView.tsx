import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Compass, MapPin, Radio, ShieldCheck } from 'lucide-react';
import { GatheringEvent, UserProfile } from '../types/app';
import { BULGARIAN_CITIES } from '../data/bulgaria';

interface RadarMapViewProps {
  events: GatheringEvent[];
  profile: UserProfile;
  onToggleRadar: (active: boolean, radiusKm?: number, message?: string) => void;
  onOpenEvent: (eventId: string) => void;
}

// Haversine approximate distance in km (district-level only)
function approxDistanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a[0])) *
      Math.cos(toRad(b[0])) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export const RadarMapView: React.FC<RadarMapViewProps> = ({
  events,
  profile,
  onToggleRadar,
  onOpenEvent,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const userCenter = useMemo<[number, number]>(() => {
    const city = BULGARIAN_CITIES.find((c) => c.name === profile.city) || BULGARIAN_CITIES[0];
    const hood = city.neighborhoods.find((n) => n.name === profile.neighborhood);
    return hood ? hood.coords : city.coords;
  }, [profile.city, profile.neighborhood]);

  const activeEvents = useMemo(
    () =>
      events
        .filter((e) => !e.isCancelled && !profile.blockedUserIds.includes(e.organizerId))
        .map((e) => ({
          event: e,
          distanceKm: approxDistanceKm(userCenter, e.coords),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [events, profile.blockedUserIds, userCenter]
  );

  const withinRadius = useMemo(
    () => activeEvents.filter((item) => item.distanceKm <= profile.radarRadiusKm),
    [activeEvents, profile.radarRadiusKm]
  );

  // Initialize Leaflet OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userCenter,
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 17,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update map center, radius circle, and approximate district markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    map.setView(userCenter, profile.radarRadiusKm > 15 ? 10 : 12, { animate: true });

    // Approximate district search radius (never exact personal GPS)
    L.circle(userCenter, {
      radius: profile.radarRadiusKm * 1000,
      color: '#1C4532',
      weight: 1.5,
      dashArray: '6 6',
      fillColor: '#1C4532',
      fillOpacity: profile.radarActive ? 0.1 : 0.04,
    }).addTo(group);

    // Approximate neighborhood marker for current user
    L.circleMarker(userCenter, {
      radius: 8,
      color: '#FDFBF7',
      weight: 2.5,
      fillColor: '#1C4532',
      fillOpacity: 1,
    })
      .bindPopup(
        `<div style="font-size:13px"><strong>Твоят район: ${profile.neighborhood}</strong><br/><span>Точната локация никога не се споделя.</span></div>`
      )
      .addTo(group);

    activeEvents.forEach(({ event, distanceKm }) => {
      const confirmed = event.attendees.filter((a) => a.status === 'confirmed').length;
      const freeSeats = Math.max(0, event.maxAttendees - confirmed);
      const inRange = distanceKm <= profile.radarRadiusKm;

      // Approximate 350m zone circle for privacy
      L.circle(event.coords, {
        radius: 350,
        color: inRange ? '#7C232B' : '#5D5348',
        weight: 1.5,
        fillColor: inRange ? '#7C232B' : '#5D5348',
        fillOpacity: 0.16,
      }).addTo(group);

      const marker = L.circleMarker(event.coords, {
        radius: 9,
        color: '#FDFBF7',
        weight: 2,
        fillColor: inRange ? '#7C232B' : '#5D5348',
        fillOpacity: 0.95,
      }).addTo(group);

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '210px';
      popupContent.innerHTML = `
        <div style="font-weight:700;font-size:14px;color:#1E1915;margin-bottom:4px;">${event.title}</div>
        <div style="font-size:12px;color:#5D5348;margin-bottom:8px;">
          ${event.city}, ${event.neighborhood} · ${event.dateLabel} ${event.time}<br/>
          Свободни места: <strong>${freeSeats}</strong> · ~${distanceKm.toFixed(1)} км
        </div>
      `;
      const btn = document.createElement('button');
      btn.textContent = 'Отвори сбирката';
      btn.style.cssText =
        'width:100%;padding:7px 12px;background:#1C4532;color:#F7F3EC;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;';
      btn.onclick = () => onOpenEvent(event.id);
      popupContent.appendChild(btn);

      marker.bindPopup(popupContent);
    });
  }, [activeEvents, onOpenEvent, profile.neighborhood, profile.radarActive, profile.radarRadiusKm, userCenter]);

  return (
    <div className="space-y-6">
      {/* Radar Control Header */}
      <section className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1915] text-balance">
              Ракиен радар — компания в твоя район
            </h1>
            <p className="mt-2 text-sm text-[#5D5348]">
              Показваме сбирки по квартал и радиус. Приложението никога не споделя точната ти локация в реално време.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onToggleRadar(!profile.radarActive)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                profile.radarActive
                  ? 'bg-[#7C232B] text-[#F7F3EC] hover:bg-[#621B21]'
                  : 'bg-[#1C4532] text-[#F7F3EC] hover:bg-[#153526]'
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>
                {profile.radarActive
                  ? 'Изключи „Свободен съм тази вечер“'
                  : 'Свободен съм за компания тази вечер'}
              </span>
            </button>
          </div>
        </div>

        {/* Radius Slider & Privacy Line */}
        <div className="mt-5 grid gap-5 border-t border-[#DDD3C2] pt-5 md:grid-cols-2 md:items-center">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="radar-radius" className="font-medium text-[#1E1915]">
                Радиус около кв. {profile.neighborhood}, {profile.city}
              </label>
              <span className="font-mono font-semibold text-[#1C4532] tabular-nums">
                {profile.radarRadiusKm} км
              </span>
            </div>
            <input
              id="radar-radius"
              type="range"
              min={2}
              max={25}
              step={1}
              value={profile.radarRadiusKm}
              onChange={(e) => onToggleRadar(profile.radarActive, Number(e.target.value))}
              className="mt-2.5 w-full accent-[#1C4532] cursor-pointer"
            />
            <div className="mt-1 flex justify-between font-mono text-xs text-[#5D5348] tabular-nums">
              <span>2 км (квартала)</span>
              <span>12 км (града)</span>
              <span>25 км (околности)</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#EFE8DC]/70 p-3.5 text-xs text-[#5D5348]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1C4532]" />
            <span>
              <strong className="text-[#1E1915]">Защита на адреса:</strong> На картата се показва
              само приблизителен кръг по квартал. Точният адрес на домашна маса или вила се вижда
              единствено след одобрение.
            </span>
          </div>
        </div>
      </section>

      {/* Split Map + Matching Gatherings List */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7]">
          <div className="flex items-center justify-between border-b border-[#DDD3C2] px-4 py-3 text-xs text-[#5D5348]">
            <span className="font-medium text-[#1E1915]">
              Карта на сбирките (OpenStreetMap)
            </span>
            <span className="font-mono tabular-nums">
              {withinRadius.length} в радиус {profile.radarRadiusKm} км
            </span>
          </div>
          <div
            ref={mapContainerRef}
            className="h-[360px] w-full sm:h-[460px]"
            aria-label="Карта на сбирките по квартали"
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold text-[#1E1915]">
              {profile.radarActive ? 'Препоръчани за теб тази вечер' : 'Най-близки сбирки'}
            </h2>
            <span className="font-mono text-xs text-[#5D5348] tabular-nums">
              {withinRadius.length} съвпадения
            </span>
          </div>

          {withinRadius.length === 0 ? (
            <div className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 text-center">
              <Compass className="mx-auto h-7 w-7 text-[#5D5348]" />
              <p className="mt-3 font-display text-lg font-semibold text-[#1E1915]">
                В радиус от {profile.radarRadiusKm} км цари подозрителна трезвеност.
              </p>
              <p className="mt-1 text-sm text-[#5D5348]">
                Увеличи радиуса или разгледай сбирките в съседните градове по-долу.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {withinRadius.map(({ event, distanceKm }) => {
                const confirmed = event.attendees.filter((a) => a.status === 'confirmed').length;
                const freeSeats = Math.max(0, event.maxAttendees - confirmed);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpenEvent(event.id)}
                    className="w-full rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-4 text-left hover:border-[#1C4532] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-bold text-[#1E1915]">
                        {event.title}
                      </h3>
                      <span className="font-mono text-xs font-semibold text-[#1C4532] whitespace-nowrap tabular-nums">
                        ~{distanceKm.toFixed(1)} км
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5D5348]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.city}, {event.neighborhood}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {event.dateLabel}, {event.time}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{event.venueType}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#DDD3C2]/70 pt-2.5 text-xs">
                      <span className="text-[#5D5348]">Организатор: {event.organizerName}</span>
                      <span className="font-mono font-semibold text-[#7C232B] tabular-nums">
                        {freeSeats === 1
                          ? 'Остана 1 стол'
                          : freeSeats === 0
                          ? 'Пълна маса'
                          : `${freeSeats} свободни места`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
