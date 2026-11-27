"use client";

import { useState } from "react";
import type { AttendeeDTO, PublicEvent, UpdateEventInput } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";
import { useCancelEvent, useDecideAttendee, useUpdateEvent } from "@/hooks/api/events";

import { Avatar } from "./Avatar";
import { roleTitle, toLocalInputValue } from "./helpers";

/** Organiser only: pending requests, venue/time change, cancel. Hidden for cancelled events. */
export function OrganizerTools({ event, pending }: { event: PublicEvent; pending: AttendeeDTO[] }) {
  const { show, showError } = useToast();
  const decide = useDecideAttendee(event.id);
  const cancel = useCancelEvent(event.id);
  const [editing, setEditing] = useState(false);

  const onCancel = () => {
    if (!window.confirm("Да отменим ли сбирката? Всички участници ще бъдат уведомени.")) return;
    cancel.mutate(undefined, {
      onSuccess: () => show("Сбирката е отменена. Дружината е уведомена."),
      onError: (err) => showError(err),
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-bold text-ink">Контрол на организатора</h3>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-burgundy">Чакащи одобрение ({pending.length})</p>
          {pending.map((att) => (
            <div key={att.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={att} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{att.nickname}</p>
                  {roleTitle(att.roleId) && <p className="truncate text-xs text-ink-muted">{roleTitle(att.roleId)}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ userId: att.id, action: "approve" }, { onError: (err) => showError(err) })}
                  className="rounded-lg bg-tavern px-3 py-1.5 text-xs font-semibold text-canvas disabled:opacity-50"
                >
                  Одобри
                </button>
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ userId: att.id, action: "reject" }, { onError: (err) => showError(err) })}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-burgundy disabled:opacity-50"
                >
                  Откажи
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-line/70 pt-3">
        {editing ? (
          <EditForm event={event} onDone={() => setEditing(false)} />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-tavern hover:underline">
            Смени мястото или часа
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
        <span className="text-xs text-ink-muted">Ако плановете пропаднат, уведоми всички автоматично.</span>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancel.isPending}
          className="whitespace-nowrap rounded-xl border border-burgundy px-3.5 py-2 text-xs font-semibold text-burgundy transition-colors hover:bg-burgundy hover:text-canvas disabled:opacity-50"
        >
          Отмени сбирката
        </button>
      </div>
    </div>
  );
}

function EditForm({ event, onDone }: { event: PublicEvent; onDone: () => void }) {
  const { show, showError } = useToast();
  const update = useUpdateEvent(event.id);
  const [venueName, setVenueName] = useState(event.venueName);
  const [address, setAddress] = useState(event.exactAddress ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(event.startsAt));
  const [description, setDescription] = useState(event.description);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: UpdateEventInput = {};
    if (venueName.trim() !== event.venueName) patch.venueName = venueName.trim();
    if (address.trim() !== (event.exactAddress ?? "")) patch.exactAddress = address.trim();
    if (startsAt && startsAt !== toLocalInputValue(event.startsAt)) patch.startsAt = new Date(startsAt).toISOString();
    if (description.trim() !== event.description) patch.description = description.trim();
    if (Object.keys(patch).length === 0) return onDone();
    update.mutate(patch, {
      onSuccess: () => {
        show("Промяната е запазена. Дружината е уведомена в чата.", "success");
        onDone();
      },
      onError: (err) => showError(err),
    });
  };

  const field = "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink";
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-semibold text-ink-muted">
        Място
        <input type="text" required maxLength={100} value={venueName} onChange={(e) => setVenueName(e.target.value)} className={`mt-1 ${field}`} />
      </label>
      <label className="block text-xs font-semibold text-ink-muted">
        Точен адрес
        <input type="text" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Нов точен адрес" className={`mt-1 ${field}`} />
      </label>
      <label className="block text-xs font-semibold text-ink-muted">
        Начало
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`mt-1 ${field}`} />
      </label>
      <label className="block text-xs font-semibold text-ink-muted">
        Описание
        <textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${field}`} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={update.isPending} className="rounded-lg bg-tavern px-4 py-2 text-xs font-semibold text-canvas disabled:opacity-50">
          Запази и уведоми в чата
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-muted">
          Отказ
        </button>
      </div>
    </form>
  );
}
