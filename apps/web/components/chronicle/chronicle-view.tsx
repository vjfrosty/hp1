"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorState, SkeletonList, primaryButton, secondaryButton } from "@/components/groups/ui";
import { useChronicles } from "@/hooks/api/community";

import { ChronicleCard, TagConsentCard } from "./chronicle-card";
import { CreateChronicleForm } from "./create-chronicle-form";
import { WisdomPanel } from "./wisdom-panel";

/** „Летопис и мъдрости“ (legacy GroupsView, mode 'chronicle'). */
export function ChronicleView() {
  const chronicles = useChronicles();
  const [creating, setCreating] = useState(false);
  const pending = chronicles.data?.filter((c) => c.myTagPending) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Летопис и мъдрости</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Официални решения след сбирките и записани мисли от масата — само със съгласие на участниците.
          </p>
        </div>
        <Link href="/groups" className={`${secondaryButton} self-start`}>
          <Users className="h-4 w-4" />
          Дружини
        </Link>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-ink">Летопис на дружината</h2>
            <button type="button" onClick={() => setCreating((s) => !s)} className={primaryButton}>
              <Plus className="h-4 w-4" />
              Запиши решение
            </button>
          </div>

          {pending.length > 0 ? (
            <div className="space-y-3">
              {pending.map((c) => (
                <TagConsentCard key={c.id} entry={c} />
              ))}
            </div>
          ) : null}

          {creating ? <CreateChronicleForm onDone={() => setCreating(false)} /> : null}

          {chronicles.isPending ? (
            <SkeletonList count={3} className="h-56" />
          ) : chronicles.isError ? (
            <ErrorState error={chronicles.error} onRetry={() => void chronicles.refetch()} />
          ) : chronicles.data.length === 0 ? (
            <EmptyState title="Летописът е празен">Запиши първото официално решение от последната сбирка.</EmptyState>
          ) : (
            <div className="space-y-5">
              {chronicles.data.map((c) => (
                <ChronicleCard key={c.id} entry={c} />
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5">
          <WisdomPanel />
        </section>
      </div>
    </div>
  );
}
