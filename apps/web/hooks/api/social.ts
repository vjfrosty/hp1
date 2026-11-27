"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  AddContributionInput,
  ChatMessageDTO,
  ContributionDTO,
  ContributionsResponse,
  CreatePollInput,
  MessagesResponse,
  PinResponse,
  PollDTO,
  PollsResponse,
  ReactionsResponse,
  SendMessageInput,
  UpdateContributionInput,
  UserSummary,
} from "@hp1/shared";

import { getJson, sendJson } from "@/lib/api/client";
import { applyVote, nextContributionState, toggleReactionList } from "@/lib/social/logic";

// ─── query keys ──────────────────────────────────────────────────────────────

export const socialKeys = {
  chat: (eventId: string) => ["chat", eventId] as const,
  polls: (eventId: string) => ["polls", eventId] as const,
  contributions: (eventId: string) => ["contributions", eventId] as const,
};

const base = (eventId: string) => `/api/events/${encodeURIComponent(eventId)}`;

/** Snapshot + cancel in-flight refetches before an optimistic write; returns a rollback. */
async function optimistic<T>(qc: QueryClient, key: QueryKey, update: (old: T) => T): Promise<() => void> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T>(key);
  if (previous !== undefined) qc.setQueryData<T>(key, update(previous));
  return () => qc.setQueryData<T>(key, previous);
}

// ─── chat ────────────────────────────────────────────────────────────────────

/**
 * Event chat. Polls every 4 s only while `enabled` (chat open) and the tab is
 * visible; each poll refetches the latest page (simple and always consistent
 * with pins, reactions and moderation).
 */
export function useChat(eventId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: socialKeys.chat(eventId),
    queryFn: () => getJson<MessagesResponse>(`${base(eventId)}/messages`),
    select: (data) => data.messages,
    enabled: enabled && Boolean(eventId),
    staleTime: 0,
    refetchInterval: enabled ? 4000 : false,
    refetchIntervalInBackground: false,
  });
}

/** Sends a message with an optimistic append (temp id), replaced on success, rolled back on error. */
export function useSendMessage(eventId: string, viewer?: UserSummary | null) {
  const qc = useQueryClient();
  const key = socialKeys.chat(eventId);
  return useMutation({
    mutationFn: (input: SendMessageInput) => sendJson<ChatMessageDTO>(`${base(eventId)}/messages`, "POST", input),
    onMutate: async (input) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const temp: ChatMessageDTO = {
        id: tempId,
        sender: viewer ?? null,
        text: input.text?.trim() ?? "",
        createdAt: new Date().toISOString(),
        isSystem: false,
        isPinned: false,
        sticker: input.sticker ?? null,
        locationCard: null,
        reactions: [],
      };
      const rollback = await optimistic<MessagesResponse>(qc, key, (old) => ({ messages: [...old.messages, temp] }));
      return { tempId, rollback };
    },
    onSuccess: (message, _input, ctx) => {
      qc.setQueryData<MessagesResponse>(key, (old) => {
        if (!old) return old;
        const rest = old.messages.filter((m) => m.id !== ctx?.tempId && m.id !== message.id);
        return { messages: [...rest, message] };
      });
    },
    onError: (_err, _input, ctx) => ctx?.rollback(),
  });
}

/** Toggles the viewer's reaction (optimistic). */
export function useToggleReaction(eventId: string) {
  const qc = useQueryClient();
  const key = socialKeys.chat(eventId);
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      sendJson<ReactionsResponse>(`${base(eventId)}/messages/${encodeURIComponent(messageId)}/reactions`, "POST", { emoji }),
    onMutate: async ({ messageId, emoji }) => ({
      rollback: await optimistic<MessagesResponse>(qc, key, (old) => ({
        messages: old.messages.map((m) => (m.id === messageId ? { ...m, reactions: toggleReactionList(m.reactions, emoji) } : m)),
      })),
    }),
    onSuccess: (res) => {
      qc.setQueryData<MessagesResponse>(key, (old) =>
        old && { messages: old.messages.map((m) => (m.id === res.messageId ? { ...m, reactions: res.reactions } : m)) },
      );
    },
    onError: (_err, _vars, ctx) => ctx?.rollback(),
  });
}

/** Organiser only: pins or unpins a message. */
export function useTogglePin(eventId: string) {
  const qc = useQueryClient();
  const key = socialKeys.chat(eventId);
  return useMutation({
    mutationFn: (messageId: string) =>
      sendJson<PinResponse>(`${base(eventId)}/messages/${encodeURIComponent(messageId)}/pin`, "POST"),
    onSuccess: (res) => {
      qc.setQueryData<MessagesResponse>(key, (old) =>
        old && { messages: old.messages.map((m) => (m.id === res.messageId ? { ...m, isPinned: res.isPinned } : m)) },
      );
    },
  });
}

// ─── polls ───────────────────────────────────────────────────────────────────

export function usePolls(eventId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: socialKeys.polls(eventId),
    queryFn: () => getJson<PollsResponse>(`${base(eventId)}/polls`),
    select: (data) => data.polls,
    enabled: enabled && Boolean(eventId),
  });
}

export function useCreatePoll(eventId: string) {
  const qc = useQueryClient();
  const key = socialKeys.polls(eventId);
  return useMutation({
    mutationFn: (input: CreatePollInput) => sendJson<PollDTO>(`${base(eventId)}/polls`, "POST", input),
    onSuccess: (poll) => {
      qc.setQueryData<PollsResponse>(key, (old) => old && { polls: [poll, ...old.polls.filter((p) => p.id !== poll.id)] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Votes (or moves the vote) with an optimistic count update. */
export function useVote(eventId: string) {
  const qc = useQueryClient();
  const key = socialKeys.polls(eventId);
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      sendJson<PollDTO>(`${base(eventId)}/polls/${encodeURIComponent(pollId)}/vote`, "POST", { optionId }),
    onMutate: async ({ pollId, optionId }) => ({
      rollback: await optimistic<PollsResponse>(qc, key, (old) => ({
        polls: old.polls.map((p) => {
          if (p.id !== pollId) return p;
          const options = applyVote(p.options, optionId);
          return { ...p, options, totalVotes: options.reduce((s, o) => s + o.votes, 0) };
        }),
      })),
    }),
    onSuccess: (poll) => {
      qc.setQueryData<PollsResponse>(key, (old) => old && { polls: old.polls.map((p) => (p.id === poll.id ? poll : p)) });
    },
    onError: (_err, _vars, ctx) => ctx?.rollback(),
  });
}

// ─── contributions ───────────────────────────────────────────────────────────

export function useContributions(eventId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: socialKeys.contributions(eventId),
    queryFn: () => getJson<ContributionsResponse>(`${base(eventId)}/contributions`),
    select: (data) => data.contributions,
    enabled: enabled && Boolean(eventId),
  });
}

export function useAddContribution(eventId: string) {
  const qc = useQueryClient();
  const key = socialKeys.contributions(eventId);
  return useMutation({
    mutationFn: (input: AddContributionInput) => sendJson<ContributionDTO>(`${base(eventId)}/contributions`, "POST", input),
    onSuccess: (c) => {
      qc.setQueryData<ContributionsResponse>(
        key,
        (old) => old && { contributions: [...old.contributions.filter((x) => x.id !== c.id), c] },
      );
    },
  });
}

/**
 * Moves a meze item. `{action: 'cycle'}` free -> claimed by me -> done -> free,
 * or `{action: 'set', status}`. Optimistic when `viewer` is given; the server
 * enforces who may move it and the response replaces the guess.
 */
export function useCycleContribution(eventId: string, viewer?: UserSummary | null, isOrganizer = false) {
  const qc = useQueryClient();
  const key = socialKeys.contributions(eventId);
  return useMutation({
    mutationFn: ({ contributionId, ...input }: { contributionId: string } & UpdateContributionInput) =>
      sendJson<ContributionDTO>(`${base(eventId)}/contributions/${encodeURIComponent(contributionId)}`, "PATCH", input),
    onMutate: async ({ contributionId, ...input }) => {
      if (!viewer) return { rollback: () => {} };
      const target = input.action === "set" ? input.status : undefined;
      return {
        rollback: await optimistic<ContributionsResponse>(qc, key, (old) => ({
          contributions: old.contributions.map((c) => {
            if (c.id !== contributionId) return c;
            const move = nextContributionState(
              { status: c.status, assigneeId: c.assignee?.id ?? null },
              viewer.id,
              isOrganizer,
              target,
            );
            if (!move.ok) return c;
            const assignee = move.next.assigneeId === null ? null : move.next.assigneeId === viewer.id ? viewer : c.assignee;
            return { ...c, status: move.next.status, assignee };
          }),
        })),
      };
    },
    onSuccess: (updated) => {
      qc.setQueryData<ContributionsResponse>(
        key,
        (old) => old && { contributions: old.contributions.map((c) => (c.id === updated.id ? updated : c)) },
      );
    },
    onError: (_err, _vars, ctx) => {
      ctx?.rollback();
      // A 409 means someone else moved it; show the real state.
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
