"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, SearchX, UserCheck, Utensils, Vote } from "lucide-react";
import type { Me } from "@hp1/shared";

import { useEvent } from "@/hooks/api/events";
import { useContributions, usePolls } from "@/hooks/api/social";
import { getJson } from "@/lib/api/client";

import { Attendees } from "./Attendees";
import { Chat } from "./Chat";
import { Contributions } from "./Contributions";
import { Header } from "./Header";
import { canAccessPrivate, groupAttendees, isNotFoundError, viewerSummary } from "./helpers";
import { LockedTeaser } from "./LockedTeaser";
import { OrganizerTools } from "./OrganizerTools";
import { Polls } from "./Polls";
import { RsvpPanel } from "./RsvpPanel";
import { SharePanel } from "./SharePanel";
import { EventDetailSkeleton } from "./Skeleton";
import { VenueBlock } from "./VenueBlock";

type Section = "details" | "chat" | "polls" | "meze";

export function EventDetail({ id, inviteCode }: { id: string; inviteCode?: string }) {
  const eventQuery = useEvent(id, inviteCode);
  const me = useQuery({ queryKey: ["me"], queryFn: () => getJson<Me>("/api/me") });
  const [section, setSection] = useState<Section>("details");

  const event = eventQuery.data;
  const access = event ? canAccessPrivate(event) : false;
  // Counts for the tab labels; same cache entries the panels use.
  const polls = usePolls(id, { enabled: access });
  const contributions = useContributions(id, { enabled: access });

  if (eventQuery.isPending) return <EventDetailSkeleton />;
  // A failed background refetch keeps showing the cached event.
  if (!event) {
    return isNotFoundError(eventQuery.error) ? <EventNotFound /> : <LoadError onRetry={() => void eventQuery.refetch()} />;
  }

  const groups = groupAttendees(event.attendees);
  const mine = me.data ? event.attendees?.find((a) => a.id === me.data.id) : undefined;
  const viewer = viewerSummary(me.data, event.attendees);
  const readOnly = event.isCancelled;
  const pending = event.myStatus === "pending_approval";

  const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Детайли и участници", icon: <UserCheck className="h-4 w-4" /> },
    { id: "chat", label: "Казанът къкри", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "polls", label: `Съдът на мезето${polls.data ? ` (${polls.data.length})` : ""}`, icon: <Vote className="h-4 w-4" /> },
    {
      id: "meze",
      label: `Кой какво носи?${contributions.data ? ` (${contributions.data.length})` : ""}`,
      icon: <Utensils className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <SharePanel event={event} />

      <Header event={event}>
        {!readOnly && !event.viewerIsOrganizer && <RsvpPanel event={event} mine={mine} inviteCode={inviteCode} />}
      </Header>

      <div role="tablist" aria-label="Раздели на сбирката" className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={section === t.id}
            onClick={() => setSection(t.id)}
            className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              section === t.id ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {section === "details" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <VenueBlock event={event} />
            {event.viewerIsOrganizer && !readOnly && <OrganizerTools event={event} pending={groups.pending} />}
          </div>
          <div className="lg:col-span-5">
            <Attendees event={event} groups={groups} meId={me.data?.id} />
          </div>
        </div>
      )}

      {section === "chat" &&
        (access ? (
          <Chat eventId={event.id} viewer={viewer} isOrganizer={event.viewerIsOrganizer} readOnly={readOnly} />
        ) : (
          <LockedTeaser title="Чатът „Казанът къкри“" pending={pending} />
        ))}

      {section === "polls" &&
        (access ? (
          <Polls eventId={event.id} isOrganizer={event.viewerIsOrganizer} readOnly={readOnly} />
        ) : (
          <LockedTeaser title="Съдът на мезето" pending={pending} />
        ))}

      {section === "meze" &&
        (access ? (
          <Contributions eventId={event.id} viewer={viewer} isOrganizer={event.viewerIsOrganizer} readOnly={readOnly} />
        ) : (
          <LockedTeaser title="Списъкът „Кой какво носи?“" pending={pending} />
        ))}
    </div>
  );
}

function EventNotFound() {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
      <SearchX className="mx-auto h-10 w-10 text-burgundy" />
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">Сбирката не е намерена или е частна</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Може да е изтрита, а частните сбирки се отварят само с линк за покана от организатора.
      </p>
      <Link href="/feed" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-tavern px-4 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover">
        Към сбирките
      </Link>
    </section>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-bold text-ink">Сбирката не се зареди</h1>
      <p className="mt-2 text-sm text-ink-muted">Провери връзката и опитай пак.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-tavern px-4 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover"
      >
        Опитай отново
      </button>
    </section>
  );
}
