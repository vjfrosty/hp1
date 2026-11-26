import React, { useState } from 'react';
import {
  Bell,
  CalendarPlus,
  Compass,
  ShieldAlert,
  User,
  Users,
  X,
} from 'lucide-react';
import { ActiveTab, AppNotification } from '../types/app';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface AppShellProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkNotificationsRead: () => void;
  onOpenEvent: (eventId: string) => void;
  toastMessage: string | null;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onNavigate,
  notifications,
  unreadCount,
  onMarkNotificationsRead,
  onOpenEvent,
  toastMessage,
  children,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  const openNotifications = () => {
    setNotifOpen(true);
    if (unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };

  const desktopLinks: { id: ActiveTab; label: string }[] = [
    { id: 'feed', label: 'Сбирки' },
    { id: 'radar', label: 'Радар' },
    { id: 'groups', label: 'Дружини' },
    { id: 'chronicle', label: 'Летопис' },
    { id: 'profile', label: 'Профил' },
  ];

  const mobileTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'feed', label: 'Сбирки', icon: <Compass className="h-5 w-5" /> },
    { id: 'create', label: 'Свикай', icon: <CalendarPlus className="h-5 w-5" /> },
    { id: 'groups', label: 'Дружини', icon: <Users className="h-5 w-5" /> },
    { id: 'profile', label: 'Профил', icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EC] text-[#1E1915]">
      {/* Desktop 3-Zone Top Bar Contract + Compact Mobile Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#DDD3C2] bg-[#F7F3EC]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:h-16 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('feed')}
            className="font-display text-xl font-bold tracking-tight text-[#1E1915] hover:text-[#1C4532] transition-colors whitespace-nowrap shrink-0 min-h-[44px] flex items-center"
          >
            АЙДЕ ПО ЕДНА!
          </button>

          {/* Zone 2: 5 clean single-line navigation links (Desktop) */}
          <nav
            aria-label="Основна навигация"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5D5348]"
          >
            {desktopLinks.map((link) => {
              const isActive =
                activeTab === link.id || (activeTab === 'event' && link.id === 'feed');
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onNavigate(link.id)}
                  className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#1C4532] font-semibold'
                      : 'text-[#5D5348] hover:text-[#1E1915]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[#1C4532]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA on Desktop / Notifications bell on Mobile */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="hidden md:inline-flex items-center justify-center rounded-xl bg-[#1C4532] px-4 py-2 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Свикай дружината
            </button>

            <button
              type="button"
              onClick={openNotifications}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#1E1915] hover:bg-[#EFE8DC] transition-colors md:hidden"
              aria-label="Известия"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7C232B] px-1 font-mono text-[10px] font-semibold text-[#F7F3EC] tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
        {/* Desktop quiet sub-bar for notifications access when unread or browsing */}
        <div className="mb-4 hidden md:flex items-center justify-between text-xs text-[#5D5348]">
          <span>Организираме компания, а не състезание по пиене · Безалкохолното участие е винаги добре дошло</span>
          <button
            type="button"
            onClick={openNotifications}
            className="inline-flex items-center gap-2 font-medium text-[#1E1915] hover:text-[#1C4532] transition-colors whitespace-nowrap shrink-0"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Известия</span>
            {unreadCount > 0 && (
              <span className="font-mono font-semibold text-[#7C232B] tabular-nums">
                ({unreadCount})
              </span>
            )}
          </button>
        </div>

        {children}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="hidden md:block border-t border-[#DDD3C2] bg-[#EFE8DC]/55">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-6 text-xs text-[#5D5348]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-[#1E1915]">АЙДЕ ПО ЕДНА!</span>
            <span aria-hidden="true">·</span>
            <span>Ако шофираш, избери безалкохолно.</span>
            <span aria-hidden="true">·</span>
            <span>Само за пълнолетни (18+)</span>
          </div>
          <div className="flex items-center gap-4">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="hover:text-[#1E1915] transition-colors whitespace-nowrap"
            >
              Поверителност и GDPR
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (4 tabs as specified: Сбирки, Свикай, Дружини, Профил) */}
      <nav
        aria-label="Мобилна навигация"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DDD3C2] bg-[#FDFBF7]/95 backdrop-blur-md pb-safe md:hidden"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {mobileTabs.map((tab) => {
            const isActive =
              activeTab === tab.id ||
              (activeTab === 'event' && tab.id === 'feed') ||
              (activeTab === 'radar' && tab.id === 'feed') ||
              (activeTab === 'chronicle' && tab.id === 'groups');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  isActive ? 'text-[#1C4532] font-semibold' : 'text-[#5D5348]'
                }`}
              >
                {tab.icon}
                <span className="mt-1 text-[11px] leading-none whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notifications Drawer */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#1E1915]/50 backdrop-blur-xs"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-[#FDFBF7] shadow-2xl border-l border-[#DDD3C2]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Известия"
          >
            <div className="flex items-center justify-between border-b border-[#DDD3C2] px-5 py-4">
              <h2 className="font-display text-lg font-bold text-[#1E1915]">
                Известия на дружината
              </h2>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#5D5348] hover:bg-[#EFE8DC]"
                aria-label="Затвори"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#DDD3C2]/70">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#5D5348]">
                  Няма нови известия. Всичко е спокойно около масата.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      if (n.eventId) onOpenEvent(n.eventId);
                    }}
                    className="w-full px-5 py-4 text-left hover:bg-[#EFE8DC]/60 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1E1915]">{n.title}</span>
                      <span className="font-mono text-xs text-[#5D5348] shrink-0">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#5D5348] leading-snug">{n.body}</p>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-[#DDD3C2] px-5 py-3 text-xs text-[#5D5348] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#7C232B] shrink-0" />
              <span>Ако шофираш, избери безалкохолно.</span>
            </div>
          </div>
        </div>
      )}

      {/* Funny Bulgarian Microinteraction Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-[#1C4532]/20 bg-[#1E1915] px-4 py-3 text-sm font-medium text-[#F7F3EC] shadow-xl md:bottom-6"
        >
          {toastMessage}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
};
