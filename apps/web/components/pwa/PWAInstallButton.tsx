'use client';

import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'inline-flex items-center gap-2 rounded-lg border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-[#1C4532] hover:bg-[#EFE8DC] transition-colors whitespace-nowrap shrink-0 min-h-[40px]'
            : 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C4532] px-4 py-2.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] transition-colors whitespace-nowrap shrink-0 min-h-[44px]'
        }
      >
        {isIOS ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span>{isIOS ? 'Инсталирай на iPhone' : 'Инсталирай приложението'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1915]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="pwa-guide-title"
                  className="font-display text-xl font-bold text-[#1E1915]"
                >
                  Добави „АЙДЕ ПО ЕДНА!“ на началния екран
                </h3>
                <p className="mt-1 text-sm text-[#5D5348]">
                  Ползвай приложението като истинско мобилно приложение — бърз достъп и работа при слаб обхват.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#5D5348] hover:bg-[#EFE8DC] hover:text-[#1E1915]"
                aria-label="Затвори"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-[#DDD3C2] pt-4 text-sm text-[#1E1915]">
              {isIOS ? (
                <>
                  <p>
                    1. Натисни бутона <strong>Сподели (Share)</strong> в долната лента на Safari.
                  </p>
                  <p>
                    2. Превърти надолу и избери <strong>Добави към начален екран</strong>.
                  </p>
                  <p>
                    3. Потвърди с <strong>Добави</strong> — иконата ще се появи до другите приложения.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. Отвори менюто на браузъра (<strong>⋮</strong> в Chrome / Edge).
                  </p>
                  <p>
                    2. Избери <strong>Инсталиране на приложението</strong> или <strong>Добавяне към началния екран</strong>.
                  </p>
                  <p>
                    3. Отваряй „Айде по една“ с едно докосване директно от екрана си.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full rounded-xl bg-[#1C4532] py-3 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] transition-colors min-h-[44px]"
            >
              Разбрах, готово
            </button>
          </div>
        </div>
      )}
    </>
  );
};
