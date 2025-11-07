"use client";

import React from "react";
import { highlightKeywords } from "@/utils/highlight";

interface ResultCardProps {
  index: number;
  pair?: string;
  interaction?: string;
  explanation?: string;
}

export default function ResultCard({ index, pair, interaction, explanation }: ResultCardProps) {
  const hasExplanation = !!(explanation && explanation.trim());
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-[var(--secondary)] bg-[var(--chip-bg)] border border-[var(--chip-border)] rounded-full flex-shrink-0">
          {index}
        </span>
        <div className="flex-1">
          {pair && (
            <div className="text-base md:text-lg text-primary font-semibold mb-2">{pair}</div>
          )}
          <div className="text-sm flex items-center gap-2 flex-nowrap mb-1">
            <span className="text-xs md:text-sm font-semibold text-[var(--neutral-800)] whitespace-nowrap">Клиническая значимость:</span>
            {interaction ? (
              <span className="whitespace-nowrap">{highlightKeywords(interaction)}</span>
            ) : (
              <span className="inline-block bg-[var(--neutral-200)] text-[var(--neutral-600)] px-3 py-1 rounded whitespace-nowrap">Отсутствует</span>
            )}
          </div>
          {hasExplanation && (
            <div className="mt-3 info-box">
              <div className="text-sm font-semibold text-[var(--neutral-800)] mb-1">Объяснение</div>
              <div className="text-sm text-[var(--neutral-800)] leading-relaxed">{explanation}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


