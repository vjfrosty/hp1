import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Car,
  Lock,
  Map,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  GatheringEvent,
  RSVPStatus,
  SeasonalThemeId,
  UserProfile,
  VenueType,
} from '../types/app';
import {
  BULGARIAN_CITIES,
  DAILY_TOASTS,
  SECRET_AGENDA_TOPICS,
  SEASONAL_THEMES,
  VENUE_TYPES,
} from '../data/bulgaria';
import { IMAGES } from '../data/seedData';

interface FeedViewProps {
  events: GatheringEvent[];
  profile: UserProfile;
  onOpenEvent: (eventId: string) => void;
  onQuickRSVP: (eventId: string, status: RSVPStatus) => void;
  onGoCreate: () => void;
  onGoRadar: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  events,
  profile,
  onOpenEvent,
  onQuickRSVP,
  onGoCreate,
  onGoRadar,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('Всички');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('Всички');
  const [dateFilter, setDateFilter] = useState<'всички' | 'днес' | 'утре' | 'уикенда'>('всички');
  const [timeFilter, setTimeFilter] = useState<'всички' | 'ранен вечер' | 'вечер' | 'късно'>('всички');
  const [venueFilter, setVenueFilter] = useState<'всички' | VenueType>('всички');
  const [visibilityFilter, setVisibilityFilter] = useState<'всички' | 'публични' | 'приятели'>('всички');
  const [onlyWithSeats, setOnlyWithSeats] = useState<boolean>(false);
  const [themeFilter, setThemeFilter] = useState<'all' | SeasonalThemeId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const [toastIdx, setToastIdx] = useState<number>(0);
  const [agendaIdx, setAgendaIdx] = useState<number>(0);

  const neighborhoodsForCity = useMemo(() => {
    if (selectedCity === 'Всички') return [];
    const found = BULGARIAN_CITIES.find((c) => c.name === selectedCity);
    return found ? found.neighborhoods.map((n) => n.name) : [];
  }, [selectedCity]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (profile.blockedUserIds.includes(e.organizerId)) return false;
      if (selectedCity !== 'Всички' && e.city !== selectedCity) return false;
      if (selectedNeighborhood !== 'Всички' && e.neighborhood !== selectedNeighborhood) return false;
      if (dateFilter !== 'всички' && e.dateLabel !== dateFilter) return false;
      if (timeFilter !== 'всички' && e.timeBucket !== timeFilter) return false;
      if (venueFilter !== 'всички' && e.venueType !== venueFilter) return false;
      if (visibilityFilter === 'публични' && e.isPrivate) return false;
      if (visibilityFilter === 'приятели' && !e.friendsOnly && !e.isPrivate) return false;
      if (themeFilter !== 'all' && e.seasonalTheme !== themeFilter) return false;
      if (onlyWithSeats) {
        const confirmed = e.attendees.filter((a) => a.status === 'confirmed').length;
        if (confirmed >= e.maxAttendees || e.isCancelled) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${e.title} ${e.description} ${e.city} ${e.neighborhood} ${e.venueName} ${e.plannedFood}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    dateFilter,
    events,
    onlyWithSeats,
    profile.blockedUserIds,
    searchQuery,
    selectedCity,
    selectedNeighborhood,
    themeFilter,
    timeFilter,
    venueFilter,
    visibilityFilter,
  ]);

  const resetFilters = () => {
    setSelectedCity('Всички');
    setSelectedNeighborhood('Всички');
    setDateFilter('всички');
    setTimeFilter('всички');
    setVenueFilter('всички');
    setVisibilityFilter('всички');
    setOnlyWithSeats(false);
    setThemeFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8">
      {/* Editorial 2-Column Hero — Focal Anchor */}
      <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#7C232B]">
              Кой е навит? · Сбирки в България
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#1E1915] sm:text-4xl lg:text-[42px] text-balance">
              Не е важно колко е ракията. Важно е кой е на масата.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#5D5348]">
              Край на триседмичните групови чатове „Къде ще сядаме?“ и забравеното сирене. Намери
              компания наблизо или свикай дружината за по-малко от минута.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGoCreate}
              className="inline-flex items-center justify-center rounded-xl bg-[#1C4532] px-5 py-3 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] active:scale-[0.99] transition-all min-h-[44px] whitespace-nowrap"
            >
              Свикай дружината
            </button>
            <button
              type="button"
              onClick={onGoRadar}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 text-sm font-semibold text-[#1E1915] hover:bg-[#EFE8DC] transition-colors min-h-[44px] whitespace-nowrap"
            >
              <Map className="h-4 w-4 text-[#1C4532]" />
              <span>Отвори Ракиен радар</span>
            </button>
          </div>
        </div>

        {/* Hero Photography Frame */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-[#DDD3C2] bg-[#1C4532] min-h-[240px]">
          <img
            src={IMAGES.heroMehana}
            alt="Българска маса с шопска салата, мезе и чаши в уютна механа"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover lg:h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1915]/85 via-[#1E1915]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-[#F7F3EC]">
            <p className="font-mono text-xs text-[#E7D7B7] tabular-nums">
              {events.filter((e) => !e.isCancelled).length} активни маси ·{' '}
              {profile.city}, {profile.neighborhood}
            </p>
            <p className="mt-1 font-display text-lg font-semibold leading-snug">
              Шопската салата чака. Избери стол и потвърди навреме.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column Cultural Strip: Наздравица на деня & Тайният дневен ред */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#1E1915]">
              Наздравица на деня
            </h2>
            <button
              type="button"
              onClick={() => setToastIdx((i) => (i + 1) % DAILY_TOASTS.length)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C4532] hover:underline min-h-[36px] whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Друга наздравица</span>
            </button>
          </div>
          <blockquote className="mt-2.5 text-sm sm:text-[15px] italic text-[#1E1915] leading-relaxed">
            „{DAILY_TOASTS[toastIdx]}“
          </blockquote>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#1E1915]">
              Тайният дневен ред
            </h2>
            <button
              type="button"
              onClick={() => setAgendaIdx((i) => (i + 1) % SECRET_AGENDA_TOPICS.length)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C232B] hover:underline min-h-[36px] whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Нова тема</span>
            </button>
          </div>
          <p className="mt-2.5 text-sm sm:text-[15px] text-[#1E1915] leading-relaxed">
            {SECRET_AGENDA_TOPICS[agendaIdx]}
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section aria-label="Филтри за сбирки" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Date segmented tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#EFE8DC] p-1">
            {(['всички', 'днес', 'утре', 'уикенда'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateFilter(d)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  dateFilter === d
                    ? 'bg-[#FDFBF7] text-[#1E1915] shadow-xs'
                    : 'text-[#5D5348] hover:text-[#1E1915]'
                }`}
              >
                {d === 'всички' ? 'Всички дни' : d}
              </button>
            ))}
          </div>

          {/* Search + Toggle Advanced Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5D5348]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Търси квартал, мезе, механа..."
                className="w-full rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] py-2.5 pl-9 pr-3 text-sm text-[#1E1915] placeholder:text-[#5D5348]/70 focus:border-[#1C4532] focus:outline-none min-h-[44px]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap ${
                showAdvancedFilters
                  ? 'border-[#1C4532] bg-[#1C4532] text-[#F7F3EC]'
                  : 'border-[#DDD3C2] bg-[#FDFBF7] text-[#1E1915] hover:bg-[#EFE8DC]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Филтри</span>
            </button>
          </div>
        </div>

        {/* Expanded Filter Controls */}
        {showAdvancedFilters && (
          <div className="grid gap-4 rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-city" className="block text-xs font-semibold text-[#5D5348]">
                Град
              </label>
              <select
                id="f-city"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedNeighborhood('Всички');
                }}
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] min-h-[40px]"
              >
                <option value="Всички">Цяла България</option>
                {BULGARIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-hood" className="block text-xs font-semibold text-[#5D5348]">
                Квартал
              </label>
              <select
                id="f-hood"
                value={selectedNeighborhood}
                disabled={selectedCity === 'Всички'}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] disabled:opacity-50 min-h-[40px]"
              >
                <option value="Всички">Всички квартали</option>
                {neighborhoodsForCity.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-venue" className="block text-xs font-semibold text-[#5D5348]">
                Тип място
              </label>
              <select
                id="f-venue"
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value as 'всички' | VenueType)}
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] min-h-[40px]"
              >
                <option value="всички">Всички места</option>
                {VENUE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-time" className="block text-xs font-semibold text-[#5D5348]">
                Часов диапазон
              </label>
              <select
                id="f-time"
                value={timeFilter}
                onChange={(e) =>
                  setTimeFilter(e.target.value as 'всички' | 'ранен вечер' | 'вечер' | 'късно')
                }
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] min-h-[40px]"
              >
                <option value="всички">По всяко време</option>
                <option value="ранен вечер">Ранен вечер (преди 18:00)</option>
                <option value="вечер">Вечер (18:00 – 20:59)</option>
                <option value="късно">Късно (след 21:00)</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-vis" className="block text-xs font-semibold text-[#5D5348]">
                Достъпност
              </label>
              <select
                id="f-vis"
                value={visibilityFilter}
                onChange={(e) =>
                  setVisibilityFilter(e.target.value as 'всички' | 'публични' | 'приятели')
                }
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] min-h-[40px]"
              >
                <option value="всички">Публични и за приятели</option>
                <option value="публични">Само публични сбирки</option>
                <option value="приятели">Само приятели / частни</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-theme" className="block text-xs font-semibold text-[#5D5348]">
                Сезонна тема
              </label>
              <select
                id="f-theme"
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value as 'all' | SeasonalThemeId)}
                className="mt-1.5 w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm text-[#1E1915] min-h-[40px]"
              >
                <option value="all">Всички теми</option>
                {Object.values(SEASONAL_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 text-sm text-[#1E1915] cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={onlyWithSeats}
                  onChange={(e) => setOnlyWithSeats(e.target.checked)}
                  className="h-4 w-4 accent-[#1C4532]"
                />
                <span>Само със свободни места</span>
              </label>
            </div>

            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#7C232B] hover:underline min-h-[40px]"
              >
                Изчисти филтрите
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Gatherings List */}
      <section aria-label="Налични сбирки">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-[#1E1915]">
            Налични сбирки
          </h2>
          <span className="font-mono text-xs text-[#5D5348] tabular-nums">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'маса' : 'маси'}
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] px-6 py-12 text-center">
            <h3 className="font-display text-2xl font-bold text-[#1E1915]">
              В района цари подозрителна трезвеност. Свикай дружината!
            </h3>
            <p className="mt-2 text-sm text-[#5D5348]">
              Няма сбирки по зададените филтри. Изчисти търсенето или отвори нова маса.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onGoCreate}
                className="rounded-xl bg-[#1C4532] px-5 py-2.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
              >
                Свикай дружината
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-2.5 text-sm font-semibold text-[#1E1915] hover:bg-[#EFE8DC] min-h-[44px]"
              >
                Покажи всички сбирки
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredEvents.map((evt) => {
              const confirmed = evt.attendees.filter((a) => a.status === 'confirmed').length;
              const freeSeats = Math.max(0, evt.maxAttendees - confirmed);
              const myEntry = evt.attendees.find((a) => a.userId === profile.id);
              const hasQuorum = confirmed >= 3 && !evt.isCancelled;
              const missingSalad = evt.contributions.some(
                (c) => c.category === 'салата' && c.status === 'free'
              );

              return (
                <article
                  key={evt.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] transition-colors hover:border-[#1C4532]/50"
                >
                  {/* Card Cover Image */}
                  <button
                    type="button"
                    onClick={() => onOpenEvent(evt.id)}
                    className="relative aspect-[16/9] w-full overflow-hidden bg-[#EFE8DC] text-left focus-visible:outline-2 focus-visible:outline-[#1C4532]"
                  >
                    <img
                      src={evt.coverImage}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E1915]/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-[#F7F3EC]">
                      <span className="text-xs font-medium">
                        {evt.venueName} · {evt.venueType}
                      </span>
                      {evt.isCancelled ? (
                        <span className="tavern-stamp bg-[#FDFBF7]/90 text-[#7C232B]">
                          ОТМЕНЕНО
                        </span>
                      ) : hasQuorum ? (
                        <span className="tavern-stamp bg-[#FDFBF7]/90 text-[#1C4532]">
                          КВОРУМ
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {/* Card Body — Zero-Pill Metadata Discipline */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5D5348]">
                      <span className="inline-flex items-center gap-1 font-medium text-[#1E1915]">
                        <MapPin className="h-3.5 w-3.5 text-[#7C232B]" />
                        {evt.city}, {evt.neighborhood}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        {evt.dateLabel}, {evt.time}
                      </span>
                      {evt.isPrivate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[#7C232B]">
                            <Lock className="h-3 w-3" />
                            Частна
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenEvent(evt.id)}
                      className="mt-2 text-left"
                    >
                      <h3 className="font-display text-xl font-bold text-[#1E1915] hover:text-[#1C4532] transition-colors leading-snug">
                        {evt.title}
                      </h3>
                    </button>

                    <p className="mt-2 text-sm text-[#5D5348] line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    {/* Subtle alerts & status line */}
                    <div className="mt-4 space-y-1.5 border-t border-[#DDD3C2]/70 pt-3 text-xs">
                      <div className="flex items-center justify-between text-[#1E1915]">
                        <span className="inline-flex items-center gap-1.5 text-[#5D5348]">
                          <Users className="h-3.5 w-3.5" />
                          Организатор: <strong className="text-[#1E1915]">{evt.organizerName}</strong>
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {confirmed}/{evt.maxAttendees} места
                        </span>
                      </div>

                      {!evt.isCancelled && freeSeats === 1 && (
                        <p className="font-semibold text-[#7C232B]">
                          Остана един стол. Историята чака.
                        </p>
                      )}

                      {!evt.isCancelled && missingSalad && (
                        <p className="text-[#8A4F1E]">
                          Краставиците за салатата още нямат отговорник.
                        </p>
                      )}

                      {evt.nonAlcoholicFriendly && (
                        <p className="inline-flex items-center gap-1.5 text-[#1C4532]">
                          <Car className="h-3.5 w-3.5" />
                          <span>Безалкохолни напитки и шофьори — добре дошли</span>
                        </p>
                      )}
                    </div>

                    {/* Action Row */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 pt-1">
                      {!evt.isCancelled && (
                        <>
                          <button
                            type="button"
                            onClick={() => onQuickRSVP(evt.id, 'confirmed')}
                            disabled={freeSeats === 0 && myEntry?.status !== 'confirmed'}
                            className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                              myEntry?.status === 'confirmed'
                                ? 'bg-[#1C4532] text-[#F7F3EC]'
                                : myEntry?.status === 'pending_approval'
                                ? 'bg-[#A6762C] text-[#FDFBF7]'
                                : 'bg-[#1C4532] text-[#F7F3EC] hover:bg-[#153526] disabled:opacity-40'
                            }`}
                          >
                            {myEntry?.status === 'confirmed'
                              ? 'Идваш ✓'
                              : myEntry?.status === 'pending_approval'
                              ? 'Чака одобрение'
                              : evt.manualApproval
                              ? 'Искам да дойда'
                              : 'Идвам!'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onQuickRSVP(evt.id, 'maybe')}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                              myEntry?.status === 'maybe'
                                ? 'border-[#1E1915] bg-[#EFE8DC] text-[#1E1915]'
                                : 'border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#1E1915]'
                            }`}
                          >
                            Ще видим
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenEvent(evt.id)}
                        className="rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-semibold text-[#1E1915] hover:bg-[#EFE8DC] transition-colors min-h-[44px] whitespace-nowrap"
                      >
                        Детайли и чат
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
