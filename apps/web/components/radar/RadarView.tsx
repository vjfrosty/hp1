"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Compass, MapPin, Radio, ShieldCheck } from "lucide-react";
import type { ProfileDTO, ProfilePatchInput } from "@hp1/shared";
import { districtPoint } from "@hp1/shared";

import { useEvents } from "@/hooks/api/events";
import { useProfile, useUpdateProfile } from "@/hooks/api/community";
import { useToast } from "@/components/ui/toast";
import { freeSeats, whenLabel } from "@/components/events/formatEvent";
import { useErrorToast } from "@/components/events/useErrorToast";
import { approxDistanceKm } from "./distance";
import type { RadarItem } from "./RadarMap";

const RadarMap = dynamic(() => import("./RadarMap"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse bg-surface-muted sm:h-[460px]" aria-hidden="true" />,
});

const MIN_RADIUS = 2;
const MAX_RADIUS = 25;

/** "Ракиен радар" (ported from legacy RadarMapView). Radar settings persist on the profile. */
export function RadarView() {
  const profile = useProfile();
  useErrorToast(profile.error);
  if (profile.isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Зареждане на радара">
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-[360px] animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    );
  }
  return <RadarBody profile={profile.data} />;
}

function RadarBody({ profile }: { profile: ProfileDTO | undefined }) {
  const router = useRouter();
  const { show, showError } = useToast();
  const update = useUpdateProfile();

  const city = profile?.city ?? "София";
  const neighborhood = profile?.neighborhood ?? "";
  const radarActive = profile?.radarActive ?? false;
  const savedRadius = profile?.radarRadiusKm ?? 5;

  const [radiusDraft, setRadiusDraft] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState<string | null>(null);
  const radius = radiusDraft ?? Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, savedRadius));
  const message = messageDraft ?? profile?.radarMessage ?? "";
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  const events = useEvents({ city, scope: "radar" });
  useErrorToast(events.error);

  const center = useMemo<[number, number]>(() => {
    const p = districtPoint(city, neighborhood) ?? districtPoint("София");
    return p ? [p.lat, p.lng] : [42.6977, 23.3219];
  }, [city, neighborhood]);

  const items = useMemo<RadarItem[]>(
    () =>
      (events.data ?? [])
        .filter((e) => !e.isCancelled)
        .map((event) => ({ event, distanceKm: approxDistanceKm(center, event.coords) }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [events.data, center],
  );
  const withinRadius = useMemo(() => items.filter((i) => i.distanceKm <= radius), [items, radius]);

  const openEvent = useCallback((id: string) => router.push(`/events/${id}`), [router]);

  const save = (patch: ProfilePatchInput, onDone?: () => void) =>
    update.mutate(patch, { onError: showError, onSettled: onDone });

  const toggleRadar = () =>
    update.mutate(
      { radarActive: !radarActive },
      {
        onSuccess: (p) =>
          show(p.radarActive ? "Радарът е включен. Дружината ще те види тази вечер." : "Радарът е изключен.", "success"),
        onError: showError,
      },
    );

  const changeRadius = (value: number) => {
    setRadiusDraft(value);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => save({ radarRadiusKm: value }, () => setRadiusDraft((d) => (d === value ? null : d))), 500);
  };

  const saveMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    save({ radarMessage: trimmed ? trimmed : null }, () => setMessageDraft(null));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-balance font-display text-2xl font-bold text-ink sm:text-3xl">Ракиен радар — компания в твоя район</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Показваме сбирки по квартал и радиус. Приложението никога не споделя точната ти локация в реално време.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={toggleRadar}
              disabled={update.isPending}
              aria-pressed={radarActive}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold text-canvas transition-colors disabled:opacity-60 ${
                radarActive ? "bg-burgundy hover:bg-burgundy-hover" : "bg-tavern hover:bg-tavern-hover"
              }`}
            >
              <Radio className="h-4 w-4" aria-hidden="true" />
              <span>{radarActive ? "Изключи „Свободен съм тази вечер“" : "Свободен съм за компания тази вечер"}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-2 md:items-center">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="radar-radius" className="font-medium text-ink">
                Радиус около {neighborhood ? `кв. ${neighborhood}, ` : ""}
                {city}
              </label>
              <span className="font-mono font-semibold text-tavern tabular-nums">{radius} км</span>
            </div>
            <input
              id="radar-radius"
              type="range"
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={1}
              value={radius}
              onChange={(e) => changeRadius(Number(e.target.value))}
              className="mt-2.5 min-h-[44px] w-full cursor-pointer accent-tavern"
            />
            <div className="mt-1 flex justify-between font-mono text-xs text-ink-muted tabular-nums">
              <span>2 км (квартала)</span>
              <span>12 км (града)</span>
              <span>25 км (околности)</span>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-muted/70 p-3.5 text-xs text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tavern" aria-hidden="true" />
            <span>
              <strong className="text-ink">Защита на адреса:</strong> На картата се показва само приблизителен кръг по
              квартал. Точният адрес на домашна маса или вила се вижда единствено след одобрение.
            </span>
          </div>
        </div>

        {radarActive && (
          <form onSubmit={saveMessage} className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="radar-message" className="block text-xs font-semibold text-ink-muted">
                Кратко съобщение към дружината (по избор)
              </label>
              <input
                id="radar-message"
                type="text"
                maxLength={140}
                value={message}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="Напр. Свободен съм след 20:00, нося луканка."
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-tavern focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={update.isPending || messageDraft === null}
              className="min-h-[44px] whitespace-nowrap rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
            >
              Запази
            </button>
          </form>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs text-ink-muted">
            <span className="font-medium text-ink">Карта на сбирките</span>
            <span className="font-mono tabular-nums">
              {withinRadius.length} в радиус {radius} км
            </span>
          </div>
          <RadarMap
            center={center}
            neighborhood={neighborhood || city}
            radiusKm={radius}
            radarActive={radarActive}
            items={items}
            onOpenEvent={openEvent}
          />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold text-ink">
              {radarActive ? "Препоръчани за теб тази вечер" : "Най-близки сбирки"}
            </h2>
            {!events.isPending && (
              <span className="font-mono text-xs text-ink-muted tabular-nums">{withinRadius.length} съвпадения</span>
            )}
          </div>

          {events.isPending ? (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
              ))}
            </div>
          ) : withinRadius.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-6 text-center">
              <Compass className="mx-auto h-7 w-7 text-ink-muted" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-semibold text-ink">
                В радиус от {radius} км цари подозрителна трезвеност.
              </p>
              <p className="mt-1 text-sm text-ink-muted">Увеличи радиуса или разгледай всички сбирки в лентата.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {withinRadius.map(({ event, distanceKm }) => {
                const seats = freeSeats(event);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => openEvent(event.id)}
                      className="w-full rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-tavern"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-base font-bold text-ink">{event.title}</h3>
                        <span className="whitespace-nowrap font-mono text-xs font-semibold text-tavern tabular-nums">
                          ~{distanceKm.toFixed(1)} км
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {event.city}, {event.neighborhood}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{whenLabel(event.startsAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{event.venueType}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5 text-xs">
                        <span className="text-ink-muted">Организатор: {event.organizer.nickname}</span>
                        <span className="font-mono font-semibold text-burgundy tabular-nums">
                          {seats === 1 ? "Остана 1 стол" : seats === 0 ? "Пълна маса" : `${seats} свободни места`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
