import React, { useState } from 'react';
import {
  BookOpen,
  CalendarCheck,
  Check,
  Heart,
  Plus,
  Quote,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  ChronicleEntry,
  GroupCouncil,
  TableWisdom,
  UserProfile,
} from '../types/app';
import { BULGARIAN_CITIES } from '../data/bulgaria';

interface GroupsViewProps {
  initialMode: 'groups' | 'chronicle';
  groups: GroupCouncil[];
  chronicles: ChronicleEntry[];
  wisdom: TableWisdom[];
  profile: UserProfile;
  onToggleGroupMembership: (groupId: string) => void;
  onCreateGroup: (name: string, motto: string, city: string, regularSchedule: string) => void;
  onVoteQuorumSlot: (groupId: string, slotId: string) => void;
  onAddChronicle: (entry: {
    eventTitle: string;
    groupName: string;
    officialDecision: string;
    story: string;
    visibility: ChronicleEntry['visibility'];
    consentConfirmed: boolean;
  }) => void;
  onToggleChronicleLike: (chronicleId: string) => void;
  onAddWisdom: (
    quote: string,
    context: string,
    sharedToGroup: boolean,
    consentGiven: boolean
  ) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  initialMode,
  groups,
  chronicles,
  wisdom,
  profile,
  onToggleGroupMembership,
  onCreateGroup,
  onVoteQuorumSlot,
  onAddChronicle,
  onToggleChronicleLike,
  onAddWisdom,
}) => {
  const [mode, setMode] = useState<'groups' | 'chronicle'>(initialMode);

  // Sync mode when parent navigation switches between Дружини and Летопис
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Create group state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [gName, setGName] = useState('');
  const [gMotto, setGMotto] = useState('');
  const [gCity, setGCity] = useState(profile.city);
  const [gSchedule, setGSchedule] = useState('Всеки петък от 19:30');

  // Create chronicle state
  const [showCreateChronicle, setShowCreateChronicle] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cGroup, setCGroup] = useState(groups[0]?.name || 'Клуб на петъчната салата');
  const [cDecision, setCDecision] = useState('');
  const [cStory, setCStory] = useState('');
  const [cVisibility, setCVisibility] = useState<ChronicleEntry['visibility']>('friends');
  const [cConsent, setCConsent] = useState(false);

  // Add wisdom state
  const [wQuote, setWQuote] = useState('');
  const [wContext, setWContext] = useState('');
  const [wConsent, setWConsent] = useState(true);

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim()) return;
    onCreateGroup(gName, gMotto, gCity, gSchedule);
    setGName('');
    setGMotto('');
    setShowCreateGroup(false);
  };

  const handleChronicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddChronicle({
      eventTitle: cTitle,
      groupName: cGroup,
      officialDecision: cDecision,
      story: cStory,
      visibility: cVisibility,
      consentConfirmed: cConsent,
    });
    if (cConsent) {
      setCTitle('');
      setCDecision('');
      setCStory('');
      setCConsent(false);
      setShowCreateChronicle(false);
    }
  };

  const handleWisdomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wQuote.trim()) return;
    onAddWisdom(wQuote, wContext, wConsent, wConsent);
    setWQuote('');
    setWContext('');
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#1E1915]">
            {mode === 'groups' ? 'Кръчмарски съвет — Моите дружини' : 'Летопис и мъдрости'}
          </h1>
          <p className="mt-1 text-sm text-[#5D5348]">
            {mode === 'groups'
              ? 'Постоянни приятелски групи с автоматично намиране на общ удобен час („Кворумът е събран“).'
              : 'Официални решения след сбирките и записани мисли от масата — само със съгласие на участниците.'}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-[#EFE8DC] p-1 self-start">
          <button
            type="button"
            onClick={() => setMode('groups')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
              mode === 'groups'
                ? 'bg-[#FDFBF7] text-[#1E1915] shadow-xs'
                : 'text-[#5D5348] hover:text-[#1E1915]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Дружини</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('chronicle')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
              mode === 'chronicle'
                ? 'bg-[#FDFBF7] text-[#1E1915] shadow-xs'
                : 'text-[#5D5348] hover:text-[#1E1915]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Летопис и мъдрост</span>
          </button>
        </div>
      </div>

      {/* GROUPS SECTION („Кръчмарски съвет“ + „Кворумът е събран“) */}
      {mode === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCreateGroup((s) => !s)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C4532] px-4 py-2.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Учреди нов Съвет</span>
            </button>
          </div>

          {showCreateGroup && (
            <form
              onSubmit={handleGroupSubmit}
              className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#1E1915]">
                Нова постоянна дружина
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="Име (напр. Съвет на старейшините)"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                  required
                />
                <select
                  value={gCity}
                  onChange={(e) => setGCity(e.target.value)}
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                >
                  {BULGARIAN_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={gMotto}
                  onChange={(e) => setGMotto(e.target.value)}
                  placeholder="Девиз на дружината"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={gSchedule}
                  onChange={(e) => setGSchedule(e.target.value)}
                  placeholder="Обичаен график (напр. Всеки петък от 19:30)"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="rounded-xl border border-[#DDD3C2] px-4 py-2 text-xs font-semibold text-[#5D5348]"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1C4532] px-4 py-2 text-xs font-semibold text-[#F7F3EC]"
                >
                  Създай дружината
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {groups.map((grp) => (
              <article
                key={grp.id}
                className="flex flex-col justify-between rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#5D5348]">
                        {grp.city} · <span className="font-mono tabular-nums">{grp.memberCount} членове</span> ·{' '}
                        <span className="font-mono tabular-nums">{grp.meetingsHeld} заседания</span>
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#1E1915]">
                        {grp.name}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleGroupMembership(grp.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap shrink-0 ${
                        grp.isMember
                          ? 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#7C232B]'
                          : 'bg-[#1C4532] text-[#F7F3EC] hover:bg-[#153526]'
                      }`}
                    >
                      {grp.isMember ? 'Член си ✓' : 'Присъедини се'}
                    </button>
                  </div>

                  <p className="mt-2 text-sm italic text-[#5D5348]">„{grp.motto}“</p>
                  <p className="mt-2 text-xs text-[#5D5348]">
                    Редовен график: <strong className="text-[#1E1915]">{grp.regularSchedule}</strong>
                  </p>
                </div>

                {/* „Кворумът е събран“ — Common Time Slot Finder */}
                <div className="border-t border-[#DDD3C2] pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E1915]">
                      <CalendarCheck className="h-4 w-4 text-[#1C4532]" />
                      Кворумът е събран — гласувай удобен час
                    </span>
                    <span className="font-mono text-xs text-[#5D5348] tabular-nums">
                      Кворум: {grp.quorumRequired} души
                    </span>
                  </div>

                  <div className="space-y-2">
                    {grp.quorumSlots.map((slot) => {
                      const hasVoted = slot.voterIds.includes(profile.id);
                      const reached = slot.voterIds.length >= grp.quorumRequired;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => onVoteQuorumSlot(grp.id, slot.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors flex items-center justify-between gap-3 min-h-[52px] ${
                            hasVoted
                              ? 'border-[#1C4532] bg-[#1C4532]/8'
                              : 'border-[#DDD3C2] bg-[#F7F3EC] hover:border-[#1C4532]/50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#1E1915] flex items-center gap-2">
                              {hasVoted && <Check className="h-4 w-4 text-[#1C4532]" />}
                              <span>{slot.label}</span>
                            </p>
                            <p className="text-xs text-[#5D5348] font-mono tabular-nums">
                              {slot.dateLabel} · {slot.time} ч.
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {reached && (
                              <span className="tavern-stamp text-[#1C4532]">КВОРУМ</span>
                            )}
                            <span className="font-mono text-xs font-semibold text-[#1E1915] tabular-nums">
                              {slot.voterIds.length}/{grp.quorumRequired}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* CHRONICLE & TABLE WISDOM SECTION */}
      {mode === 'chronicle' && (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Летопис на дружината */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-[#1E1915]">
                Летопис на дружината
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateChronicle((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C4532] px-4 py-2 text-xs font-semibold text-[#F7F3EC] min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>Запиши решение</span>
              </button>
            </div>

            {showCreateChronicle && (
              <form
                onSubmit={handleChronicleSubmit}
                className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-3.5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    placeholder="Име на миналата сбирка"
                    className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                    required
                  />
                  <select
                    value={cGroup}
                    onChange={(e) => setCGroup(e.target.value)}
                    className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={cDecision}
                  onChange={(e) => setCDecision(e.target.value)}
                  placeholder="Официално решение (напр. Решихме проблема с паркирането...)"
                  className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                  required
                />
                <textarea
                  rows={3}
                  value={cStory}
                  onChange={(e) => setCStory(e.target.value)}
                  placeholder="Кратка история от вечерта..."
                  className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2 items-center">
                  <select
                    value={cVisibility}
                    onChange={(e) =>
                      setCVisibility(e.target.value as ChronicleEntry['visibility'])
                    }
                    className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-xs font-medium"
                  >
                    <option value="friends">Видимост: Само приятели</option>
                    <option value="group">Видимост: Само за дружината</option>
                    <option value="public">Видимост: Публично</option>
                  </select>
                  <label className="flex items-start gap-2 text-xs text-[#1E1915] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cConsent}
                      onChange={(e) => setCConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#1C4532]"
                    />
                    <span>Потвърждавам, че всички споменати участници са съгласни.</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateChronicle(false)}
                    className="rounded-xl border border-[#DDD3C2] px-4 py-2 text-xs font-semibold text-[#5D5348]"
                  >
                    Отказ
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#1C4532] px-4 py-2 text-xs font-semibold text-[#F7F3EC]"
                  >
                    Публикувай в летописа
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-5">
              {chronicles.map((entry) => (
                <article
                  key={entry.id}
                  className="overflow-hidden rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7]"
                >
                  {entry.photoUrl && (
                    <div className="aspect-[16/8] w-full overflow-hidden bg-[#EFE8DC]">
                      <img
                        src={entry.photoUrl}
                        alt={entry.eventTitle}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5D5348]">
                      <span>
                        {entry.groupName} · {entry.dateLabel} · {entry.city}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#1C4532]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {entry.visibility === 'friends'
                          ? 'Само приятели'
                          : entry.visibility === 'group'
                          ? 'Само дружината'
                          : 'Публично'}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-[#1E1915]">
                      {entry.eventTitle}
                    </h3>

                    <div className="rounded-xl bg-[#EFE8DC]/75 p-3.5 text-sm text-[#1E1915]">
                      <p className="text-xs font-semibold text-[#7C232B] mb-1">
                        Официално решение на Съвета
                      </p>
                      <p className="font-medium">„{entry.officialDecision}“</p>
                    </div>

                    <p className="text-sm text-[#5D5348] leading-relaxed">{entry.story}</p>

                    <div className="flex items-center justify-between border-t border-[#DDD3C2]/70 pt-3 text-xs text-[#5D5348]">
                      <span>Записал: {entry.authorName}</span>
                      <button
                        type="button"
                        onClick={() => onToggleChronicleLike(entry.id)}
                        className={`inline-flex items-center gap-1.5 font-semibold min-h-[36px] ${
                          entry.likedByMe ? 'text-[#7C232B]' : 'text-[#5D5348] hover:text-[#1E1915]'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${entry.likedByMe ? 'fill-current' : ''}`} />
                        <span className="font-mono tabular-nums">{entry.likes}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Мъдрост от масата */}
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-2xl font-bold text-[#1E1915]">
              Мъдрост от масата
            </h2>

            <form
              onSubmit={handleWisdomSubmit}
              className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-3"
            >
              <textarea
                rows={2}
                value={wQuote}
                onChange={(e) => setWQuote(e.target.value)}
                placeholder="Запиши оригинална мисъл от последната среща..."
                className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
                required
              />
              <input
                type="text"
                value={wContext}
                onChange={(e) => setWContext(e.target.value)}
                placeholder="Контекст (напр. след 30-ата минута в механата)"
                className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2 text-xs"
              />
              <label className="flex items-start gap-2 text-xs text-[#5D5348] cursor-pointer">
                <input
                  type="checkbox"
                  checked={wConsent}
                  onChange={(e) => setWConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1C4532]"
                />
                <span>Сподели в рамките на приятелската група (със съгласие на автора)</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#1C4532] py-2.5 text-xs font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[42px]"
              >
                Запази мъдростта
              </button>
            </form>

            <div className="space-y-3.5">
              {wisdom.map((w) => (
                <blockquote
                  key={w.id}
                  className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5"
                >
                  <Quote className="h-5 w-5 text-[#A6762C]" />
                  <p className="mt-2 font-display text-base italic text-[#1E1915] leading-relaxed">
                    „{w.quote}“
                  </p>
                  <footer className="mt-3 text-xs text-[#5D5348]">
                    <strong className="text-[#1E1915]">{w.authorNickname}</strong> · {w.context} ·{' '}
                    {w.dateLabel}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
