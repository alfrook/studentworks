"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Phone, X } from "lucide-react";
import { BUSINESS, NAV, asset } from "@/lib/site";
import { QuoteButton } from "./ui";

export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#home");
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Transparent over the hero, matte black once scrolled.
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav section the visitor is in: the last one whose top has passed 40% of the screen.
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      setActive(`#${cur}`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Mobile menu: lock scroll, close on Escape, keep focus inside, restore focus on close.
  useEffect(() => {
    if (!open) return;
    const btn = menuBtn.current;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a,button");
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-500 ease-out-expo ${
        // no backdrop-filter while the menu is open: it would trap the fixed full-screen panel inside the header
        open ? "bg-ink py-3" : solid ? "bg-ink/95 py-3 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md" : "bg-gradient-to-b from-black/50 to-transparent py-5"
      }`}
    >
      <div className="container-x flex items-center justify-between gap-6">
        <a href="#home" className="relative z-10 shrink-0" aria-label={`${BUSINESS.name}, back to top`}>
          <img src={asset("/images/logo-red.png")} alt={BUSINESS.name} width={456} height={234} className="h-10 w-auto md:h-12" />
        </a>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  aria-current={active === n.href ? "true" : undefined}
                  className="group relative py-2 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white"
                >
                  {n.label}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-[2px] w-full origin-left bg-red transition-transform duration-500 ease-out-expo ${
                      active === n.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a href={BUSINESS.phoneHref} className="hidden items-center gap-2 text-sm font-bold text-white xl:flex hover:text-red transition-colors">
            <Phone className="size-4" aria-hidden /> {BUSINESS.phone}
          </a>
          <QuoteButton className="!min-h-[46px] !gap-2 !px-4 sm:!px-5"><span className="sm:hidden">Free quote</span><span className="hidden sm:inline">Get a free quote</span></QuoteButton>
          <button
            ref={menuBtn}
            type="button"
            className="relative z-10 grid size-12 place-items-center border-2 border-white/30 text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-0 flex flex-col bg-ink px-5 pb-10 pt-28 lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <nav aria-label="Mobile">
              <ul className="border-t border-white/10">
                {NAV.map((n, i) => (
                  <motion.li
                    key={n.href}
                    className="border-b border-white/10"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <a
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-5 text-4xl font-extrabold uppercase tracking-tight text-white"
                    >
                      {n.label}
                      <span className="text-sm font-bold text-white/60">0{i + 1}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto grid gap-3" onClick={() => setOpen(false)}>
              <QuoteButton className="w-full">Get a free quote</QuoteButton>
              <a href={BUSINESS.phoneHref} className="flex min-h-[52px] items-center justify-center gap-2 border-2 border-white/30 font-bold text-white">
                <Phone className="size-4" aria-hidden /> Call or text {BUSINESS.phone}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
