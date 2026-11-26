import React from 'react';
import { ShieldCheck, Car } from 'lucide-react';

interface AgeGateModalProps {
  onConfirm: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ onConfirm }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1915]/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-heading"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-4 border-b border-[#DDD3C2] pb-4">
          <span className="font-display text-2xl font-bold tracking-tight text-[#1E1915]">
            АЙДЕ ПО ЕДНА!
          </span>
          <span className="tavern-stamp text-[#7C232B]">18+ САМО</span>
        </div>

        <h2
          id="age-gate-heading"
          className="mt-5 font-display text-2xl font-bold text-[#1E1915] text-balance"
        >
          Не е важно колко е ракията. Важно е кой е на масата.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[#5D5348]">
          Платформата е предназначена единствено за пълнолетни потребители (18+) в България, които
          организират приятелски сбирки, разговори и споделено мезе.
        </p>

        <div className="mt-5 space-y-3 rounded-xl bg-[#EFE8DC]/70 p-4 text-sm text-[#1E1915]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1C4532]" />
            <span>
              <strong>Организираме компания, а не състезание по пиене.</strong> Консумацията на
              алкохол не е задължителна — всяка сбирка поддържа безалкохолно участие.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-[#7C232B]" />
            <span>
              <strong>Ако шофираш, избери безалкохолно.</strong> Точните домашни адреси се показват
              само на одобрени участници.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 w-full rounded-xl bg-[#1C4532] px-5 py-3.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] active:scale-[0.99] transition-all min-h-[48px]"
        >
          Потвърждавам, че имам 18+ години — влизам в дружината
        </button>

        <p className="mt-3 text-center text-xs text-[#5D5348]">
          Без продажба и доставка на алкохол · GDPR защита на данните
        </p>
      </div>
    </div>
  );
};
