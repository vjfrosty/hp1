import { Lock } from "lucide-react";

/** Shown instead of chat / polls / contributions to viewers who are not confirmed. */
export function LockedTeaser({ title, pending }: { title: string; pending: boolean }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-8 text-center">
      <Lock className="mx-auto h-8 w-8 text-burgundy" />
      <h2 className="mt-3 font-display text-xl font-bold text-ink">{title} е заключен</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        {pending
          ? "Заявката ти чака организатора. След одобрение ще видиш чата, анкетите, списъка с мезета и точния адрес."
          : "Достъпът е само за потвърдени участници. Натисни „Идвам!“ по-горе, за да седнеш на масата."}
      </p>
    </section>
  );
}
