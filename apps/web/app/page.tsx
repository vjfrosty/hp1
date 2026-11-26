import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { AFTER_SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth/config";

// Public landing page. Holds no user data.
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight">АЙДЕ ПО ЕДНА!</span>
        <UserMenu />
      </header>

      <section className="mt-10 grid flex-1 items-center gap-10 md:grid-cols-2">
        <div>
          <span className="tavern-stamp text-burgundy">18+ САМО</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-balance md:text-5xl">
            Не е важно колко е ракията. Важно е кой е на масата.
          </h1>
          <p className="mt-4 text-ink-muted">
            Организирай сбирка, събери компанията, разпредели мезето. Точният адрес вижда само
            одобрената дружина.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={AFTER_SIGN_IN_URL}
              className="rounded-xl bg-tavern px-5 py-3 text-sm font-semibold text-canvas hover:bg-tavern-hover"
            >
              Към сбирките
            </Link>
            <Link
              href={SIGN_UP_URL}
              className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-tavern hover:bg-surface-muted"
            >
              Регистрация
            </Link>
            <PWAInstallButton compact />
          </div>
        </div>
        <Image
          src="/images/hero_mehana_table_1795110175071.jpg"
          alt="Маса в механа с мезе"
          width={960}
          height={640}
          priority
          className="w-full rounded-2xl border border-line object-cover shadow-xl"
        />
      </section>
    </main>
  );
}
