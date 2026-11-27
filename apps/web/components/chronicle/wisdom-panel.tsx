"use client";

import type { WisdomDTO } from "@hp1/shared";
import { Lock, Quote } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, SkeletonList, inputClass, labelClass, primaryButton } from "@/components/groups/ui";
import { useToast } from "@/components/ui/toast";
import { useAddWisdom, useGroups, useProfile, useWisdom, useWisdomConsent } from "@/hooks/api/community";

import { buildWisdomInput, wisdomNeedsMyConsent, wisdomPending } from "./chronicle-form";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "numeric", month: "short" });

/** „Мъдрост от масата“: private quotes (author, quoted person, or the group once approved). */
export function WisdomPanel() {
  const wisdom = useWisdom();
  const profile = useProfile();
  const me = profile.data?.id;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Мъдрост от масата</h2>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Никога публично. Виждат я само ти, цитираният човек и — ако я споделиш — членовете на дружината, след като цитираният
          се съгласи.
        </p>
      </div>

      <AddWisdomForm meId={me} />

      {wisdom.isPending ? (
        <SkeletonList count={3} className="h-28" />
      ) : wisdom.isError ? (
        <ErrorState error={wisdom.error} onRetry={() => void wisdom.refetch()} />
      ) : wisdom.data.length === 0 ? (
        <EmptyState title="Още няма записани мъдрости">Запиши първата мисъл от последната маса.</EmptyState>
      ) : (
        <div className="space-y-3.5">
          {wisdom.data.map((w) => (
            <WisdomItem key={w.id} w={w} meId={me} />
          ))}
        </div>
      )}
    </div>
  );
}

function WisdomItem({ w, meId }: { w: WisdomDTO; meId: string | undefined }) {
  const { show, showError } = useToast();
  const consent = useWisdomConsent();
  const pending = wisdomPending(w);
  const askMe = wisdomNeedsMyConsent(w, meId);

  const answer = (accept: boolean) =>
    consent.mutate(
      { wisdomId: w.id, accept },
      {
        onSuccess: (r) => show(r.status === "accepted" ? "Цитатът е одобрен." : "Цитатът е премахнат.", "success"),
        onError: showError,
      },
    );

  return (
    <blockquote className={`rounded-2xl border bg-surface p-5 ${askMe ? "border-brass/60" : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <Quote className="h-5 w-5 text-brass" />
        <span className="flex flex-wrap justify-end gap-1.5 text-[11px] font-semibold">
          {pending ? <span className="rounded-full bg-brass/15 px-2 py-0.5 text-brass">Чака съгласие</span> : null}
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-ink-muted">
            {w.sharedToGroup && w.groupName ? `Дружина: ${w.groupName}` : "Лично"}
          </span>
        </span>
      </div>
      <p className="mt-2 font-display text-base italic leading-relaxed text-ink">„{w.quote}“</p>
      <footer className="mt-3 text-xs text-ink-muted">
        {w.quotedUser ? (
          <>
            <strong className="text-ink">{w.quotedUser.nickname}</strong> · записа {w.author?.nickname ?? "изтрит профил"}
          </>
        ) : (
          <strong className="text-ink">{w.author?.nickname ?? "изтрит профил"}</strong>
        )}
        {w.context ? ` · ${w.context}` : null} · {dateFmt.format(new Date(w.createdAt))}
      </footer>
      {askMe ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-xs text-ink">
            {w.author?.nickname ?? "Някой"} те цитира. Одобри, за да я видят и членовете на дружината, или я премахни.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={consent.isPending}
              onClick={() => answer(true)}
              className="flex-1 rounded-lg bg-tavern py-2 text-xs font-semibold text-canvas disabled:opacity-60"
            >
              Одобрявам
            </button>
            <button
              type="button"
              disabled={consent.isPending}
              onClick={() => answer(false)}
              className="flex-1 rounded-lg border border-line bg-canvas py-2 text-xs font-semibold text-ink disabled:opacity-60"
            >
              Премахни
            </button>
          </div>
        </div>
      ) : null}
    </blockquote>
  );
}

function AddWisdomForm({ meId }: { meId: string | undefined }) {
  const { show, showError } = useToast();
  const add = useAddWisdom();
  const groups = useGroups();
  const myGroups = useMemo(() => (groups.data ?? []).filter((g) => g.isMember), [groups.data]);
  const [quote, setQuote] = useState("");
  const [context, setContext] = useState("");
  const [groupId, setGroupId] = useState("");
  const [quotedUserId, setQuoted] = useState("");
  const quotable = (myGroups.find((g) => g.id === groupId)?.members ?? []).filter((m) => m.id !== meId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildWisdomInput({ quote, context, groupId, quotedUserId: quotable.some((m) => m.id === quotedUserId) ? quotedUserId : "" });
    if (!built.ok) return show(built.error, "error");
    add.mutate(built.input, {
      onSuccess: (w) => {
        show(w?.quotedUser && !w.consentGiven ? `Запазено. ${w.quotedUser.nickname} ще бъде попитан за съгласие.` : "Мъдростта е запазена.", "success");
        setQuote("");
        setContext("");
        setQuoted("");
      },
      onError: showError,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <textarea
        aria-label="Мисъл"
        rows={2}
        value={quote}
        maxLength={280}
        onChange={(e) => setQuote(e.target.value)}
        placeholder="Запиши оригинална мисъл от последната среща..."
        className={inputClass}
        required
      />
      <input
        aria-label="Контекст"
        value={context}
        maxLength={140}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Контекст (напр. след 30-ата минута в механата)"
        className={inputClass}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="w-group" className={labelClass}>
            Сподели с
          </label>
          <select
            id="w-group"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setQuoted("");
            }}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">Само за мен</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="w-quoted" className={labelClass}>
            Кой го каза
          </label>
          <select
            id="w-quoted"
            value={quotedUserId}
            onChange={(e) => setQuoted(e.target.value)}
            disabled={!groupId}
            className={`mt-1 ${inputClass} disabled:opacity-60`}
          >
            <option value="">{groupId ? "Аз / не посочвам" : "Избери дружина първо"}</option>
            {quotable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname}
              </option>
            ))}
          </select>
        </div>
      </div>
      {quotedUserId ? (
        <p className="text-xs text-ink-muted">
          Цитираният ще бъде попитан. Докато не се съгласи, мисълта виждате само ти и той.
        </p>
      ) : null}
      <button type="submit" disabled={add.isPending} className={`${primaryButton} w-full`}>
        Запази мъдростта
      </button>
    </form>
  );
}
