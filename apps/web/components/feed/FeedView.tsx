"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Map as MapIcon, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import type { ProfileDTO, SeasonalThemeId, VenueType } from "@hp1/shared";
import { BULGARIAN_CITIES, DAILY_TOASTS, SEASONAL_THEMES, SECRET_AGENDA_TOPICS, VENUE_TYPES } from "@hp1/shared";

import { useEvents } from "@/hooks/api/events";
import { useProfile } from "@/hooks/api/community";
import { EventCard, EventCardSkeleton } from "@/components/events/EventCard";
import { HERO_IMAGE } from "@/components/events/formatEvent";
import { useErrorToast } from "@/components/events/useErrorToast";
import { DEFAULT_FILTERS, filterEvents, type DateFilter, type FeedFilters, type TimeFilter, type VisibilityFilter } from "./filters";

const ALL_CITIES = "Всички";
const selectClass = "mt-1.5 w-full min-h-[44px] rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink disabled:opacity-50";
const labelClass = "block text-xs font-semibold text-ink-muted";

/** Feed of gatherings (ported from legacy FeedView). Waits for the profile so the city defaults to it. */
export function FeedView() {
  const profile = useProfile();
  useErrorToast(profile.error);
  if (profile.isPending) return <FeedSkeleton />;
  return <FeedBody profile={profile.data} />;
}

function FeedBody({ profile }: { profile: ProfileDTO | undefined }) {
  const [city, setCity] = useState<string>(profile?.city ?? "София");
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toastIdx, setToastIdx] = useState(0);
  const [agendaIdx, setAgendaIdx] = useState(0);

  const events = useEvents({ city: city === ALL_CITIES ? undefined : city, scope: "feed" });
  useErrorToast(events.error);

  const all = useMemo(() => events.data ?? [], [events.data]);
  const filtered = useMemo(() => filterEvents(all, filters), [all, filters]);
  const activeCount = all.filter((e) => !e.isCancelled).length;
  const neighborhoods = BULGARIAN_CITIES.find((c) => c.name === city)?.neighborhoods.map((n) => n.name) ?? [];

  const set = <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCity(ALL_CITIES);
  };

  const place = [profile?.city ?? city, profile?.neighborhood].filter(Boolean).join(", ");

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 sm:p-8 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold tracking-wide text-burgundy">Кой е навит? · Сбирки в България</p>
            <h1 className="mt-3 text-balance font-display text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-[42px]">
              Не е важно колко е ракията. Важно е кой е на масата.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
              Край на триседмичните групови чатове „Къде ще сядаме?“ и забравеното сирене. Намери компания наблизо или
              свикай дружината за по-малко от минута.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/events/new"
              className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-xl bg-tavern px-5 py-3 text-sm font-semibold text-canvas transition-all hover:bg-tavern-hover active:scale-[0.99]"
            >
              Свикай дружината
            </Link>
            <Link
              href="/radar"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
            >
              <MapIcon className="h-4 w-4 text-tavern" aria-hidden="true" />
              <span>Отвори Ракиен радар</span>
            </Link>
          </div>
        </div>

        <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-line bg-tavern lg:col-span-5">
          <Image
            src={HERO_IMAGE}
            alt="Българска маса с шопска салата, мезе и чаши в уютна механа"
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-canvas">
            <p className="font-mono text-xs text-[#E7D7B7] tabular-nums">
              {events.isPending ? "…" : activeCount} активни маси{place ? ` · ${place}` : ""}
            </p>
            <p className="mt-1 font-display text-lg font-semibold leading-snug">
              Шопската салата чака. Избери стол и потвърди навреме.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-ink">Наздравица на деня</h2>
            <button
              type="button"
              onClick={() => setToastIdx((i) => (i + 1) % DAILY_TOASTS.length)}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-tavern hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Друга наздравица</span>
            </button>
          </div>
          <blockquote className="mt-2.5 text-sm italic leading-relaxed text-ink sm:text-[15px]">„{DAILY_TOASTS[toastIdx]}“</blockquote>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-ink">Тайният дневен ред</h2>
            <button
              type="button"
              onClick={() => setAgendaIdx((i) => (i + 1) % SECRET_AGENDA_TOPICS.length)}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-burgundy hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Нова тема</span>
            </button>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink sm:text-[15px]">{SECRET_AGENDA_TOPICS[agendaIdx]}</p>
        </div>
      </section>

      <section aria-label="Филтри за сбирки" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1" role="group" aria-label="Ден">
            {(["всички", "днес", "утре", "уикенда"] as DateFilter[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("date", d)}
                aria-pressed={filters.date === d}
                className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${
                  filters.date === d ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                {d === "всички" ? "Всички дни" : d}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Търси квартал, мезе, механа..."
                aria-label="Търсене в сбирките"
                className="min-h-[44px] w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-tavern focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              aria-expanded={showAdvanced}
              aria-controls="feed-filters"
              className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                showAdvanced ? "border-tavern bg-tavern text-canvas" : "border-line bg-surface text-ink hover:bg-surface-muted"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Филтри</span>
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div id="feed-filters" className="grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-city" className={labelClass}>Град</label>
              <select
                id="f-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  set("neighborhood", "Всички");
                }}
                className={selectClass}
              >
                <option value={ALL_CITIES}>Цяла България</option>
                {BULGARIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-hood" className={labelClass}>Квартал</label>
              <select
                id="f-hood"
                value={filters.neighborhood}
                disabled={city === ALL_CITIES}
                onChange={(e) => set("neighborhood", e.target.value)}
                className={selectClass}
              >
                <option value="Всички">Всички квартали</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-venue" className={labelClass}>Тип място</label>
              <select
                id="f-venue"
                value={filters.venue}
                onChange={(e) => set("venue", e.target.value as "всички" | VenueType)}
                className={selectClass}
              >
                <option value="всички">Всички места</option>
                {VENUE_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-time" className={labelClass}>Часов диапазон</label>
              <select id="f-time" value={filters.time} onChange={(e) => set("time", e.target.value as TimeFilter)} className={selectClass}>
                <option value="всички">По всяко време</option>
                <option value="през деня">През деня (04:00 – 16:59)</option>
                <option value="ранен вечер">Ранна вечер (17:00 – 18:59)</option>
                <option value="вечер">Вечер (19:00 – 21:59)</option>
                <option value="късно">Късно (след 22:00)</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-vis" className={labelClass}>Достъпност</label>
              <select
                id="f-vis"
                value={filters.visibility}
                onChange={(e) => set("visibility", e.target.value as VisibilityFilter)}
                className={selectClass}
              >
                <option value="всички">Публични и за приятели</option>
                <option value="публични">Само публични сбирки</option>
                <option value="приятели">Само приятели / частни</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-theme" className={labelClass}>Сезонна тема</label>
              <select
                id="f-theme"
                value={filters.theme}
                onChange={(e) => set("theme", e.target.value as "all" | SeasonalThemeId)}
                className={selectClass}
              >
                <option value="all">Всички теми</option>
                {Object.values(SEASONAL_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={filters.onlyWithSeats}
                  onChange={(e) => set("onlyWithSeats", e.target.checked)}
                  className="h-4 w-4 accent-tavern"
                />
                <span>Само със свободни места</span>
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={filters.onlyNonAlcoholic}
                  onChange={(e) => set("onlyNonAlcoholic", e.target.checked)}
                  className="h-4 w-4 accent-tavern"
                />
                <span>С безалкохолни напитки</span>
              </label>
            </div>
            <div className="flex items-end justify-end">
              <button type="button" onClick={resetFilters} className="min-h-[44px] text-xs font-semibold text-burgundy hover:underline">
                Изчисти филтрите
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Налични сбирки" aria-busy={events.isPending}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-ink">Налични сбирки</h2>
          {!events.isPending && (
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {filtered.length} {filtered.length === 1 ? "маса" : "маси"}
              {city !== ALL_CITIES ? ` · ${city}` : ""}
            </span>
          )}
        </div>

        {events.isPending ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.isError && all.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center">
            <h3 className="font-display text-xl font-bold text-ink">Масата не се зареди.</h3>
            <p className="mt-2 text-sm text-ink-muted">Провери връзката и опитай пак.</p>
            <button
              type="button"
              onClick={() => void events.refetch()}
              className="mt-5 min-h-[44px] rounded-xl bg-tavern px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover"
            >
              Опитай отново
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center">
            <h3 className="font-display text-2xl font-bold text-ink">В района цари подозрителна трезвеност. Свикай дружината!</h3>
            <p className="mt-2 text-sm text-ink-muted">Няма сбирки по зададените филтри. Изчисти търсенето или отвори нова маса.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/events/new"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-tavern px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover"
              >
                Свикай дружината
              </Link>
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Покажи всички сбирки
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Зареждане на сбирките">
      <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
