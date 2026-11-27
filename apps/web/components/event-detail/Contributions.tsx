"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CONTRIBUTION_CATEGORIES, type ContributionCategory, type ContributionDTO, type UserSummary } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";
import { useAddContribution, useContributions, useCycleContribution } from "@/hooks/api/social";

import { displayName } from "./helpers";

const CATEGORY_LABEL: Record<ContributionCategory, string> = {
  салата: "Салата",
  мезе: "Мезе",
  скара: "Скара",
  напитки: "Напитки",
  логистика: "Логистика",
};

/** "Кой какво носи?" — meze board. */
export function Contributions({
  eventId,
  viewer,
  isOrganizer,
  readOnly,
}: {
  eventId: string;
  viewer: UserSummary | null;
  isOrganizer: boolean;
  readOnly: boolean;
}) {
  const { showError } = useToast();
  const list = useContributions(eventId);
  const move = useCycleContribution(eventId, viewer, isOrganizer);
  const add = useAddContribution(eventId);
  const [item, setItem] = useState("");
  const [category, setCategory] = useState<ContributionCategory>("мезе");

  const items = list.data ?? [];
  const taken = items.filter((c) => c.status !== "free").length;
  const missingSalad = items.some((c) => c.category === "салата" && c.status === "free");
  const onError = (err: unknown) => showError(err);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = item.trim();
    if (!value) return;
    add.mutate({ item: value, category }, { onSuccess: () => setItem(""), onError });
  };

  return (
    <section className="space-y-5">
      {missingSalad && !readOnly && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-burgundy/30 bg-burgundy/10 p-4 text-sm text-burgundy">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold">Внимание! Дружината е организирана, но краставиците още нямат отговорник.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Кой какво носи?</h2>
            <p className="text-xs text-ink-muted">Поеми задача, за да не остане масата без хляб или салфетки.</p>
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-tavern">
            {taken}/{items.length} поети
          </span>
        </div>

        {list.isPending && <p className="px-5 py-4 text-sm text-ink-muted">Броим мезетата…</p>}
        {list.isError && <p className="px-5 py-4 text-sm text-burgundy">Списъкът не се зареди.</p>}
        {list.isSuccess && items.length === 0 && <p className="px-5 py-4 text-sm text-ink-muted">Още няма задачи. Добави първата.</p>}

        <ul className="divide-y divide-line/70">
          {items.map((c) => (
            <Row
              key={c.id}
              c={c}
              mine={Boolean(viewer && c.assignee?.id === viewer.id)}
              isOrganizer={isOrganizer}
              readOnly={readOnly}
              busy={move.isPending}
              onCycle={() => move.mutate({ contributionId: c.id, action: "cycle" }, { onError })}
              onSet={(status) => move.mutate({ contributionId: c.id, action: "set", status }, { onError })}
            />
          ))}
        </ul>

        {!readOnly && (
          <form onSubmit={submit} className="flex flex-wrap gap-2.5 border-t border-line bg-canvas p-4">
            <input
              type="text"
              value={item}
              maxLength={100}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Добави нещо за масата (напр. Лед, Кьопоолу, Лимонада)..."
              aria-label="Ново мезе"
              className="min-h-[44px] min-w-[200px] flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContributionCategory)}
              aria-label="Категория"
              className="min-h-[44px] rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              {CONTRIBUTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABEL[cat]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={add.isPending || !item.trim()}
              className="min-h-[44px] rounded-xl bg-tavern px-4 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover disabled:opacity-50"
            >
              Добави
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Row({
  c,
  mine,
  isOrganizer,
  readOnly,
  busy,
  onCycle,
  onSet,
}: {
  c: ContributionDTO;
  mine: boolean;
  isOrganizer: boolean;
  readOnly: boolean;
  busy: boolean;
  onCycle: () => void;
  onSet: (status: "free" | "claimed" | "done") => void;
}) {
  const btn = "min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold disabled:opacity-50";
  const primary = `${btn} bg-tavern text-canvas hover:bg-tavern-hover`;
  const secondary = `${btn} border border-line text-ink-muted`;
  const name = displayName(c.assignee);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className={`text-sm font-semibold ${c.status === "done" ? "text-ink-muted line-through" : "text-ink"}`}>{c.item}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          <span className="capitalize">{c.category}</span>
          <span aria-hidden="true"> · </span>
          {c.status === "free" ? (
            <span className="font-medium text-burgundy">Свободна задача</span>
          ) : c.status === "done" ? (
            <span className="font-medium text-tavern">Изпълнена от {name}</span>
          ) : (
            <span>Поета от {name}</span>
          )}
        </p>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          {c.status === "free" && (
            <button type="button" disabled={busy} onClick={onCycle} className={primary}>
              Поемам аз
            </button>
          )}
          {c.status === "claimed" && mine && (
            <>
              <button type="button" disabled={busy} onClick={onCycle} className={`${primary} inline-flex items-center gap-1.5`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Готово е</span>
              </button>
              <button type="button" disabled={busy} onClick={() => onSet("free")} className={secondary}>
                Освободи
              </button>
            </>
          )}
          {c.status === "done" && mine && (
            <button type="button" disabled={busy} onClick={() => onSet("claimed")} className={secondary}>
              Върни в процес
            </button>
          )}
          {c.status !== "free" && !mine && isOrganizer && (
            <button type="button" disabled={busy} onClick={() => onSet("free")} className={secondary} title="Организаторът освобождава задачата">
              Освободи
            </button>
          )}
        </div>
      )}
    </li>
  );
}
