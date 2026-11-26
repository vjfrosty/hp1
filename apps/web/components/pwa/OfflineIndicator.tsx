'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border border-[#7C232B]/30 bg-[#7C232B] px-3.5 py-2 text-xs font-semibold text-[#F7F3EC] shadow-lg md:bottom-5"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Офлайн режим — показваме запазените данни за сбирките.</span>
    </div>
  );
};
