import React, { useMemo, useState } from 'react';
import { CalendarPlus, Lock, Sparkles } from 'lucide-react';
import { SeasonalThemeId, UserProfile, VenueType } from '../types/app';
import {
  BULGARIAN_CITIES,
  SAMPLE_EVENT_TITLES,
  SEASONAL_THEMES,
  VENUE_TYPES,
} from '../data/bulgaria';
import { CreateEventInput } from '../store/useAppStore';

interface CreateEventViewProps {
  profile: UserProfile;
  onCreate: (input: CreateEventInput) => void;
  onCancel: () => void;
}

export const CreateEventView: React.FC<CreateEventViewProps> = ({
  profile,
  onCreate,
  onCancel,
}) => {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState<string>('');
  const [dateISO, setDateISO] = useState<string>(todayISO);
  const [time, setTime] = useState<string>('19:30');
  const [city, setCity] = useState<string>(profile.city || 'София');
  const [neighborhood, setNeighborhood] = useState<string>(profile.neighborhood || 'Лозенец');
  const [venueType, setVenueType] = useState<VenueType>('механа');
  const [venueName, setVenueName] = useState<string>('');
  const [exactAddress, setExactAddress] = useState<string>('');
  const [maxAttendees, setMaxAttendees] = useState<number>(6);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [manualApproval, setManualApproval] = useState<boolean>(false);
  const [plannedFood, setPlannedFood] = useState<string>('Шопска салата, овче сирене, скара и топъл хляб');
  const [description, setDescription] = useState<string>('');
  const [nonAlcoholicFriendly, setNonAlcoholicFriendly] = useState<boolean>(true);
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalThemeId>('classic');
  const [error, setError] = useState<string | null>(null);

  const neighborhoods = useMemo(() => {
    const found = BULGARIAN_CITIES.find((c) => c.name === city) || BULGARIAN_CITIES[0];
    return found.neighborhoods.map((n) => n.name);
  }, [city]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const found = BULGARIAN_CITIES.find((c) => c.name === newCity);
    if (found && found.neighborhoods.length > 0) {
      setNeighborhood(found.neighborhoods[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Избери или напиши име на сбирката — например от готовите предложения.');
      return;
    }
    setError(null);
    onCreate({
      title,
      dateISO,
      time,
      city,
      neighborhood,
      venueName,
      exactAddress,
      venueType,
      maxAttendees,
      isPrivate,
      manualApproval: isPrivate ? true : manualApproval,
      plannedFood,
      description,
      nonAlcoholicFriendly,
      seasonalTheme,
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold text-[#7C232B]">Нова сбирка за под минута</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1E1915]">
          Свикай дружината
        </h1>
        <p className="mt-1.5 text-sm text-[#5D5348]">
          Задай час, квартал и брой столове. Чатът „Казанът къкри“, анкетите за мезе и списъкът с
          продукти се създават автоматично.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 sm:p-8"
      >
        {/* 1. Title + quick presets */}
        <div>
          <label htmlFor="ev-title" className="block text-sm font-semibold text-[#1E1915]">
            1. Име на събитието
          </label>
          <input
            id="ev-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Напр. Петъчна комисия по важните въпроси"
            className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm text-[#1E1915] focus:border-[#1C4532] focus:outline-none min-h-[44px]"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLE_EVENT_TITLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTitle(sample)}
                className="rounded-lg border border-[#DDD3C2] bg-[#FDFBF7] px-2.5 py-1.5 text-xs text-[#5D5348] hover:border-[#1C4532] hover:text-[#1C4532] transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Date & Time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-date" className="block text-sm font-semibold text-[#1E1915]">
              2. Дата
            </label>
            <input
              id="ev-date"
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm font-mono text-[#1E1915] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="ev-time" className="block text-sm font-semibold text-[#1E1915]">
              Начален час
            </label>
            <input
              id="ev-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm font-mono text-[#1E1915] min-h-[44px]"
            />
          </div>
        </div>

        {/* 3. City, Neighborhood, Venue Type */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-city" className="block text-sm font-semibold text-[#1E1915]">
                3. Град
              </label>
              <select
                id="ev-city"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm text-[#1E1915] min-h-[44px]"
              >
                {BULGARIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-hood" className="block text-sm font-semibold text-[#1E1915]">
                Квартал / район
              </label>
              <select
                id="ev-hood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm text-[#1E1915] min-h-[44px]"
              >
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#1E1915]">Тип място</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {VENUE_TYPES.map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => {
                    setVenueType(vt);
                    if (vt === 'домашна маса' || vt === 'двор') {
                      setManualApproval(true);
                    }
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-colors min-h-[40px] ${
                    venueType === vt
                      ? 'bg-[#1C4532] text-[#F7F3EC]'
                      : 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#1E1915]'
                  }`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-venue-name" className="block text-xs font-semibold text-[#5D5348]">
                Име на заведението или мястото (видимо публично)
              </label>
              <input
                id="ev-venue-name"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Напр. Механа „Под липите“ или Дворът в Драгалевци"
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm text-[#1E1915] min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="ev-exact-address"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#5D5348]"
              >
                <Lock className="h-3.5 w-3.5 text-[#7C232B]" />
                <span>Точен адрес (само за одобрени участници)</span>
              </label>
              <input
                id="ev-exact-address"
                type="text"
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder="Улица, вход, номер на маса..."
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm text-[#1E1915] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* 4 & 5. Capacity + Privacy & Approval */}
        <div className="grid gap-4 sm:grid-cols-2 border-t border-[#DDD3C2] pt-5">
          <div>
            <label htmlFor="ev-max" className="block text-sm font-semibold text-[#1E1915]">
              4. Максимален брой участници
            </label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMaxAttendees((n) => Math.max(2, n - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] text-lg font-bold text-[#1E1915] hover:bg-[#EFE8DC]"
              >
                −
              </button>
              <span className="font-mono text-lg font-bold text-[#1E1915] tabular-nums w-16 text-center">
                {maxAttendees} души
              </span>
              <button
                type="button"
                onClick={() => setMaxAttendees((n) => Math.min(24, n + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] text-lg font-bold text-[#1E1915] hover:bg-[#EFE8DC]"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-semibold text-[#1E1915]">
              5. Достъп и одобрение
            </span>
            <label className="flex items-start gap-2.5 text-sm text-[#1E1915] cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => {
                  setIsPrivate(e.target.checked);
                  if (e.target.checked) setManualApproval(true);
                }}
                className="mt-1 h-4 w-4 accent-[#1C4532]"
              />
              <span>Частна сбирка (само за приятели и поканени с линк)</span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-[#1E1915] cursor-pointer">
              <input
                type="checkbox"
                checked={manualApproval}
                onChange={(e) => setManualApproval(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#1C4532]"
              />
              <span>Ръчно одобрение на нови участници (скрива точния адрес и чата)</span>
            </label>
          </div>
        </div>

        {/* 6 & 7. Food, Theme, Description */}
        <div className="space-y-4 border-t border-[#DDD3C2] pt-5">
          <div>
            <label htmlFor="ev-food" className="block text-sm font-semibold text-[#1E1915]">
              6. Каква храна и мезе се планират
            </label>
            <input
              id="ev-food"
              type="text"
              value={plannedFood}
              onChange={(e) => setPlannedFood(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm text-[#1E1915] min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="ev-desc" className="block text-sm font-semibold text-[#1E1915]">
              7. Описание и дневен ред
            </label>
            <textarea
              id="ev-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Какво ще обсъждаме, има ли паркинг, в колко палим скарата..."
              className="mt-2 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm text-[#1E1915]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-theme" className="flex items-center gap-1.5 text-xs font-semibold text-[#5D5348]">
                <Sparkles className="h-3.5 w-3.5 text-[#A6762C]" />
                <span>Празнична / сезонна тема</span>
              </label>
              <select
                id="ev-theme"
                value={seasonalTheme}
                onChange={(e) => setSeasonalTheme(e.target.value as SeasonalThemeId)}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm text-[#1E1915] min-h-[44px]"
              >
                {Object.values(SEASONAL_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.subtitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 text-sm text-[#1E1915] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={nonAlcoholicFriendly}
                  onChange={(e) => setNonAlcoholicFriendly(e.target.checked)}
                  className="h-4 w-4 accent-[#1C4532]"
                />
                <span>Има безалкохолни напитки (подходящо за шофьори)</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-[#7C232B]/10 px-4 py-3 text-sm font-medium text-[#7C232B]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#DDD3C2] pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-5 py-3 text-sm font-semibold text-[#5D5348] hover:text-[#1E1915] min-h-[44px]"
          >
            Отказ
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C4532] px-6 py-3 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Свикай дружината</span>
          </button>
        </div>
      </form>
    </div>
  );
};
