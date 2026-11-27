"use client";

import { BULGARIAN_CITIES } from "@hp1/shared";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { useCreateGroup, useGroups, useProfile } from "@/hooks/api/community";

import { GroupCard } from "./group-card";
import { CitySelect, EmptyState, ErrorState, SkeletonList, inputClass, labelClass, primaryButton, secondaryButton } from "./ui";

/** „Кръчмарски съвет — Моите дружини“ (legacy GroupsView, mode 'groups'). */
export function GroupsView() {
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);
  const groups = useGroups(city || null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Кръчмарски съвет — Моите дружини</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Постоянни приятелски групи с общо намиране на удобен час („Кворумът е събран“).
          </p>
        </div>
        <Link href="/chronicle" className={`${secondaryButton} self-start`}>
          <BookOpen className="h-4 w-4" />
          Летопис и мъдрост
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-64">
          <label htmlFor="groups-city" className={labelClass}>
            Град
          </label>
          <div className="mt-1">
            <CitySelect id="groups-city" value={city} onChange={setCity} cities={BULGARIAN_CITIES} allLabel="Всички градове" />
          </div>
        </div>
        <button type="button" onClick={() => setCreating((s) => !s)} className={primaryButton}>
          <Plus className="h-4 w-4" />
          Учреди нов Съвет
        </button>
      </div>

      {creating ? <CreateGroupForm onDone={() => setCreating(false)} /> : null}

      {groups.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonList count={2} className="h-72" />
          <SkeletonList count={2} className="h-72" />
        </div>
      ) : groups.isError ? (
        <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />
      ) : groups.data.length === 0 ? (
        <EmptyState title="Още няма дружини тук">Учреди първия Съвет и покани приятели.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {groups.data.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateGroupForm({ onDone }: { onDone: () => void }) {
  const { show, showError } = useToast();
  const profile = useProfile();
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  // null = not touched yet: follow the profile city once it loads.
  const [cityChoice, setCityChoice] = useState<string | null>(null);
  const [schedule, setSchedule] = useState("Всеки петък от 19:30");
  const [quorum, setQuorum] = useState(3);
  const city = cityChoice ?? profile.data?.city ?? BULGARIAN_CITIES[0].name;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return show("Името е поне 2 знака.", "error");
    create.mutate(
      { name: trimmed, motto: motto.trim(), city, regularSchedule: schedule.trim(), quorumRequired: quorum },
      {
        onSuccess: (g) => {
          show(`„${g.name}“ е учреден!`, "success");
          onDone();
        },
        onError: showError,
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-ink">Нова постоянна дружина</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="g-name" className={labelClass}>
            Име
          </label>
          <input
            id="g-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="напр. Съвет на старейшините"
            className={`mt-1 ${inputClass}`}
            required
          />
        </div>
        <div>
          <label htmlFor="g-city" className={labelClass}>
            Град
          </label>
          <div className="mt-1">
            <CitySelect id="g-city" value={city} onChange={setCityChoice} cities={BULGARIAN_CITIES} />
          </div>
        </div>
        <div>
          <label htmlFor="g-motto" className={labelClass}>
            Девиз
          </label>
          <input
            id="g-motto"
            value={motto}
            maxLength={140}
            onChange={(e) => setMotto(e.target.value)}
            placeholder="Девиз на дружината"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="g-schedule" className={labelClass}>
            Обичаен график
          </label>
          <input
            id="g-schedule"
            value={schedule}
            maxLength={80}
            onChange={(e) => setSchedule(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="g-quorum" className={labelClass}>
            Кворум (души)
          </label>
          <input
            id="g-quorum"
            type="number"
            min={2}
            max={30}
            value={quorum}
            onChange={(e) => setQuorum(Math.min(30, Math.max(2, Math.round(Number(e.target.value) || 2))))}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryButton}>
          Отказ
        </button>
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          Създай дружината
        </button>
      </div>
    </form>
  );
}
