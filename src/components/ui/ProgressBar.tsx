"use client";

import React, { useEffect, useRef } from "react";

interface ProgressBarProps {
  labelTitle?: string;
  labelPair?: string;
  current?: number;
  total?: number;
  running: boolean;
  totalMs: number; // суммарная длительность (7с * (n-1) + 10с)
  sessionId: number | string; // менять, чтобы перезапустить анимацию
}

export default function ProgressBar({ labelTitle, labelPair, current, total, running, totalMs, sessionId }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);

  // Запуск плавной CSS-анимации на каждую сессию
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    // Сбрасываем стиль
    el.style.transition = "none";
    el.style.transform = "scaleX(0)";

    // Форсируем reflow, затем запускаем анимацию на все totalMs линейно
    // Работает стабильно, без микроостановок
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.getBoundingClientRect();
    if (running && totalMs > 0) {
      el.style.transition = `transform ${totalMs}ms linear`;
      el.style.transform = "scaleX(1)";
    }
  }, [running, totalMs, sessionId]);

  return (
    <div className="space-y-2">
      {labelTitle ? (
        <p className="text-[var(--neutral-900)] text-base">
          <span className="font-normal">{labelTitle}</span>
          {labelPair && (
            <>
              {" "}
              {(() => {
                const parts = labelPair.split(" + ");
                if (parts.length === 2) {
                  return (
                    <>
                      <span className="font-bold text-primary">{parts[0]}</span>{" "}
                      <span className="font-normal text-[var(--neutral-900)]">и</span>{" "}
                      <span className="font-bold text-primary">{parts[1]}</span>
                    </>
                  );
                }
                return <span className="font-bold text-primary">{labelPair}</span>;
              })()}
            </>
          )}
        </p>
      ) : null}
      <div className="w-full h-3 bg-[var(--neutral-200)] rounded overflow-hidden">
        <div
          ref={barRef}
          className="h-3 rounded will-change-[transform]"
          style={{
            width: "100%",
            transformOrigin: "left",
            background: "linear-gradient(90deg, var(--primary-200), var(--primary-600))",
          }}
        />
      </div>
      {current && total && (
        <div className="text-center text-[10px] md:text-xs text-[var(--neutral-700)] mt-1">{`${current} из ${total}`}</div>
      )}
    </div>
  );
}


