"use client";

import React from "react";

interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function InfoBox({ title, children, className }: InfoBoxProps) {
  return (
    <div className={`info-box ${className ?? ""}`}>
      {title && (
        <div className="text-sm font-semibold text-[var(--neutral-800)] mb-1">{title}</div>
      )}
      <div className="text-sm text-[var(--neutral-800)] leading-relaxed">{children}</div>
    </div>
  );
}


