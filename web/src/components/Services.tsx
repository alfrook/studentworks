"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { SERVICES, asset } from "@/lib/site";
import { useQuote } from "@/lib/quote";
import { MaskHeading, Reveal } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Services() {
  const [active, setActive] = useState(0);
  const { open } = useQuote();
  const current = SERVICES[active];

  return (
    <section id="services" className="bg-paper py-24 md:py-36">
      <div className="container-x">
        <div className="mb-14 grid gap-6 md:mb-20 md:grid-cols-2 md:items-end">
          <div>
            <Reveal><p className="eyebrow mb-6 text-ink">Services</p></Reveal>
            <MaskHeading lines={["What we do."]} className="text-[clamp(3rem,10vw,8.5rem)]" />
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-md text-lg leading-relaxed text-muted md:justify-self-end">
              Five services, one standard. Every job gets the same careful prep and the same clean finish. Pick one to start your free quote.
            </p>
          </Reveal>
        </div>

        {/* Desktop: big list on the left, one large photo on the right that follows hover and focus */}
        <div className="hidden gap-12 lg:grid lg:grid-cols-[1.05fr_1fr]">
          <ul className="border-t border-ink/15">
            {SERVICES.map((s, i) => (
              <li key={s.id} className="border-b border-ink/15">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => open(s.name)}
                  className="group flex w-full items-start gap-6 py-7 text-left"
                  aria-label={`${s.name}: get a free quote`}
                >
                  <span className={`pt-2 text-sm font-bold tabular-nums transition-colors ${active === i ? "text-red" : "text-muted"}`}>0{i + 1}</span>
                  <span className="flex-1">
                    <span
                      className={`block text-[clamp(1.8rem,3.1vw,2.9rem)] font-extrabold uppercase leading-none tracking-[-0.035em] transition-[color,transform] duration-500 ease-out-expo ${
                        active === i ? "translate-x-2 text-ink" : "text-ink/50"
                      }`}
                    >
                      {s.name}
                    </span>
                    <span
                      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo ${
                        active === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <span className="overflow-hidden">
                        <span className="block max-w-md pt-3 pl-2 text-base leading-relaxed text-muted">{s.blurb}</span>
                        <span className="inline-flex items-center gap-2 pt-4 pl-2 text-xs font-extrabold uppercase tracking-[0.16em] text-red">
                          Get a quote for this <ArrowUpRight className="size-4" aria-hidden />
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="relative">
            <div className="sticky top-28 aspect-[4/5] max-h-[78vh] w-full overflow-hidden bg-mist">
              <AnimatePresence initial={false}>
                <motion.img
                  key={current.id}
                  src={asset(current.image)}
                  alt={current.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: current.pos }}
                  initial={{ opacity: 0, scale: 1.08, clipPath: "inset(0 0 100% 0)" }}
                  animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </AnimatePresence>
              <div className="absolute bottom-0 left-0 bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white">
                0{active + 1} / 0{SERVICES.length}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile and tablet: full-width photo panels */}
        <ul className="grid gap-5 sm:grid-cols-2 lg:hidden">
          {SERVICES.map((s, i) => (
            <li key={s.id}>
              <Reveal delay={(i % 2) * 0.08}>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    open(s.name);
                  }}
                  className="group relative block aspect-[4/5] overflow-hidden bg-ink text-white"
                >
                  <img
                    src={asset(s.image)}
                    alt={s.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105"
                    style={{ objectPosition: s.pos }}
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="mb-3 block text-sm font-bold text-white/70">0{i + 1}</span>
                    <h3 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-[-0.035em]">{s.name}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-white/80">{s.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-2 border-b-2 border-red pb-1 text-xs font-extrabold uppercase tracking-[0.16em]">
                      Get a quote <ArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
