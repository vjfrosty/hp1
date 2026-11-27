"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarPlus, Compass, User, Users } from "lucide-react";

import { UserMenu } from "@/components/auth/user-menu";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useNotifications } from "@/hooks/api/community";
import { NotificationsPanel } from "./NotificationsPanel";
import { TAB_HREF, mobileTabFor, tabForPath, type TabId } from "./nav";

const DESKTOP_LINKS: { id: TabId; label: string }[] = [
  { id: "feed", label: "Сбирки" },
  { id: "radar", label: "Радар" },
  { id: "groups", label: "Дружини" },
  { id: "chronicle", label: "Летопис" },
  { id: "profile", label: "Профил" },
];

const MOBILE_TABS: { id: TabId; label: string; Icon: typeof Compass }[] = [
  { id: "feed", label: "Сбирки", Icon: Compass },
  { id: "create", label: "Свикай", Icon: CalendarPlus },
  { id: "groups", label: "Дружини", Icon: Users },
  { id: "profile", label: "Профил", Icon: User },
];

/**
 * Signed-in shell (ported from legacy AppShell): top bar with desktop nav,
 * mobile bottom tab bar, notifications drawer and footer. Routing replaces the
 * old `activeTab` state.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = tabForPath(pathname);
  const mobileActive = mobileTabFor(active);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = useNotifications();
  const unread = notifications.data?.unreadCount ?? 0;
  const closeNotifications = useCallback(() => setNotifOpen(false), []);
  const bellLabel = unread > 0 ? `Известия (${unread} непрочетени)` : "Известия";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:h-16 lg:px-8">
          <Link
            href="/feed"
            className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap font-display text-xl font-bold tracking-tight text-ink transition-colors hover:text-tavern"
          >
            АЙДЕ ПО ЕДНА!
          </Link>

          <nav aria-label="Основна навигация" className="hidden items-center gap-7 text-sm font-medium text-ink-muted md:flex">
            {DESKTOP_LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <Link
                  key={link.id}
                  href={TAB_HREF[link.id]}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative shrink-0 whitespace-nowrap py-2 transition-colors ${
                    isActive ? "font-semibold text-tavern" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                  {isActive && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-tavern" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={TAB_HREF.create}
              aria-current={active === "create" ? "page" : undefined}
              className="hidden min-h-[40px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-tavern px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-tavern-hover md:inline-flex"
            >
              Свикай дружината
            </Link>
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-muted md:hidden"
              aria-label={bellLabel}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-burgundy px-1 font-mono text-[10px] font-semibold text-canvas tabular-nums">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <div className="flex min-h-[44px] items-center">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
        <div className="mb-4 hidden items-center justify-between gap-4 text-xs text-ink-muted md:flex">
          <span>Организираме компания, а не състезание по пиене · Безалкохолното участие е винаги добре дошло</span>
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-2 whitespace-nowrap font-medium text-ink transition-colors hover:text-tavern"
            aria-label={bellLabel}
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Известия</span>
            {unread > 0 && <span className="font-mono font-semibold text-burgundy tabular-nums">({unread})</span>}
          </button>
        </div>

        {children}
      </main>

      <footer className="hidden border-t border-line bg-surface-muted/55 md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-6 text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-ink">АЙДЕ ПО ЕДНА!</span>
            <span aria-hidden="true">·</span>
            <span>Ако шофираш, избери безалкохолно.</span>
            <span aria-hidden="true">·</span>
            <span>Само за пълнолетни (18+)</span>
          </div>
          <div className="flex items-center gap-4">
            <PWAInstallButton compact />
            <Link href={TAB_HREF.profile} className="whitespace-nowrap transition-colors hover:text-ink">
              Поверителност и GDPR
            </Link>
          </div>
        </div>
      </footer>

      <nav
        aria-label="Мобилна навигация"
        className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          {MOBILE_TABS.map(({ id, label, Icon }) => {
            const isActive = mobileActive === id;
            return (
              <Link
                key={id}
                href={TAB_HREF[id]}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center transition-colors ${
                  isActive ? "font-semibold text-tavern" : "text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="mt-1 whitespace-nowrap text-[11px] leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {notifOpen && (
        <NotificationsPanel data={notifications.data} isLoading={notifications.isPending} onClose={closeNotifications} />
      )}
    </div>
  );
}
