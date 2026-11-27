"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  CreateEventInput,
  DecideAttendeeInput,
  EventScope,
  PublicEvent,
  RsvpInput,
  UpdateEventInput,
} from "@hp1/shared";

import { getJson, sendJson } from "@/lib/api/client";
import { applyOptimisticRsvp } from "@/lib/events/rules";

export interface EventsFilter {
  city?: string;
  scope?: EventScope;
}

export const eventKeys = {
  /** Prefix of every list query. */
  lists: ["events"] as const,
  list: (f: EventsFilter) => ["events", { city: f.city ?? null, scope: f.scope ?? "feed" }] as const,
  detail: (id: string) => ["event", id] as const,
};

/** Puts a fresh event into its detail cache and every list that holds it. */
function storeEvent(qc: QueryClient, event: PublicEvent) {
  qc.setQueryData(eventKeys.detail(event.id), event);
  qc.setQueriesData<PublicEvent[]>({ queryKey: eventKeys.lists }, (list) =>
    list?.map((e) => (e.id === event.id ? event : e)),
  );
}

export function useEvents({ city, scope = "feed" }: EventsFilter = {}) {
  return useQuery({
    queryKey: eventKeys.list({ city, scope }),
    queryFn: () => {
      const qs = new URLSearchParams({ scope });
      if (city) qs.set("city", city);
      return getJson<PublicEvent[]>(`/api/events?${qs}`);
    },
  });
}

export function useEvent(id: string | undefined, inviteCode?: string) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () =>
      getJson<PublicEvent>(
        `/api/events/${encodeURIComponent(id!)}${inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : ""}`,
      ),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => sendJson<PublicEvent>("/api/events", "POST", input),
    onSuccess: (event) => {
      qc.setQueryData(eventKeys.detail(event.id), event);
      void qc.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateEventInput) => sendJson<PublicEvent>(`/api/events/${id}`, "PATCH", patch),
    onSuccess: (event) => {
      storeEvent(qc, event);
      void qc.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
}

export function useCancelEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<PublicEvent>(`/api/events/${id}/cancel`, "POST"),
    onSuccess: (event) => {
      storeEvent(qc, event);
      void qc.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
}

/** RSVP with an optimistic myStatus/counts update, rolled back on error (e.g. 409 full). */
export function useRsvp(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RsvpInput) => sendJson<PublicEvent>(`/api/events/${id}/rsvp`, "POST", input),
    onMutate: async (input) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: eventKeys.detail(id) }),
        qc.cancelQueries({ queryKey: eventKeys.lists }),
      ]);
      const detail = qc.getQueryData<PublicEvent>(eventKeys.detail(id));
      const lists = qc.getQueriesData<PublicEvent[]>({ queryKey: eventKeys.lists });
      if (detail) qc.setQueryData(eventKeys.detail(id), applyOptimisticRsvp(detail, input.status));
      for (const [key, list] of lists) {
        if (list) qc.setQueryData(key, list.map((e) => (e.id === id ? applyOptimisticRsvp(e, input.status) : e)));
      }
      return { detail, lists };
    },
    onError: (_err, _input, snapshot) => {
      if (!snapshot) return;
      qc.setQueryData(eventKeys.detail(id), snapshot.detail);
      for (const [key, list] of snapshot.lists) qc.setQueryData(key, list);
    },
    onSuccess: (event) => storeEvent(qc, event),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
}

/** Organiser approves / rejects a pending attendee. */
export function useDecideAttendee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, action }: { userId: string } & DecideAttendeeInput) =>
      sendJson<PublicEvent>(`/api/events/${id}/attendees/${userId}`, "POST", { action }),
    onSuccess: (event) => {
      storeEvent(qc, event);
      void qc.invalidateQueries({ queryKey: eventKeys.lists });
    },
  });
}
