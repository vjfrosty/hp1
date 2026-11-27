"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Lock, Sparkles, Users } from "lucide-react";
import type { CreateEventInput, ProfileDTO, SeasonalThemeId, VenueType } from "@hp1/shared";
import { BULGARIAN_CITIES, SAMPLE_EVENT_TITLES, SEASONAL_THEMES, VENUE_TYPES, createEventSchema, sofiaDate } from "@hp1/shared";

import { useCreateEvent } from "@/hooks/api/events";
import { useGroups, useProfile } from "@/hooks/api/community";
import { useToast } from "@/components/ui/toast";
import { VENUE_COVERS } from "@/components/events/formatEvent";
import { useErrorToast } from "@/components/events/useErrorToast";
import { sofiaLocalToIso } from "./sofiaLocalToIso";

const MIN_SEATS = 2;
const MAX_SEATS = 24;

const inputClass = "mt-2 min-h-[44px] w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink focus:border-tavern focus:outline-none";
const smallInputClass = "mt-1.5 min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-tavern focus:outline-none";

/** "Свикай дружината" form (ported from legacy CreateEventView). Waits for the profile for city defaults. */
export function CreateEventView() {
  const profile = useProfile();
  useErrorToast(profile.error);
  if (profile.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Зареждане на формата">
        <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-[600px] animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    );
  }
  return <CreateEventForm profile={profile.data} />;
}

function defaultLocation(profile: ProfileDTO | undefined) {
  const city = BULGARIAN_CITIES.find((c) => c.name === profile?.city) ?? BULGARIAN_CITIES[0];
  const hood = city.neighborhoods.find((n) => n.name === profile?.neighborhood) ?? city.neighborhoods[0];
  return { city: city.name, neighborhood: hood?.name ?? "" };
}

function CreateEventForm({ profile }: { profile: ProfileDTO | undefined }) {
  const router = useRouter();
  const { show, showError } = useToast();
  const create = useCreateEvent();
  const groups = useGroups();
  const myGroups = useMemo(() => (groups.data ?? []).filter((g) => g.isMember), [groups.data]);

  const initial = defaultLocation(profile);
  const [title, setTitle] = useState("");
  const [dateISO, setDateISO] = useState(() => sofiaDate(new Date()));
  const [time, setTime] = useState("19:30");
  const [city, setCity] = useState(initial.city);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [venueType, setVenueType] = useState<VenueType>("механа");
  const [venueName, setVenueName] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [maxAttendees, setMaxAttendees] = useState(6);
  const [isPrivate, setIsPrivate] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [plannedFood, setPlannedFood] = useState("Шопска салата, овче сирене, скара и топъл хляб");
  const [description, setDescription] = useState("");
  const [nonAlcoholicFriendly, setNonAlcoholicFriendly] = useState(true);
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalThemeId>("classic");
  const [error, setError] = useState<string | null>(null);

  const neighborhoods = (BULGARIAN_CITIES.find((c) => c.name === city) ?? BULGARIAN_CITIES[0]).neighborhoods.map((n) => n.name);

  const handleCityChange = (next: string) => {
    setCity(next);
    const found = BULGARIAN_CITIES.find((c) => c.name === next);
    setNeighborhood(found?.neighborhoods[0]?.name ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Избери или напиши име на сбирката — например от готовите предложения.");
      return;
    }
    const startsAt = sofiaLocalToIso(dateISO, time);
    if (!startsAt) {
      setError("Невалидна дата и час");
      return;
    }
    const input: CreateEventInput = {
      title,
      description,
      startsAt,
      city,
      neighborhood,
      venueName,
      exactAddress,
      venueType,
      maxAttendees,
      isPrivate,
      manualApproval: isPrivate ? true : manualApproval,
      friendsOnly: Boolean(groupId) && friendsOnly,
      nonAlcoholicFriendly,
      plannedFood,
      seasonalTheme,
      groupId: groupId || null,
      coverImageUrl: VENUE_COVERS[venueType],
    };
    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Провери полетата във формата.");
      return;
    }
    setError(null);
    create.mutate(input, {
      onSuccess: (event) => {
        show("Дружината е свикана! Масата чака кворум.", "success");
        router.push(`/events/${event.id}`);
      },
      onError: showError,
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold text-burgundy">Нова сбирка за под минута</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink">Свикай дружината</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Задай час, квартал и брой столове. Чатът „Казанът къкри“, анкетите за мезе и списъкът с продукти се създават
          автоматично.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <div>
          <label htmlFor="ev-title" className="block text-sm font-semibold text-ink">
            1. Име на събитието
          </label>
          <input
            id="ev-title"
            type="text"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Напр. Петъчна комисия по важните въпроси"
            className={inputClass}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLE_EVENT_TITLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTitle(sample)}
                className="min-h-[36px] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-tavern hover:text-tavern"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-date" className="block text-sm font-semibold text-ink">
              2. Дата
            </label>
            <input id="ev-date" type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label htmlFor="ev-time" className="block text-sm font-semibold text-ink">
              Начален час
            </label>
            <input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} font-mono`} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-city" className="block text-sm font-semibold text-ink">
                3. Град
              </label>
              <select id="ev-city" value={city} onChange={(e) => handleCityChange(e.target.value)} className={inputClass}>
                {BULGARIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-hood" className="block text-sm font-semibold text-ink">
                Квартал / район
              </label>
              <select id="ev-hood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputClass}>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-ink" id="ev-venue-type-label">
              Тип място
            </span>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="ev-venue-type-label">
              {VENUE_TYPES.map((vt) => (
                <button
                  key={vt}
                  type="button"
                  aria-pressed={venueType === vt}
                  onClick={() => {
                    setVenueType(vt);
                    if (vt === "домашна маса" || vt === "двор") setManualApproval(true);
                  }}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                    venueType === vt ? "bg-tavern text-canvas" : "border border-line bg-canvas text-ink-muted hover:text-ink"
                  }`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-venue-name" className="block text-xs font-semibold text-ink-muted">
                Име на заведението или мястото (видимо публично)
              </label>
              <input
                id="ev-venue-name"
                type="text"
                value={venueName}
                maxLength={100}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Напр. Механа „Под липите“ или Дворът в Драгалевци"
                className={smallInputClass}
              />
            </div>
            <div>
              <label htmlFor="ev-exact-address" className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Lock className="h-3.5 w-3.5 text-burgundy" aria-hidden="true" />
                <span>Точен адрес (само за одобрени участници)</span>
              </label>
              <input
                id="ev-exact-address"
                type="text"
                value={exactAddress}
                maxLength={200}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder="Улица, вход, номер на маса..."
                className={smallInputClass}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <span className="block text-sm font-semibold text-ink" id="ev-max-label">
              4. Максимален брой участници
            </span>
            <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="ev-max-label">
              <button
                type="button"
                onClick={() => setMaxAttendees((n) => Math.max(MIN_SEATS, n - 1))}
                disabled={maxAttendees <= MIN_SEATS}
                aria-label="По-малко места"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-canvas text-lg font-bold text-ink hover:bg-surface-muted disabled:opacity-40"
              >
                −
              </button>
              <span className="w-20 text-center font-mono text-lg font-bold text-ink tabular-nums" aria-live="polite">
                {maxAttendees} души
              </span>
              <button
                type="button"
                onClick={() => setMaxAttendees((n) => Math.min(MAX_SEATS, n + 1))}
                disabled={maxAttendees >= MAX_SEATS}
                aria-label="Повече места"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-canvas text-lg font-bold text-ink hover:bg-surface-muted disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-semibold text-ink">5. Достъп и одобрение</span>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => {
                  setIsPrivate(e.target.checked);
                  if (e.target.checked) setManualApproval(true);
                }}
                className="mt-1 h-4 w-4 accent-tavern"
              />
              <span>Частна сбирка (само за приятели и поканени с линк)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={isPrivate || manualApproval}
                disabled={isPrivate}
                onChange={(e) => setManualApproval(e.target.checked)}
                className="mt-1 h-4 w-4 accent-tavern"
              />
              <span>Ръчно одобрение на нови участници (скрива точния адрес и чата)</span>
            </label>
          </div>
        </div>

        <div className="space-y-3 border-t border-line pt-5">
          <label htmlFor="ev-group" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-tavern" aria-hidden="true" />
            <span>Дружина (по избор)</span>
          </label>
          <select
            id="ev-group"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              if (!e.target.value) setFriendsOnly(false);
            }}
            disabled={groups.isPending}
            className={inputClass}
          >
            <option value="">{groups.isPending ? "Зареждане на дружините…" : "Без дружина"}</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.city}
              </option>
            ))}
          </select>
          {!groups.isPending && myGroups.length === 0 && (
            <p className="text-xs text-ink-muted">Още не членуваш в дружина. Можеш да се присъединиш от раздел „Дружини“.</p>
          )}
          <label className={`flex items-start gap-2.5 text-sm text-ink ${groupId ? "cursor-pointer" : "opacity-50"}`}>
            <input
              type="checkbox"
              checked={friendsOnly}
              disabled={!groupId}
              onChange={(e) => setFriendsOnly(e.target.checked)}
              className="mt-1 h-4 w-4 accent-tavern"
            />
            <span>Само за членовете на дружината (не се показва в лентата и на радара)</span>
          </label>
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <div>
            <label htmlFor="ev-food" className="block text-sm font-semibold text-ink">
              6. Каква храна и мезе се планират
            </label>
            <input
              id="ev-food"
              type="text"
              value={plannedFood}
              maxLength={300}
              onChange={(e) => setPlannedFood(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ev-desc" className="block text-sm font-semibold text-ink">
              7. Описание и дневен ред
            </label>
            <textarea
              id="ev-desc"
              rows={3}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Какво ще обсъждаме, има ли паркинг, в колко палим скарата..."
              className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink focus:border-tavern focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-theme" className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Sparkles className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                <span>Празнична / сезонна тема</span>
              </label>
              <select
                id="ev-theme"
                value={seasonalTheme}
                onChange={(e) => setSeasonalTheme(e.target.value as SeasonalThemeId)}
                className={smallInputClass}
              >
                {Object.values(SEASONAL_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.subtitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={nonAlcoholicFriendly}
                  onChange={(e) => setNonAlcoholicFriendly(e.target.checked)}
                  className="h-4 w-4 accent-tavern"
                />
                <span>Има безалкохолни напитки (подходящо за шофьори)</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => router.push("/feed")}
            className="min-h-[44px] rounded-xl border border-line bg-canvas px-5 py-3 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Отказ
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tavern px-6 py-3 text-sm font-semibold text-canvas hover:bg-tavern-hover disabled:opacity-60"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            <span>{create.isPending ? "Свикваме…" : "Свикай дружината"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
