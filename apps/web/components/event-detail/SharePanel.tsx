"use client";

import Link from "next/link";
import { ArrowLeft, Flag, Share2 } from "lucide-react";
import type { PublicEvent } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";

import { shareableUrl } from "./helpers";

/** Top action row: back, share / invite link, report (phase 3). */
export function SharePanel({ event }: { event: PublicEvent }) {
  const { show } = useToast();

  const share = async () => {
    const url = shareableUrl(window.location.origin, event);
    if (!url) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: event.title, text: `Ела на „${event.title}“`, url });
        return;
      } catch (err) {
        // The user closed the share sheet: nothing to do.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show("Линкът за покана е копиран. Прати го на дружината!", "success");
    } catch {
      show(`Покана: ${url}`);
    }
  };

  // Organiser always has the invite link; others only for public events.
  const canShare = Boolean(event.inviteCode) || (!event.isPrivate && !event.friendsOnly);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/feed"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Назад към сбирките</span>
      </Link>

      <div className="flex items-center gap-2">
        {canShare && !event.isCancelled && (
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface-muted"
          >
            <Share2 className="h-3.5 w-3.5 text-tavern" />
            <span>{event.inviteCode ? "Покани с линк" : "Сподели"}</span>
          </button>
        )}

        {!event.viewerIsOrganizer && (
          <button
            type="button"
            onClick={() => show("Скоро: сигналите за модерация идват в следващата версия.")}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-muted hover:text-burgundy"
            aria-label="Докладвай сбирката"
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Докладвай</span>
          </button>
        )}
      </div>
    </div>
  );
}
