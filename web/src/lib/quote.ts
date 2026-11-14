"use client";

import { useCallback, useEffect, useRef } from "react";

const EVT = "quote:open";

/** Lightweight cross-component channel: any button can jump to the quote form and preselect a service. */
export function useQuote() {
  const open = useCallback((service?: string) => {
    window.dispatchEvent(new CustomEvent<string | undefined>(EVT, { detail: service }));
    const el = document.getElementById("contact");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#contact");
    // Move focus into the form once the scroll settles, for keyboard and screen-reader users.
    window.setTimeout(() => document.getElementById("q-name")?.focus({ preventScroll: true }), reduce ? 0 : 700);
  }, []);
  return { open };
}

/** Used by the form: runs `onService` whenever a quote button asks for a service. */
export function useQuoteListener(onService: (service?: string) => void) {
  const cb = useRef(onService);
  useEffect(() => {
    cb.current = onService;
  });
  useEffect(() => {
    const h = (e: Event) => cb.current((e as CustomEvent<string | undefined>).detail);
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
}
