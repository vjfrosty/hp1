import React, { useMemo, useState } from 'react';
import {
  Award,
  Car,
  Download,
  Shield,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  CompanySizePref,
  HumorousRoleId,
  ModerationReport,
  UserProfile,
  VenueType,
} from '../types/app';
import {
  BULGARIAN_CITIES,
  HONOR_BADGES,
  HUMOROUS_ROLES,
  INTEREST_OPTIONS,
  MEZE_PREFERENCES,
  VENUE_TYPES,
} from '../data/bulgaria';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileViewProps {
  profile: UserProfile;
  reports: ModerationReport[];
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUnblockUser: (userId: string) => void;
  onExportGDPR: () => void;
  onDeleteGDPR: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  reports,
  onUpdateProfile,
  onUnblockUser,
  onExportGDPR,
  onDeleteGDPR,
}) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [city, setCity] = useState(profile.city);
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood);
  const [usualAvailability, setUsualAvailability] = useState(profile.usualAvailability);
  const [companySize, setCompanySize] = useState<CompanySizePref>(profile.companySize);
  const [roleId, setRoleId] = useState<HumorousRoleId>(profile.roleId);
  const [preferredVenues, setPreferredVenues] = useState<VenueType[]>(profile.preferredVenues);
  const [favoriteMeze, setFavoriteMeze] = useState<string[]>(profile.favoriteMeze);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [nonAlcoholicPreferred, setNonAlcoholicPreferred] = useState(
    profile.nonAlcoholicPreferred
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const neighborhoods = useMemo(() => {
    const c = BULGARIAN_CITIES.find((x) => x.name === city) || BULGARIAN_CITIES[0];
    return c.neighborhoods.map((n) => n.name);
  }, [city]);

  const toggleItem = <T extends string>(list: T[], val: T, setter: (next: T[]) => void) => {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = nickname.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : nickname.trim().slice(0, 2).toUpperCase() || 'УЧ';

    onUpdateProfile({
      nickname: nickname.trim() || 'Участник',
      avatarInitials: initials,
      city,
      neighborhood,
      usualAvailability,
      companySize,
      roleId,
      preferredVenues,
      favoriteMeze,
      interests,
      nonAlcoholicPreferred,
    });
  };

  const activeRole = HUMOROUS_ROLES[roleId];

  return (
    <div className="space-y-8">
      {/* Header Passport Banner */}
      <section className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold text-[#F7F3EC]"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {profile.avatarInitials}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7C232B]">Ракиен паспорт · 18+</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1915]">
                {profile.nickname}
              </h1>
              <p className="mt-0.5 text-sm text-[#5D5348]">
                {profile.city}, кв. {profile.neighborhood} · {activeRole.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PWAInstallButton compact />
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Editable Passport Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 space-y-6 rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6"
        >
          <h2 className="font-display text-xl font-bold text-[#1E1915]">
            Данни в паспорта
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="p-nick" className="block text-xs font-semibold text-[#5D5348]">
                Име или прякор
              </label>
              <input
                id="p-nick"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="p-city" className="block text-xs font-semibold text-[#5D5348]">
                Град
              </label>
              <select
                id="p-city"
                value={city}
                onChange={(e) => {
                  const nextCity = e.target.value;
                  setCity(nextCity);
                  const found = BULGARIAN_CITIES.find((c) => c.name === nextCity);
                  if (found) setNeighborhood(found.neighborhoods[0].name);
                }}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {BULGARIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="p-hood" className="block text-xs font-semibold text-[#5D5348]">
                Квартал
              </label>
              <select
                id="p-hood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="p-avail" className="block text-xs font-semibold text-[#5D5348]">
                Кога обикновено си свободен
              </label>
              <input
                id="p-avail"
                type="text"
                value={usualAvailability}
                onChange={(e) => setUsualAvailability(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="p-size" className="block text-xs font-semibold text-[#5D5348]">
                Предпочитана компания
              </label>
              <select
                id="p-size"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value as CompanySizePref)}
                className="mt-1.5 w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                <option value="2–3 души">2–3 души</option>
                <option value="4–6 души">4–6 души</option>
                <option value="7+ души">7+ души</option>
              </select>
            </div>
          </div>

          {/* 6 Humorous Roles */}
          <div className="border-t border-[#DDD3C2] pt-5">
            <h3 className="text-sm font-semibold text-[#1E1915]">
              Твоята роля в компанията
            </h3>
            <p className="mt-0.5 text-xs text-[#5D5348]">
              Ролите са само за забавление и не влияят върху достъпа до сбирки.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {Object.values(HUMOROUS_ROLES).map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setRoleId(role.id)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    roleId === role.id
                      ? 'border-[#1C4532] bg-[#1C4532]/8'
                      : 'border-[#DDD3C2] bg-[#F7F3EC] hover:border-[#1C4532]/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#1E1915]">{role.title}</p>
                  <p className="mt-1 text-xs text-[#5D5348] leading-snug">{role.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Venues, Meze, Interests */}
          <div className="space-y-4 border-t border-[#DDD3C2] pt-5">
            <div>
              <span className="block text-xs font-semibold text-[#5D5348]">
                Предпочитани места
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {VENUE_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleItem(preferredVenues, v, setPreferredVenues)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors min-h-[36px] ${
                      preferredVenues.includes(v)
                        ? 'bg-[#1C4532] text-[#F7F3EC]'
                        : 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5D5348]">Любими мезета</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {MEZE_PREFERENCES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleItem(favoriteMeze, m, setFavoriteMeze)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                      favoriteMeze.includes(m)
                        ? 'bg-[#7C232B] text-[#F7F3EC]'
                        : 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5D5348]">
                Теми и интереси за разговор
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleItem(interests, i, setInterests)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                      interests.includes(i)
                        ? 'bg-[#1E1915] text-[#F7F3EC]'
                        : 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348]'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#1E1915] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={nonAlcoholicPreferred}
                onChange={(e) => setNonAlcoholicPreferred(e.target.checked)}
                className="h-4 w-4 accent-[#1C4532]"
              />
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-4 w-4 text-[#1C4532]" />
                Обикновено избирам безалкохолно / шофьор съм
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C4532] px-6 py-3 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
          >
            <UserCheck className="h-4 w-4" />
            <span>Запази Ракиения паспорт</span>
          </button>
        </form>

        {/* Right Column: Honor Badges + Privacy & GDPR Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* „Почетен мезеджия“ Badges */}
          <section className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#1E1915] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#A6762C]" />
                <span>Почетен мезеджия</span>
              </h2>
              <span className="font-mono text-xs text-[#5D5348] tabular-nums">
                {profile.earnedBadges.length}/{HONOR_BADGES.length}
              </span>
            </div>
            <p className="text-xs text-[#5D5348]">
              Значки единствено за добра организация, точност и гостоприемство. Никакви точки за
              алкохол.
            </p>

            <div className="divide-y divide-[#DDD3C2]/70">
              {HONOR_BADGES.map((badge) => {
                const earned = profile.earnedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`py-3 flex items-start justify-between gap-3 ${
                      earned ? 'opacity-100' : 'opacity-45'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1E1915]">{badge.title}</p>
                      <p className="text-xs text-[#5D5348]">{badge.description}</p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-[#1C4532] whitespace-nowrap shrink-0">
                      {earned ? 'Получена ✓' : badge.metricLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Privacy, Moderation & GDPR */}
          <section className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-[#1E1915] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#1C4532]" />
              <span>Поверителност и безопасност</span>
            </h2>

            <ul className="space-y-2 text-xs text-[#5D5348] leading-relaxed">
              <li>• Достъп само за пълнолетни (18+), без продажба и доставка на алкохол.</li>
              <li>• Точните домашни адреси са видими само за одобрени участници.</li>
              <li>• Напомняне: Ако шофираш, избери безалкохолно.</li>
            </ul>

            {/* Blocked users */}
            {profile.blockedUserIds.length > 0 && (
              <div className="border-t border-[#DDD3C2] pt-3 space-y-2">
                <p className="text-xs font-semibold text-[#1E1915]">
                  Блокирани профили ({profile.blockedUserIds.length})
                </p>
                {profile.blockedUserIds.map((uid) => (
                  <div key={uid} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#5D5348]">{uid}</span>
                    <button
                      type="button"
                      onClick={() => onUnblockUser(uid)}
                      className="font-semibold text-[#1C4532] hover:underline"
                    >
                      Отблокирай
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sent reports */}
            {reports.length > 0 && (
              <div className="border-t border-[#DDD3C2] pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-[#1E1915]">
                  Изпратени сигнали за модерация ({reports.length})
                </p>
                {reports.slice(0, 3).map((r) => (
                  <p key={r.id} className="text-xs text-[#5D5348]">
                    {r.targetName} — {r.reason} ({r.createdAt})
                  </p>
                ))}
              </div>
            )}

            {/* GDPR controls */}
            <div className="border-t border-[#DDD3C2] pt-4 space-y-2.5">
              <button
                type="button"
                onClick={onExportGDPR}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-2.5 text-xs font-semibold text-[#1E1915] hover:bg-[#EFE8DC] min-h-[42px]"
              >
                <Download className="h-4 w-4" />
                <span>Изтегли моите данни (GDPR JSON)</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#7C232B]/40 px-4 py-2.5 text-xs font-semibold text-[#7C232B] hover:bg-[#7C232B]/10 min-h-[42px]"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Изтрий профила и личните данни</span>
                </button>
              ) : (
                <div className="rounded-xl border border-[#7C232B] bg-[#7C232B]/8 p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#7C232B]">
                    Сигурен ли си? Всички локални данни от Ракиения паспорт ще бъдат изтрити.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteGDPR();
                        setConfirmDelete(false);
                      }}
                      className="flex-1 rounded-lg bg-[#7C232B] py-2 text-xs font-semibold text-[#F7F3EC]"
                    >
                      Да, изтрий всичко
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-[#DDD3C2] bg-[#FDFBF7] py-2 text-xs font-semibold text-[#1E1915]"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
