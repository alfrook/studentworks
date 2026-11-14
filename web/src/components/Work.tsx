"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { PROJECTS, asset } from "@/lib/site";
import BeforeAfter from "./BeforeAfter";
import { MaskHeading, QuoteButton, Reveal } from "./ui";

export default function Work() {
  const [open, setOpen] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (dir: number) => setOpen((i) => (i === null ? i : (i + dir + PROJECTS.length) % PROJECTS.length));

  return (
    <section id="work" className="bg-ink py-24 text-white md:py-36">
      <div className="container-x">
        <div className="mb-12 grid gap-6 md:mb-16 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <Reveal><p className="eyebrow mb-6 text-white/80">Our work</p></Reveal>
            <MaskHeading lines={["The difference", "is in the", "details."]} accentLast className="text-[clamp(2.8rem,8.4vw,7.5rem)]" />
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-md text-lg leading-relaxed text-white/75 lg:justify-self-end">
              Drag the handle across the house. Same house, same angle, before and after. The prep you can&apos;t see is why the finish lasts.
            </p>
          </Reveal>
        </div>

        <Reveal>
          <BeforeAfter />
        </Reveal>

        <div className="mt-24 flex flex-wrap items-end justify-between gap-6 md:mt-32">
          <h3 className="display text-[clamp(2rem,5vw,3.6rem)]">Recent projects</h3>
          <QuoteButton variant="ghost-light">Start your project</QuoteButton>
        </div>

        <ul className="mt-10 grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[300px] lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <li key={p.image + i} className={`${p.tall ? "sm:row-span-2" : ""} ${i === 0 ? "sm:col-span-2" : ""}`}>
              <Reveal delay={(i % 3) * 0.08} className="h-full">
                <button
                  type="button"
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    setOpen(i);
                  }}
                  className="group relative block h-full w-full overflow-hidden bg-graphite text-left"
                  aria-label={`View larger: ${p.title}, ${p.detail}`}
                >
                  <img
                    src={asset(p.image)}
                    alt={p.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover grayscale-[35%] transition-[transform,filter] duration-[1200ms] ease-out-expo group-hover:scale-[1.06] group-hover:grayscale-0 group-focus-visible:grayscale-0"
                    style={{ objectPosition: p.pos }}
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{p.detail}</p>
                      <p className="mt-1 text-xl font-extrabold uppercase tracking-tight">{p.title}</p>
                    </div>
                    <span className="grid size-11 shrink-0 place-items-center bg-red transition-transform duration-500 ease-out-expo group-hover:rotate-90">
                      <Expand className="size-4" aria-hidden />
                    </span>
                  </div>
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-red transition-transform duration-700 ease-out-expo group-hover:scale-x-100" />
                </button>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      {/* Lightbox */}
      <dialog
        ref={dlg}
        aria-label="Project photo"
        className="m-0 h-full max-h-none w-full max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="flex items-center justify-between p-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em]" aria-live="polite">
              {open !== null && `${open + 1} / ${PROJECTS.length} · ${PROJECTS[open].title}`}
            </p>
            <button type="button" onClick={() => setOpen(null)} className="grid size-12 place-items-center border border-white/30 hover:bg-red" aria-label="Close">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
            <AnimatePresence mode="wait">
              {open !== null && (
                <motion.img
                  key={open}
                  src={asset(PROJECTS[open].image)}
                  alt={PROJECTS[open].alt}
                  className="max-h-[78vh] max-w-full object-contain"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
              )}
            </AnimatePresence>
            <button type="button" onClick={() => step(-1)} className="absolute left-4 grid size-12 place-items-center bg-ink/80 hover:bg-red" aria-label="Previous photo">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button type="button" onClick={() => step(1)} className="absolute right-4 grid size-12 place-items-center bg-ink/80 hover:bg-red" aria-label="Next photo">
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
