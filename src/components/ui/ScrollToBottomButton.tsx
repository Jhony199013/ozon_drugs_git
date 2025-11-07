"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

interface Props {
  containerId?: string;
}

export default function ScrollToBottomButton({ containerId }: Props) {
  const [hidden, setHidden] = useState(false);
  const containerRef = useRef<HTMLElement | Window | null>(null);

  const resolveContainer = useCallback(() => {
    if (containerId) {
      const el = document.getElementById(containerId);
      containerRef.current = el || window;
    } else {
      containerRef.current = window;
    }
  }, [containerId]);

  const checkAtBottom = useCallback(() => {
    const target = containerRef.current;
    if (!target) return;
    if (target === window) {
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      setHidden(atBottom);
      return;
    }
    const el = target as HTMLElement;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 2;
    setHidden(atBottom);
  }, []);

  useEffect(() => {
    resolveContainer();
    checkAtBottom();

    const target = containerRef.current;
    const onScroll = () => checkAtBottom();
    const onResize = () => checkAtBottom();

    if (target && target !== window) {
      (target as HTMLElement).addEventListener("scroll", onScroll, { passive: true } as any);
      window.addEventListener("resize", onResize);
      return () => {
        (target as HTMLElement).removeEventListener("scroll", onScroll as any);
        window.removeEventListener("resize", onResize);
      };
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }
  }, [resolveContainer, checkAtBottom]);

  const handleClick = () => {
    const target = containerRef.current;
    if (!target || target === window) {
      const doc = document.documentElement;
      window.scrollTo({ top: doc.scrollHeight, behavior: "smooth" });
    } else {
      const el = target as HTMLElement;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <button
      aria-label="Прокрутить вниз"
      className={`scroll-to-bottom ${hidden ? "scroll-to-bottom--hidden" : ""}`}
      onClick={handleClick}
    >
      <svg
        className="scroll-to-bottom__icon"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 3v14"
          stroke="#000"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6 14l6 6 6-6"
          stroke="#000"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
  );
}


