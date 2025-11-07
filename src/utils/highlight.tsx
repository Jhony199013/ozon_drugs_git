"use client";

import React from "react";

type KeywordSpec = {
  pattern: RegExp;
  className: string;
};

const KEYWORDS: KeywordSpec[] = [
  { pattern: /минимальная|минимальный/gi, className: "pill pill--success" },
  { pattern: /умеренная|умеренный|с осторожностью/gi, className: "pill pill--warning" },
  { pattern: /критическая|критический|противопоказано/gi, className: "pill pill--danger" },
  { pattern: /отсутствует/gi, className: "pill pill--muted" },
];

const combined = new RegExp(
  KEYWORDS.map((k) => `(${k.pattern.source})`).join("|"),
  "gi"
);

export function highlightKeywords(text: string | null | undefined): React.ReactElement {
  const content = text != null ? String(text) : "";
  if (!content) return <span>{content}</span>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  content.replace(combined, (match, ...args) => {
    const offset = args[args.length - 2] as number; // match index
    const before = content.slice(lastIndex, offset);
    if (before) parts.push(before);

    // determine which group matched
    const groupIndex = args.findIndex((g) => typeof g === "string" && g === match);
    const spec = KEYWORDS[groupIndex >= 0 ? groupIndex : 0];
    parts.push(
      <span key={`kw-${offset}-${match}`} className={spec.className}>
        {match}
      </span>
    );

    lastIndex = offset + match.length;
    return match;
  });

  const tail = content.slice(lastIndex);
  if (tail) parts.push(tail);

  return <span>{parts}</span>;
}


