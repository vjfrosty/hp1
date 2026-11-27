"use client";

/**
 * TanStack Query hooks for the community API (profile, groups + quorum,
 * chronicle, table wisdom, notifications).
 *
 * Query keys (`communityKeys`):
 *   ['me', 'profile']               useProfile           GET /api/me/profile
 *   ['groups']                      prefix of every group query
 *   ['groups', 'list', city|null]   useGroups(city)      GET /api/groups?city=
 *   ['groups', 'detail', id]        useGroup(id)         GET /api/groups/[id]
 *   ['chronicles']                  useChronicles        GET /api/chronicles
 *   ['wisdom']                      useWisdom            GET /api/wisdom
 *   ['notifications']               useNotifications     GET /api/notifications
 * ['me'] (AgeGate, GET /api/me) is invalidated after a profile update.
 */
import type {
  ChronicleDTO,
  ChronicleLikeResult,
  CreateChronicleInput,
  CreateGroupInput,
  CreateQuorumSlotInput,
  CreateWisdomInput,
  GroupDTO,
  NotificationsResponse,
  ProfileDTO,
  ProfilePatchInput,
  TagConsentResult,
  WisdomDTO,
} from "@hp1/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";

import { getJson, sendJson } from "@/lib/api/client";

export const communityKeys = {
  profile: ["me", "profile"] as const,
  groups: ["groups"] as const,
  groupList: (city?: string | null) => ["groups", "list", city ?? null] as const,
  group: (id: string) => ["groups", "detail", id] as const,
  chronicles: ["chronicles"] as const,
  wisdom: ["wisdom"] as const,
  notifications: ["notifications"] as const,
};

type Snapshot = [QueryKey, unknown][];

function restore(qc: QueryClient, snapshot: Snapshot | undefined) {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

/** Applies `fn` to one group in every cached group list and detail. */
function patchGroup(qc: QueryClient, id: string, fn: (g: GroupDTO) => GroupDTO) {
  qc.setQueriesData<GroupDTO[] | GroupDTO>({ queryKey: communityKeys.groups }, (old) => {
    if (!old) return old;
    if (Array.isArray(old)) return old.map((g) => (g.id === id ? fn(g) : g));
    return old.id === id ? fn(old) : old;
  });
}

async function snapshotGroups(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: communityKeys.groups });
  return qc.getQueriesData({ queryKey: communityKeys.groups });
}

// ─── profile ─────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({ queryKey: communityKeys.profile, queryFn: () => getJson<ProfileDTO>("/api/me/profile") });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatchInput) => sendJson<ProfileDTO>("/api/me/profile", "PATCH", patch),
    onSuccess: (profile) => {
      qc.setQueryData(communityKeys.profile, profile);
      void qc.invalidateQueries({ queryKey: ["me"], exact: true });
    },
  });
}

// ─── groups & quorum ─────────────────────────────────────────────────────────

export function useGroups(city?: string | null) {
  return useQuery({
    queryKey: communityKeys.groupList(city),
    queryFn: () => getJson<GroupDTO[]>(city ? `/api/groups?city=${encodeURIComponent(city)}` : "/api/groups"),
  });
}

export function useGroup(id: string | null | undefined) {
  return useQuery({
    queryKey: communityKeys.group(id ?? ""),
    queryFn: () => getJson<GroupDTO>(`/api/groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => sendJson<GroupDTO>("/api/groups", "POST", input),
    onSuccess: (group) => {
      qc.setQueryData(communityKeys.group(group.id), group);
      void qc.invalidateQueries({ queryKey: [...communityKeys.groups, "list"] });
    },
  });
}

/** Optimistic join/leave toggle. `mutate()` takes no arguments. */
export function useToggleMembership(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<GroupDTO>(`/api/groups/${id}/membership`, "POST"),
    onMutate: async () => {
      const snapshot = await snapshotGroups(qc);
      patchGroup(qc, id, (g) => ({
        ...g,
        isMember: !g.isMember,
        memberCount: Math.max(0, g.memberCount + (g.isMember ? -1 : 1)),
      }));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snapshot),
    onSuccess: (group) => patchGroup(qc, id, () => group),
    onSettled: () => qc.invalidateQueries({ queryKey: communityKeys.groups }),
  });
}

export function useCreateQuorumSlot(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuorumSlotInput) => sendJson<GroupDTO>(`/api/groups/${groupId}/quorum-slots`, "POST", input),
    onSuccess: (group) => patchGroup(qc, groupId, () => group),
  });
}

/** Optimistic vote toggle. `mutate(slotId)`. */
export function useVoteQuorum(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => sendJson<GroupDTO>(`/api/groups/${groupId}/quorum-slots/${slotId}/vote`, "POST"),
    onMutate: async (slotId) => {
      const snapshot = await snapshotGroups(qc);
      patchGroup(qc, groupId, (g) => ({
        ...g,
        quorumSlots: g.quorumSlots.map((s) => {
          if (s.id !== slotId) return s;
          const votes = Math.max(0, s.votes + (s.mine ? -1 : 1));
          return { ...s, mine: !s.mine, votes, reached: votes >= g.quorumRequired };
        }),
      }));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snapshot),
    onSuccess: (group) => {
      patchGroup(qc, groupId, () => group);
      // Reaching quorum creates a notification for the voter too.
      void qc.invalidateQueries({ queryKey: communityKeys.notifications });
    },
  });
}

// ─── chronicle ───────────────────────────────────────────────────────────────

export function useChronicles() {
  return useQuery({ queryKey: communityKeys.chronicles, queryFn: () => getJson<ChronicleDTO[]>("/api/chronicles") });
}

export function useCreateChronicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChronicleInput) => sendJson<ChronicleDTO>("/api/chronicles", "POST", input),
    onSuccess: (entry) => {
      qc.setQueryData<ChronicleDTO[]>(communityKeys.chronicles, (old) => (old ? [entry, ...old] : old));
      void qc.invalidateQueries({ queryKey: communityKeys.chronicles });
    },
  });
}

/** Optimistic like toggle. `mutate(chronicleId)`. */
export function useToggleChronicleLike() {
  const qc = useQueryClient();
  const patch = (id: string, fn: (c: ChronicleDTO) => ChronicleDTO) =>
    qc.setQueryData<ChronicleDTO[]>(communityKeys.chronicles, (old) => old?.map((c) => (c.id === id ? fn(c) : c)));
  return useMutation({
    mutationFn: (chronicleId: string) => sendJson<ChronicleLikeResult>(`/api/chronicles/${chronicleId}/like`, "POST"),
    onMutate: async (chronicleId) => {
      await qc.cancelQueries({ queryKey: communityKeys.chronicles });
      const previous = qc.getQueryData<ChronicleDTO[]>(communityKeys.chronicles);
      patch(chronicleId, (c) => ({ ...c, likedByMe: !c.likedByMe, likes: Math.max(0, c.likes + (c.likedByMe ? -1 : 1)) }));
      return { previous };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(communityKeys.chronicles, ctx?.previous),
    onSuccess: (result, chronicleId) => patch(chronicleId, (c) => ({ ...c, likedByMe: result.liked, likes: result.likes })),
  });
}

/** `mutate({ chronicleId, accept })` — approve or remove your own tag. */
export function useTagConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chronicleId, accept }: { chronicleId: string; accept: boolean }) =>
      sendJson<TagConsentResult>(`/api/chronicles/${chronicleId}/tag-consent`, "POST", { accept }),
    onSettled: () => qc.invalidateQueries({ queryKey: communityKeys.chronicles }),
  });
}

// ─── table wisdom ────────────────────────────────────────────────────────────

export function useWisdom() {
  return useQuery({ queryKey: communityKeys.wisdom, queryFn: () => getJson<WisdomDTO[]>("/api/wisdom") });
}

export function useAddWisdom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWisdomInput) => sendJson<WisdomDTO>("/api/wisdom", "POST", input),
    onSuccess: (entry) => {
      qc.setQueryData<WisdomDTO[]>(communityKeys.wisdom, (old) => (old ? [entry, ...old] : old));
      void qc.invalidateQueries({ queryKey: communityKeys.wisdom });
    },
  });
}

// ─── notifications ───────────────────────────────────────────────────────────

/** Polls every 30 s while the tab is visible (TanStack pauses in background tabs). */
export function useNotifications() {
  return useQuery({
    queryKey: communityKeys.notifications,
    queryFn: () => getJson<NotificationsResponse>("/api/notifications"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

/** `mutate()` marks all as read; `mutate(ids)` only those. Optimistic. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | void) =>
      sendJson<{ unreadCount: number }>("/api/notifications/read", "POST", Array.isArray(ids) ? { ids } : {}),
    onMutate: async (maybeIds) => {
      const ids = Array.isArray(maybeIds) ? maybeIds : undefined;
      await qc.cancelQueries({ queryKey: communityKeys.notifications });
      const previous = qc.getQueryData<NotificationsResponse>(communityKeys.notifications);
      if (previous) {
        const hit = (id: string) => !ids || ids.includes(id);
        const items = previous.items.map((n) => (hit(n.id) ? { ...n, read: true } : n));
        const newlyRead = previous.items.filter((n) => !n.read && hit(n.id)).length;
        qc.setQueryData<NotificationsResponse>(communityKeys.notifications, {
          items,
          unreadCount: ids ? Math.max(0, previous.unreadCount - newlyRead) : 0,
        });
      }
      return { previous };
    },
    onError: (_e, _ids, ctx) => qc.setQueryData(communityKeys.notifications, ctx?.previous),
    onSuccess: ({ unreadCount }) =>
      qc.setQueryData<NotificationsResponse>(communityKeys.notifications, (old) => (old ? { ...old, unreadCount } : old)),
  });
}
