"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useGroup } from "@/hooks/api/community";
import { ApiError } from "@/lib/api/client";

import { GroupCard } from "./group-card";
import { EmptyState, ErrorState, Skeleton } from "./ui";

export function GroupDetail({ id }: { id: string }) {
  const group = useGroup(id);

  return (
    <div className="space-y-5">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Всички дружини
      </Link>
      {group.isPending ? (
        <Skeleton className="h-96" />
      ) : group.isError ? (
        group.error instanceof ApiError && group.error.status === 404 ? (
          <EmptyState title="Няма такава дружина">Може да е разпусната или линкът е грешен.</EmptyState>
        ) : (
          <ErrorState error={group.error} onRetry={() => void group.refetch()} />
        )
      ) : (
        <GroupCard group={group.data} detailed />
      )}
    </div>
  );
}
