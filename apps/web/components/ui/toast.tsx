"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { isSessionExpired } from "@/lib/api/client";

type Tone = "info" | "success" | "error";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<{ show: (text: string, tone?: Tone) => void; showError: (error: unknown) => void } | null>(null);

/**
 * App-wide toasts (replaces legacy useAppStore.showToast). `showError` turns a
 * SessionExpiredError into the sign-in prompt text and any other error into its message.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const showError = useCallback(
    (error: unknown) => {
      if (isSessionExpired(error)) return show(error.message, "error");
      show(error instanceof Error ? error.message : "Нещо се обърка. Опитайте отново.", "error");
    },
    [show],
  );
  return (
    <ToastContext.Provider value={{ show, showError }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${
              t.tone === "error" ? "bg-burgundy text-canvas" : t.tone === "success" ? "bg-tavern text-canvas" : "bg-ink text-canvas"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
