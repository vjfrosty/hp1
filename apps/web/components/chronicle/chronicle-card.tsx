"use client";

import type { ChronicleDTO } from "@hp1/shared";
import { Heart, ShieldCheck, UserCheck } from "lucide-react";

import { Avatar } from "@/components/groups/ui";
import { useToast } from "@/components/ui/toast";
import { useTagConsent, useToggleChronicleLike } from "@/hooks/api/community";

import { VISIBILITY_LABELS } from "./chronicle-form";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "numeric", month: "long", year: "numeric" });

export function ChronicleCard({ entry }: { entry: ChronicleDTO }) {
  const { showError } = useToast();
  const like = useToggleChronicleLike();
  const pendingTags = entry.tagged.filter((t) => t.pending);
  const shownTags = entry.tagged.filter((t) => !t.pending);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      {entry.photoUrl ? (
        <div className="aspect-[16/8] w-full overflow-hidden bg-surface-muted">
          {/* Remote https photos from arbitrary hosts; next/image would need every host allow-listed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.photoUrl} alt={entry.title} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>
            {[entry.groupName, dateFmt.format(new Date(entry.createdAt)), entry.city].filter(Boolean).join(" · ")}
          </span>
          <span className="inline-flex items-center gap-1 text-tavern">
            <ShieldCheck className="h-3.5 w-3.5" />
            {VISIBILITY_LABELS[entry.visibility]}
          </span>
        </div>

        <h3 className="font-display text-xl font-bold text-ink">{entry.title}</h3>

        {entry.officialDecision ? (
          <div className="rounded-xl bg-surface-muted/75 p-3.5 text-sm text-ink">
            <p className="mb-1 text-xs font-semibold text-burgundy">Официално решение на Съвета</p>
            <p className="font-medium">„{entry.officialDecision}“</p>
          </div>
        ) : null}

        {entry.story ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{entry.story}</p> : null}

        {shownTags.length > 0 || pendingTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span>На масата:</span>
            {shownTags.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-canvas py-0.5 pl-0.5 pr-2.5 text-ink">
                <Avatar user={t} />
                {t.nickname}
              </span>
            ))}
            {pendingTags.map((t) => (
              <span
                key={t.id}
                title="Чака съгласие — не се показва на другите"
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line py-0.5 pl-0.5 pr-2.5 opacity-70"
              >
                <Avatar user={t} />
                {t.nickname} · чака съгласие
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-line/70 pt-3 text-xs text-ink-muted">
          <span>Записал: {entry.author?.nickname ?? "изтрит профил"}</span>
          <button
            type="button"
            onClick={() => like.mutate(entry.id, { onError: showError })}
            aria-pressed={entry.likedByMe}
            aria-label="Харесвам"
            className={`inline-flex min-h-[36px] items-center gap-1.5 font-semibold ${
              entry.likedByMe ? "text-burgundy" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Heart className={`h-4 w-4 ${entry.likedByMe ? "fill-current" : ""}`} />
            <span className="font-mono tabular-nums">{entry.likes}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/** Shown for entries where the viewer is tagged and has not answered yet. */
export function TagConsentCard({ entry }: { entry: ChronicleDTO }) {
  const { show, showError } = useToast();
  const consent = useTagConsent();
  const answer = (accept: boolean) =>
    consent.mutate(
      { chronicleId: entry.id, accept },
      {
        onSuccess: (r) => show(r.status === "accepted" ? "Вече се показваш в записа." : "Отбелязването е махнато.", "success"),
        onError: showError,
      },
    );

  return (
    <div className="space-y-3 rounded-2xl border border-brass/50 bg-brass/10 p-4">
      <p className="flex items-start gap-2 text-sm text-ink">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <span>
          <strong>{entry.author?.nickname ?? "Някой"}</strong> те отбеляза в „{entry.title}“. Докато не потвърдиш, никой друг не
          вижда, че си бил там.
        </span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={consent.isPending}
          onClick={() => answer(true)}
          className="flex-1 rounded-lg bg-tavern py-2 text-xs font-semibold text-canvas disabled:opacity-60"
        >
          Съгласен съм
        </button>
        <button
          type="button"
          disabled={consent.isPending}
          onClick={() => answer(false)}
          className="flex-1 rounded-lg border border-line bg-surface py-2 text-xs font-semibold text-ink disabled:opacity-60"
        >
          Махни ме
        </button>
      </div>
    </div>
  );
}
