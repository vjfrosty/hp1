"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pin, Send } from "lucide-react";
import { CHAT_REACTIONS, CHAT_STICKERS, MESSAGE_MAX_LENGTH, sofiaTime, type ChatMessageDTO, type UserSummary } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";
import { useChat, useSendMessage, useTogglePin, useToggleReaction } from "@/hooks/api/social";

import { displayName, stickerText } from "./helpers";

/** "Казанът къкри" — event chat. Render only for the organiser / confirmed attendees. */
export function Chat({
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
  const chat = useChat(eventId, { enabled: true });
  const send = useSendMessage(eventId, viewer);
  const react = useToggleReaction(eventId);
  const pin = useTogglePin(eventId);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const messages = chat.data ?? [];
  const pinned = messages.filter((m) => m.isPinned);
  const lastId = messages.at(-1)?.id;

  // Keep the newest message in view when one arrives.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  const onError = (err: unknown) => showError(err);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || readOnly) return;
    send.mutate({ text: value }, { onError });
    setText("");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      {pinned.length > 0 && (
        <div className="space-y-1.5 border-b border-line bg-surface-muted/75 px-5 py-3 text-xs">
          {pinned.map((m) => (
            <div key={m.id} className="flex items-start gap-2.5">
              <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" />
              <p>
                <span className="font-semibold text-ink">Закрепено от {m.isSystem ? "системата" : displayName(m.sender)}: </span>
                <span className="text-ink-muted">{m.text || stickerText(m.sticker) || (m.locationCard ? `📍 ${m.locationCard.venueName}` : "")}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div ref={feedRef} className="max-h-[460px] min-h-[200px] space-y-4 overflow-y-auto p-5" aria-live="polite">
        {chat.isPending && <p className="text-center text-sm text-ink-muted">Казанът се загрява…</p>}
        {chat.isError && <p className="text-center text-sm text-burgundy">Чатът не се зареди. Опитваме отново…</p>}
        {chat.isSuccess && messages.length === 0 && (
          <p className="text-center text-sm text-ink-muted">Казанът още не е закипял. Напиши първото съобщение.</p>
        )}
        {messages.map((msg) => (
          <Message
            key={msg.id}
            msg={msg}
            mine={Boolean(viewer && msg.sender?.id === viewer.id)}
            isOrganizer={isOrganizer}
            readOnly={readOnly}
            onReact={(emoji) => react.mutate({ messageId: msg.id, emoji }, { onError })}
            onPin={() => pin.mutate(msg.id, { onError })}
          />
        ))}
      </div>

      {readOnly ? (
        <p className="border-t border-line bg-canvas p-4 text-center text-xs text-ink-muted">Сбирката е отменена — чатът е само за четене.</p>
      ) : (
        <>
          {showStickers && (
            <div className="flex flex-wrap gap-2 border-t border-line bg-canvas px-4 py-3">
              {CHAT_STICKERS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    send.mutate({ sticker: st.id }, { onError });
                    setShowStickers(false);
                  }}
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-tavern"
                >
                  {st.symbol} {st.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-wrap items-center gap-2 border-t border-line bg-surface p-3.5">
            <button
              type="button"
              aria-expanded={showStickers}
              onClick={() => setShowStickers((s) => !s)}
              className="min-h-[44px] rounded-xl border border-line bg-canvas px-3 py-2.5 text-xs font-semibold text-ink hover:bg-surface-muted"
            >
              Стикери
            </button>
            <button
              type="button"
              onClick={() => send.mutate({ text: "Споделям точката за среща на масата:", locationCard: true }, { onError })}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-line bg-canvas p-2.5 text-tavern hover:bg-surface-muted"
              title="Сподели мястото на срещата"
              aria-label="Сподели мястото на срещата"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={text}
              maxLength={MESSAGE_MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напиши нещо в „Казанът къкри“..."
              aria-label="Съобщение"
              className="min-h-[44px] min-w-[160px] flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink focus:border-tavern focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-tavern px-4 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Изпрати</span>
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function Message({
  msg,
  mine,
  isOrganizer,
  readOnly,
  onReact,
  onPin,
}: {
  msg: ChatMessageDTO;
  mine: boolean;
  isOrganizer: boolean;
  readOnly: boolean;
  onReact: (emoji: string) => void;
  onPin: () => void;
}) {
  const time = sofiaTime(msg.createdAt);
  const temp = msg.id.startsWith("temp-");

  if (msg.isSystem) {
    return (
      <div className="text-center">
        <span className="inline-block rounded-lg bg-surface-muted px-3 py-1.5 text-xs text-ink-muted">
          {msg.text} · <span className="font-mono">{time}</span>
        </span>
      </div>
    );
  }

  const sticker = stickerText(msg.sticker);
  const present = new Set(msg.reactions.map((r) => r.emoji));
  const canAct = !readOnly && !temp;

  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} ${temp ? "opacity-60" : ""}`}>
      <div className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
        <span className={`font-semibold ${msg.sender ? "text-ink" : "italic"}`}>{displayName(msg.sender)}</span>
        <time dateTime={msg.createdAt} className="font-mono">
          {time}
        </time>
        {isOrganizer && canAct ? (
          <button
            type="button"
            onClick={onPin}
            className="hover:text-burgundy"
            title={msg.isPinned ? "Откачи" : "Закрепи съобщението"}
            aria-label={msg.isPinned ? "Откачи" : "Закрепи съобщението"}
          >
            <Pin className={`h-3 w-3 ${msg.isPinned ? "text-burgundy" : ""}`} />
          </button>
        ) : (
          msg.isPinned && <Pin aria-label="Закрепено" className="h-3 w-3 text-burgundy" />
        )}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[70%] ${
          mine ? "bg-tavern text-canvas" : "border border-line bg-canvas text-ink"
        }`}
      >
        {sticker && <div className="mb-1 text-base font-semibold">{sticker}</div>}
        {msg.text && <p className="whitespace-pre-line break-words">{msg.text}</p>}
        {msg.locationCard && (
          <div className={`mt-2 rounded-xl p-2.5 text-xs ${mine ? "bg-tavern-hover" : "bg-surface-muted"}`}>
            <div className="flex items-center gap-1.5 font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              <span>{msg.locationCard.venueName}</span>
            </div>
            <p className="mt-0.5 opacity-85">
              {msg.locationCard.city}, кв. {msg.locationCard.neighborhood}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {msg.reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            disabled={!canAct}
            onClick={() => onReact(r.emoji)}
            aria-pressed={r.mine}
            className={`rounded-lg border px-2 py-0.5 text-xs transition-colors ${
              r.mine ? "border-tavern bg-tavern/10 text-tavern" : "border-line bg-surface text-ink-muted"
            }`}
          >
            {r.emoji} <span className="font-mono tabular-nums">{r.count}</span>
          </button>
        ))}
        {canAct &&
          CHAT_REACTIONS.filter((em) => !present.has(em)).map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onReact(em)}
              className="px-1 text-xs opacity-45 hover:opacity-100"
              aria-label={`Реагирай с ${em}`}
            >
              {em}
            </button>
          ))}
      </div>
    </div>
  );
}
