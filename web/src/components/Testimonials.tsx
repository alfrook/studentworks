"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/site";
import { MaskHeading, Reveal } from "./ui";

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (d: number) => {
    setDir(d);
    setI((x) => (x + d + TESTIMONIALS.length) % TESTIMONIALS.length);
  };
  const t = TESTIMONIALS[i];

  return (
    <section id="reviews" className="relative overflow-hidden bg-ink py-24 text-white md:py-36" aria-roledescription="carousel" aria-label="Customer reviews">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal><p className="eyebrow mb-6 text-white/80">Testimonials</p></Reveal>
            <MaskHeading lines={["In their words."]} className="text-[clamp(2.6rem,7vw,6rem)]" />
          </div>
          <span className="placeholder-tag text-white/80">Sample content: real reviews coming</span>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/15 pt-12 md:mt-20 lg:grid-cols-[auto_1fr] lg:gap-16">
          <Quote className="size-14 text-red md:size-20" aria-hidden />
          <div className="min-h-[19rem] md:min-h-[17rem]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.figure
                key={i}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="m-0"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${TESTIMONIALS.length}`}
              >
                <blockquote className="text-[clamp(1.6rem,3.8vw,3.2rem)] font-bold leading-[1.12] tracking-[-0.03em]">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-8 flex items-center gap-4 text-sm font-bold uppercase tracking-[0.16em]">
                  <span className="h-[2px] w-10 bg-red" aria-hidden />
                  <span>
                    {t.name} <span className="text-white/60">· {t.place}</span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-6 lg:pl-[calc(5rem+4rem)]">
          <div className="flex gap-2" role="group" aria-label="Choose a review">
            {TESTIMONIALS.map((_, k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setDir(k > i ? 1 : -1); setI(k); }}
                aria-label={`Review ${k + 1}`}
                aria-current={k === i}
                className="grid h-11 w-10 place-items-center"
              >
                <span className={`block h-[3px] transition-all duration-500 ${k === i ? "w-10 bg-red" : "w-5 bg-white/30"}`} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="grid size-12 place-items-center border-2 border-white/25 transition-colors hover:border-red hover:bg-red">
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next review" className="grid size-12 place-items-center border-2 border-white/25 transition-colors hover:border-red hover:bg-red">
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
