"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Me } from "@hp1/shared";

import { AgeGateModal } from "@/components/AgeGateModal";
import { getJson, sendJson } from "@/lib/api/client";

/**
 * Shows the 18+ modal until the server has recorded the confirmation. The
 * flag lives in `users.age_confirmed_at`, not localStorage (fixes G4).
 */
export function AgeGate() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getJson<Me>("/api/me") });
  const confirm = useMutation({
    mutationFn: () => sendJson<Me>("/api/me/age-confirmation", "POST", { confirmed: true }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });

  if (!me.data || me.data.ageConfirmed) return null;
  return <AgeGateModal onConfirm={() => confirm.mutate()} />;
}
