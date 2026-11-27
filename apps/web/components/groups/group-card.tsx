"use client";

import type { GroupDTO } from "@hp1/shared";
import { sofiaTime } from "@hp1/shared";
import { CalendarCheck, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { useCreateQuorumSlot, useToggleMembership, useVoteQuorum } from "@/hooks/api/community";

import {
  QUORUM_MAX_AHEAD_DAYS,
  quorumSlotTimeError,
  slotDayLabel,
  sofiaDatePlusDays,
  sofiaLocalToIso,
  sofiaToday,
} from "./quorum-time";
import { Avatar, inputClass, labelClass, primaryButton, secondaryButton } from "./ui";

/** One "Кръчмарски съвет": membership toggle, members and the quorum vote. */
export function GroupCard({ group, detailed = false }: { group: GroupDTO; detailed?: boolean }) {
  const { show, showError } = useToast();
  const membership = useToggleMembership(group.id);
  const vote = useVoteQuorum(group.id);
  const [proposing, setProposing] = useState(false);

  const toggleMembership = () =>
    membership.mutate(undefined, {
      onSuccess: (g) => show(g.isMember ? `Добре дошъл в „${g.name}“!` : `Напусна „${g.name}“.`, "success"),
      onError: showError,
    });

  const castVote = (slotId: string) =>
    vote.mutate(slotId, {
      onSuccess: (g) => {
        const slot = g.quorumSlots.find((s) => s.id === slotId);
        if (slot?.mine && slot.reached) show("Кворумът е събран!", "success");
      },
      onError: showError,
    });

  const members = detailed ? group.members : group.members.slice(0, 8);
  const hiddenMembers = group.memberCount - members.length;

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">
              {group.city} · <span className="font-mono tabular-nums">{group.memberCount} членове</span> ·{" "}
              <span className="font-mono tabular-nums">{group.meetingsHeld} заседания</span>
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              {detailed ? (
                group.name
              ) : (
                <Link href={`/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={toggleMembership}
            disabled={membership.isPending}
            className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              group.isMember
                ? "border border-line bg-canvas text-ink-muted hover:text-burgundy"
                : "bg-tavern text-canvas hover:bg-tavern-hover"
            }`}
          >
            {group.isMember ? "Член си ✓" : "Присъедини се"}
          </button>
        </div>

        {group.motto ? <p className="mt-2 text-sm italic text-ink-muted">„{group.motto}“</p> : null}
        <p className="mt-2 text-xs text-ink-muted">
          Редовен график: <strong className="text-ink">{group.regularSchedule || "—"}</strong>
        </p>

        {members.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {members.map((m) =>
              detailed ? (
                <span key={m.id} className="inline-flex items-center gap-2 rounded-full bg-canvas py-1 pl-1 pr-3 text-xs text-ink">
                  <Avatar user={m} />
                  {m.nickname}
                </span>
              ) : (
                <Avatar key={m.id} user={m} />
              ),
            )}
            {hiddenMembers > 0 ? <span className="text-xs text-ink-muted">+{hiddenMembers}</span> : null}
          </div>
        ) : null}
      </div>

      {/* „Кворумът е събран“ — common time slot finder */}
      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
            <CalendarCheck className="h-4 w-4 text-tavern" />
            Кворумът е събран — гласувай удобен час
          </span>
          <span className="font-mono text-xs tabular-nums text-ink-muted">Кворум: {group.quorumRequired} души</span>
        </div>

        {group.quorumSlots.length === 0 ? (
          <p className="text-xs text-ink-muted">Още няма предложени часове.</p>
        ) : (
          <div className="space-y-2">
            {group.quorumSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => castVote(slot.id)}
                disabled={!group.isMember}
                title={group.isMember ? undefined : "Само членове на дружината гласуват."}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed ${
                  slot.mine ? "border-tavern bg-tavern/8" : "border-line bg-canvas hover:border-tavern/50"
                }`}
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {slot.mine ? <Check className="h-4 w-4 text-tavern" /> : null}
                    <span>{slot.label}</span>
                  </p>
                  <p className="font-mono text-xs tabular-nums text-ink-muted">
                    {slotDayLabel(slot.startsAt)} · {sofiaTime(slot.startsAt)} ч.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {slot.reached ? <span className="tavern-stamp text-tavern">КВОРУМ</span> : null}
                  <span className="font-mono text-xs font-semibold tabular-nums text-ink">
                    {slot.votes}/{group.quorumRequired}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {group.isMember ? (
          proposing ? (
            <ProposeSlotForm groupId={group.id} onDone={() => setProposing(false)} />
          ) : (
            <button type="button" onClick={() => setProposing(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-tavern hover:underline">
              <Plus className="h-4 w-4" />
              Предложи час
            </button>
          )
        ) : (
          <p className="text-xs text-ink-muted">Присъедини се, за да гласуваш и предлагаш часове.</p>
        )}
      </div>
    </article>
  );
}

function ProposeSlotForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const { show, showError } = useToast();
  const create = useCreateQuorumSlot(groupId);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:30");
  const [error, setError] = useState<string | null>(null);
  const [bounds] = useState(() => ({ min: sofiaToday(), max: sofiaDatePlusDays(QUORUM_MAX_AHEAD_DAYS) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = label.trim();
    if (name.length < 2) return setError("Името на часа е поне 2 знака.");
    const startsAt = sofiaLocalToIso(date, time);
    const timeError = quorumSlotTimeError(startsAt);
    if (timeError || !startsAt) return setError(timeError);
    setError(null);
    create.mutate(
      { label: name, startsAt },
      {
        onSuccess: () => {
          show("Часът е предложен. Гласувайте!", "success");
          onDone();
        },
        onError: showError,
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-canvas p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor={`slot-label-${groupId}`} className={labelClass}>
            Име (напр. Петък вечер)
          </label>
          <input
            id={`slot-label-${groupId}`}
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`slot-date-${groupId}`} className={labelClass}>
            Дата
          </label>
          <input
            id={`slot-date-${groupId}`}
            type="date"
            value={date}
            min={bounds.min}
            max={bounds.max}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor={`slot-time-${groupId}`} className={labelClass}>
            Час (София)
          </label>
          <input
            id={`slot-time-${groupId}`}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
      {error ? <p className="text-xs font-semibold text-burgundy">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryButton}>
          Отказ
        </button>
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          Предложи
        </button>
      </div>
    </form>
  );
}
