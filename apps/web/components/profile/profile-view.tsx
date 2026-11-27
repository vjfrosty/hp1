"use client";

import {
  BULGARIAN_CITIES,
  COMPANY_SIZES,
  HONOR_BADGES,
  HUMOROUS_ROLES,
  INTEREST_OPTIONS,
  MEZE_PREFERENCES,
  VENUE_TYPES,
  type ProfileDTO,
} from "@hp1/shared";
import { Award, Car, Download, Radar, Shield, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";

import { Avatar, ErrorState, Skeleton, inputClass, labelClass, primaryButton } from "@/components/groups/ui";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useToast } from "@/components/ui/toast";
import { useProfile, useUpdateProfile } from "@/hooks/api/community";

import { formFromProfile, neighborhoodsFor, profileFormError, profilePatch, toggleIn, type ProfileForm } from "./profile-form";

/** „Ракиен паспорт“ (legacy ProfileView). */
export function ProfileView() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <div className="space-y-6" role="status" aria-label="Зареждане">
        <Skeleton className="h-32" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[40rem] lg:col-span-7" />
          <Skeleton className="h-96 lg:col-span-5" />
        </div>
      </div>
    );
  }
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;

  const p = profile.data;
  const role = p.roleId ? HUMOROUS_ROLES[p.roleId] : null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar user={p} size="lg" />
            <div>
              <p className="text-xs font-semibold text-burgundy">Ракиен паспорт · 18+</p>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{p.nickname}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">
                {[p.city, p.neighborhood ? `кв. ${p.neighborhood}` : null].filter(Boolean).join(", ") || "Град не е избран"}
                {role ? ` · ${role.title}` : null}
              </p>
            </div>
          </div>
          <PWAInstallButton compact />
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-12">
        {/* Remount with fresh state only when a different profile loads. */}
        <ProfileEditor key={p.id} profile={p} />
        <div className="space-y-6 lg:col-span-5">
          <BadgesCard earned={p.earnedBadges} />
          <PrivacyCard />
        </div>
      </div>
    </div>
  );
}

const chip = (on: boolean, onClass: string) =>
  `min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
    on ? onClass : "border border-line bg-canvas text-ink-muted"
  }`;

function ProfileEditor({ profile }: { profile: ProfileDTO }) {
  const { show, showError } = useToast();
  const update = useUpdateProfile();
  const [form, setForm] = useState<ProfileForm>(() => formFromProfile(profile));
  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const neighborhoods = neighborhoodsFor(form.city);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const error = profileFormError(form);
    if (error) return show(error, "error");
    const patch = profilePatch(profile, form);
    if (Object.keys(patch).length === 0) return show("Няма промени за запазване.");
    update.mutate(patch, {
      onSuccess: (next) => {
        setForm(formFromProfile(next));
        show("Ракиеният паспорт е запазен.", "success");
      },
      onError: showError,
    });
  };

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border border-line bg-surface p-6 lg:col-span-7">
      <h2 className="font-display text-xl font-bold text-ink">Данни в паспорта</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="p-nick" className={labelClass}>
            Име или прякор
          </label>
          <input
            id="p-nick"
            value={form.nickname}
            maxLength={40}
            onChange={(e) => set("nickname", e.target.value)}
            className={`mt-1.5 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="p-city" className={labelClass}>
            Град
          </label>
          <select
            id="p-city"
            value={form.city}
            onChange={(e) => {
              const city = e.target.value;
              setForm((f) => ({ ...f, city, neighborhood: neighborhoodsFor(city)[0] ?? null }));
            }}
            className={`mt-1.5 ${inputClass}`}
          >
            {BULGARIAN_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-hood" className={labelClass}>
            Квартал
          </label>
          <select
            id="p-hood"
            value={form.neighborhood ?? ""}
            onChange={(e) => set("neighborhood", e.target.value || null)}
            className={`mt-1.5 ${inputClass}`}
          >
            <option value="">Не посочвам</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-avail" className={labelClass}>
            Кога обикновено си свободен
          </label>
          <input
            id="p-avail"
            value={form.usualAvailability}
            maxLength={120}
            onChange={(e) => set("usualAvailability", e.target.value)}
            placeholder="напр. Петък и събота вечер"
            className={`mt-1.5 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="p-size" className={labelClass}>
            Предпочитана компания
          </label>
          <select
            id="p-size"
            value={form.companySize}
            onChange={(e) => set("companySize", e.target.value as ProfileForm["companySize"])}
            className={`mt-1.5 ${inputClass}`}
          >
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-ink">Твоята роля в компанията</h3>
        <p className="mt-0.5 text-xs text-ink-muted">Ролите са само за забавление и не влияят върху достъпа до сбирки.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {Object.values(HUMOROUS_ROLES).map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={form.roleId === r.id}
              onClick={() => set("roleId", r.id)}
              className={`rounded-xl border p-3.5 text-left transition-colors ${
                form.roleId === r.id ? "border-tavern bg-tavern/8" : "border-line bg-canvas hover:border-tavern/40"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{r.title}</p>
              <p className="mt-1 text-xs leading-snug text-ink-muted">{r.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-line pt-5">
        <div>
          <span className={labelClass}>Предпочитани места</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {VENUE_TYPES.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={form.preferredVenues.includes(v)}
                onClick={() => set("preferredVenues", toggleIn(form.preferredVenues, v))}
                className={`${chip(form.preferredVenues.includes(v), "bg-tavern text-canvas")} capitalize`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelClass}>Любими мезета</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEZE_PREFERENCES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={form.favoriteMeze.includes(m)}
                onClick={() => set("favoriteMeze", toggleIn(form.favoriteMeze, m))}
                className={chip(form.favoriteMeze.includes(m), "bg-burgundy text-canvas")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelClass}>Теми и интереси за разговор</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-pressed={form.interests.includes(i)}
                onClick={() => set("interests", toggleIn(form.interests, i))}
                className={chip(form.interests.includes(i), "bg-ink text-canvas")}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.nonAlcoholicPreferred}
            onChange={(e) => set("nonAlcoholicPreferred", e.target.checked)}
            className="h-4 w-4 accent-[#1C4532]"
          />
          <span className="inline-flex items-center gap-1.5">
            <Car className="h-4 w-4 text-tavern" />
            Обикновено избирам безалкохолно / шофьор съм
          </span>
        </label>
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Radar className="h-4 w-4 text-tavern" />
          Радар „Кой е навън“
        </h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.radarActive}
            onChange={(e) => set("radarActive", e.target.checked)}
            className="h-4 w-4 accent-[#1C4532]"
          />
          Покажи ме на радара (само квартал, никога точно място)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-radius" className={labelClass}>
              Радиус: <span className="font-mono tabular-nums">{form.radarRadiusKm} км</span>
            </label>
            <input
              id="p-radius"
              type="range"
              min={1}
              max={50}
              value={form.radarRadiusKm}
              onChange={(e) => set("radarRadiusKm", Number(e.target.value))}
              className="mt-3 w-full accent-[#1C4532]"
            />
          </div>
          <div>
            <label htmlFor="p-radar-msg" className={labelClass}>
              Съобщение на радара
            </label>
            <input
              id="p-radar-msg"
              value={form.radarMessage ?? ""}
              maxLength={140}
              onChange={(e) => set("radarMessage", e.target.value)}
              placeholder="напр. Някой за една бира в центъра?"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={update.isPending} className={`${primaryButton} px-6`}>
        <UserCheck className="h-4 w-4" />
        Запази Ракиения паспорт
      </button>
    </form>
  );
}

function BadgesCard({ earned }: { earned: string[] }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <Award className="h-5 w-5 text-brass" />
          Почетен мезеджия
        </h2>
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          {HONOR_BADGES.filter((b) => earned.includes(b.id)).length}/{HONOR_BADGES.length}
        </span>
      </div>
      <p className="text-xs text-ink-muted">Значки единствено за добра организация, точност и гостоприемство. Никакви точки за алкохол.</p>
      <div className="divide-y divide-line/70">
        {HONOR_BADGES.map((badge) => {
          const has = earned.includes(badge.id);
          return (
            <div key={badge.id} className={`flex items-start justify-between gap-3 py-3 ${has ? "" : "opacity-45"}`}>
              <div>
                <p className="text-sm font-semibold text-ink">{badge.title}</p>
                <p className="text-xs text-ink-muted">{badge.description}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-semibold text-tavern">
                {has ? "Получена ✓" : badge.metricLabel}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Blocked users and GDPR export/delete ship in phase 3; buttons only announce that. */
function PrivacyCard() {
  const { show } = useToast();
  const soon = () => show("Скоро");

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
        <Shield className="h-5 w-5 text-tavern" />
        Поверителност и безопасност
      </h2>
      <ul className="space-y-2 text-xs leading-relaxed text-ink-muted">
        <li>• Достъп само за пълнолетни (18+), без продажба и доставка на алкохол.</li>
        <li>• Точните домашни адреси са видими само за одобрени участници.</li>
        <li>• Напомняне: Ако шофираш, избери безалкохолно.</li>
      </ul>

      <div className="space-y-2 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">Блокирани профили</p>
          <button type="button" onClick={soon} className="text-xs font-semibold text-tavern hover:underline">
            Управлявай
          </button>
        </div>
        <p className="text-xs text-ink-muted">Списъкът с блокирани профили идва скоро.</p>
      </div>

      <div className="space-y-2.5 border-t border-line pt-4">
        <button
          type="button"
          onClick={soon}
          className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-muted"
        >
          <Download className="h-4 w-4" />
          Изтегли моите данни (GDPR JSON)
        </button>
        <button
          type="button"
          onClick={soon}
          className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-burgundy/40 px-4 py-2.5 text-xs font-semibold text-burgundy hover:bg-burgundy/10"
        >
          <Trash2 className="h-4 w-4" />
          Изтрий профила и личните данни
        </button>
      </div>
    </section>
  );
}
