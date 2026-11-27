"use client";

import { useState } from "react";
import { Check, Gavel, Plus, X } from "lucide-react";
import type { PollDTO } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";
import { useCreatePoll, usePolls, useVote } from "@/hooks/api/social";

import { cleanPollOptions, displayName, pollVerdict, votePercent } from "./helpers";

const MAX_OPTIONS = 6;

/** "Съдът на мезето" — polls; the organiser may file an official court ruling. */
export function Polls({ eventId, isOrganizer, readOnly }: { eventId: string; isOrganizer: boolean; readOnly: boolean }) {
  const { showError } = useToast();
  const polls = usePolls(eventId);
  const vote = useVote(eventId);
  const [creating, setCreating] = useState(false);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Съдът на мезето</h2>
          <p className="text-sm text-ink-muted">Дружината гласува предварително — решението влиза в официалния дневен ред.</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            aria-expanded={creating}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-tavern px-4 py-2.5 text-xs font-semibold text-canvas hover:bg-tavern-hover"
          >
            <Plus className="h-4 w-4" />
            <span>Нова анкета</span>
          </button>
        )}
      </div>

      {creating && !readOnly && <NewPollForm eventId={eventId} isOrganizer={isOrganizer} onDone={() => setCreating(false)} />}

      {polls.isPending && <p className="text-sm text-ink-muted">Съдът се събира…</p>}
      {polls.isError && <p className="text-sm text-burgundy">Анкетите не се заредиха.</p>}
      {polls.isSuccess && polls.data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
          Още няма дела пред Съда. Внеси първия въпрос.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {polls.data?.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            disabled={readOnly}
            onVote={(optionId) => vote.mutate({ pollId: poll.id, optionId }, { onError: (err) => showError(err) })}
          />
        ))}
      </div>
    </section>
  );
}

function PollCard({ poll, disabled, onVote }: { poll: PollDTO; disabled: boolean; onVote: (optionId: string) => void }) {
  const verdict = pollVerdict(poll);
  return (
    <article className="flex flex-col justify-between space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink">{poll.question}</h3>
          {poll.isOfficialCourt ? (
            <span className="tavern-stamp shrink-0 text-burgundy">
              <Gavel className="h-3 w-3" />
              СЪДЪТ
            </span>
          ) : (
            poll.totalVotes >= 2 && <span className="tavern-stamp shrink-0 text-tavern">ОДОБРЕНО</span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Внесено от {displayName(poll.createdBy)} · <span className="font-mono tabular-nums">{poll.totalVotes} гласа</span>
        </p>

        <div className="mt-4 space-y-2.5">
          {poll.options.map((opt) => {
            const pct = votePercent(opt.votes, poll.totalVotes);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                aria-pressed={opt.mine}
                onClick={() => onVote(opt.id)}
                className={`relative min-h-[48px] w-full overflow-hidden rounded-xl border p-3 text-left transition-colors disabled:cursor-default ${
                  opt.mine ? "border-tavern bg-tavern/5" : "border-line bg-canvas hover:border-tavern/50"
                }`}
              >
                <div className="absolute inset-y-0 left-0 bg-tavern/12 transition-all" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {opt.mine && <Check className="h-4 w-4 text-tavern" />}
                    {opt.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-ink-muted">
                    {opt.votes} ({pct}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {verdict && (
        <div className="border-t border-line/80 pt-3 text-xs leading-relaxed text-ink-muted">
          <strong className="text-ink">{poll.isOfficialCourt ? "Присъда на Съда:" : "Официално решение:"}</strong> „С{" "}
          <span className="font-mono font-semibold tabular-nums">{verdict.leaderVotes}</span> гласа ЗА и{" "}
          <span className="font-mono font-semibold tabular-nums">{verdict.otherVotes}</span> други/въздържали се, Съветът прие{" "}
          <strong>„{verdict.leaderLabel}“</strong> за задължителна точка от дневния ред.“
        </div>
      )}
    </article>
  );
}

function NewPollForm({ eventId, isOrganizer, onDone }: { eventId: string; isOrganizer: boolean; onDone: () => void }) {
  const { showError } = useToast();
  const create = useCreatePoll(eventId);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
  const [court, setCourt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanPollOptions(options);
    if (!cleaned.ok) return setError(cleaned.error);
    setError(null);
    create.mutate(
      { question: question.trim(), options: cleaned.options, ...(isOrganizer && court ? { isOfficialCourt: true } : {}) },
      { onSuccess: onDone, onError: (err) => showError(err) },
    );
  };

  const input = "rounded-xl border border-line bg-canvas px-3.5 py-2 text-sm text-ink";
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <input
        type="text"
        value={question}
        maxLength={200}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Въпрос (напр. Домашна или купешка туршия?)"
        aria-label="Въпрос"
        className={`w-full ${input}`}
        required
      />
      <div className="grid gap-2.5 sm:grid-cols-3">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="text"
              value={opt}
              maxLength={80}
              onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={i < 2 ? `Вариант ${i + 1}` : `Вариант ${i + 1} (по избор)`}
              aria-label={`Вариант ${i + 1}`}
              className={`min-w-0 flex-1 ${input}`}
              required={i < 2}
            />
            {i >= 3 && (
              <button
                type="button"
                onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                aria-label={`Махни вариант ${i + 1}`}
                className="p-1 text-ink-muted hover:text-burgundy"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < MAX_OPTIONS && (
        <button type="button" onClick={() => setOptions((o) => [...o, ""])} className="text-xs font-semibold text-tavern hover:underline">
          + Още вариант
        </button>
      )}
      {isOrganizer && (
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={court} onChange={(e) => setCourt(e.target.checked)} />
          Официално дело пред Съда на мезето (само организаторът)
        </label>
      )}
      {error && <p className="text-xs font-semibold text-burgundy">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-muted">
          Отказ
        </button>
        <button type="submit" disabled={create.isPending} className="rounded-xl bg-tavern px-4 py-2 text-xs font-semibold text-canvas disabled:opacity-50">
          Внеси в Съда
        </button>
      </div>
    </form>
  );
}
