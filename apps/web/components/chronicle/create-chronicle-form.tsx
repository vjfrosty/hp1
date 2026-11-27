"use client";

import { BULGARIAN_CITIES, type ChronicleVisibility } from "@hp1/shared";
import { useMemo, useState } from "react";

import { CitySelect, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/groups/ui";
import { useToast } from "@/components/ui/toast";
import { useCreateChronicle, useGroups, useProfile } from "@/hooks/api/community";
import { useEvents } from "@/hooks/api/events";

import { buildChronicleInput, VISIBILITY_LABELS } from "./chronicle-form";

/** „Запиши решение“: a new chronicle entry. */
export function CreateChronicleForm({ onDone }: { onDone: () => void }) {
  const { show, showError } = useToast();
  const create = useCreateChronicle();
  const profile = useProfile();
  const groups = useGroups();
  const events = useEvents({ scope: "mine" });
  const me = profile.data?.id;

  // Only events the server accepts: organised by me or confirmed attendance.
  const myEvents = useMemo(
    () => (events.data ?? []).filter((e) => e.viewerIsOrganizer || e.myStatus === "confirmed"),
    [events.data],
  );
  const myGroups = useMemo(() => (groups.data ?? []).filter((g) => g.isMember), [groups.data]);

  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [cityChoice, setCityChoice] = useState<string | null>(null);
  const [officialDecision, setDecision] = useState("");
  const [story, setStory] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [visibility, setVisibility] = useState<ChronicleVisibility>("friends");
  const [consentConfirmed, setConsent] = useState(false);
  const [taggedUserIds, setTagged] = useState<string[]>([]);

  const event = myEvents.find((e) => e.id === eventId);
  const city = cityChoice ?? event?.city ?? profile.data?.city ?? BULGARIAN_CITIES[0].name;
  const taggable = (event?.attendees ?? []).filter((a) => a.status === "confirmed" && a.id !== me);
  const needsConsent = Boolean(photoUrl.trim()) || taggedUserIds.length > 0;

  const pickEvent = (id: string) => {
    setEventId(id);
    setTagged([]);
    const next = myEvents.find((e) => e.id === id);
    if (next && !title.trim()) setTitle(next.title);
    if (next?.groupId && myGroups.some((g) => g.id === next.groupId)) setGroupId(next.groupId);
  };

  const pickGroup = (id: string) => {
    setGroupId(id);
    if (!id && visibility === "group") setVisibility("friends");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildChronicleInput({
      title,
      eventId,
      groupId,
      city,
      officialDecision,
      story,
      photoUrl,
      visibility,
      consentConfirmed,
      taggedUserIds: taggedUserIds.filter((id) => taggable.some((a) => a.id === id)),
    });
    if (!built.ok) return show(built.error, "error");
    create.mutate(built.input, {
      onSuccess: (entry) => {
        show(
          entry.tagged.some((t) => t.pending)
            ? "Записано! Отбелязаните ще се покажат, щом потвърдят."
            : "Записано в летописа.",
          "success",
        );
        onDone();
      },
      onError: showError,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3.5 rounded-2xl border border-line bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="c-event" className={labelClass}>
            Сбирка (по желание)
          </label>
          <select id="c-event" value={eventId} onChange={(e) => pickEvent(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">Без конкретна сбирка</option>
            {myEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-title" className={labelClass}>
            Заглавие
          </label>
          <input
            id="c-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Име на миналата сбирка"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="c-group" className={labelClass}>
            Дружина
          </label>
          <select id="c-group" value={groupId} onChange={(e) => pickGroup(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">Без дружина</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-city" className={labelClass}>
            Град
          </label>
          <div className="mt-1">
            <CitySelect id="c-city" value={city} onChange={setCityChoice} cities={BULGARIAN_CITIES} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="c-decision" className={labelClass}>
          Официално решение
        </label>
        <input
          id="c-decision"
          value={officialDecision}
          maxLength={280}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="напр. Решихме проблема с паркирането..."
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor="c-story" className={labelClass}>
          Кратка история от вечерта
        </label>
        <textarea
          id="c-story"
          rows={3}
          value={story}
          maxLength={4000}
          onChange={(e) => setStory(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </div>

      <div>
        <label htmlFor="c-photo" className={labelClass}>
          Снимка (https адрес)
        </label>
        <input
          id="c-photo"
          type="url"
          inputMode="url"
          value={photoUrl}
          maxLength={2048}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
          className={`mt-1 ${inputClass}`}
        />
        <p className="mt-1 text-xs text-ink-muted">Качване на снимки от телефона — скоро.</p>
      </div>

      <div>
        <span className={labelClass}>Отбележи хора от масата</span>
        {!event ? (
          <p className="mt-1 text-xs text-ink-muted">Избери сбирка, на която си бил, за да отбележиш участниците.</p>
        ) : taggable.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">Няма други потвърдени участници в тази сбирка.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {taggable.map((a) => {
              const on = taggedUserIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTagged((xs) => (on ? xs.filter((x) => x !== a.id) : [...xs, a.id]))}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    on ? "bg-tavern text-canvas" : "border border-line bg-canvas text-ink-muted"
                  }`}
                >
                  {a.nickname}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-1 text-xs text-ink-muted">Всеки отбелязан ще бъде попитан и се показва чак след като се съгласи.</p>
      </div>

      <div className="grid items-center gap-3 sm:grid-cols-2">
        <select
          aria-label="Видимост"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ChronicleVisibility)}
          className={inputClass}
        >
          {(Object.keys(VISIBILITY_LABELS) as ChronicleVisibility[]).map((v) => (
            <option key={v} value={v} disabled={v === "group" && !groupId}>
              Видимост: {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={consentConfirmed}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#1C4532]"
          />
          <span>
            Потвърждавам, че всички споменати участници са съгласни.
            {needsConsent ? <strong className="text-burgundy"> Задължително за снимка или отбелязване.</strong> : null}
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryButton}>
          Отказ
        </button>
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          Публикувай в летописа
        </button>
      </div>
    </form>
  );
}
