"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Phone } from "lucide-react";
import { BUSINESS } from "@/lib/site";
import { MaskHeading, QuoteButton, Reveal } from "./ui";

export default function CTA() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["4%", "-18%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-red py-24 text-white md:py-36">
      {/* oversized outline word drifting with scroll */}
      <motion.p
        aria-hidden
        style={{ x }}
        className="pointer-events-none absolute -bottom-[0.18em] left-0 select-none whitespace-nowrap text-[28vw] font-extrabold uppercase leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:2px_rgba(0,0,0,0.18)]"
      >
        Do it right
      </motion.p>
      <div className="container-x relative grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <MaskHeading lines={["Ready to give", "your home", "a new look?"]} className="text-[clamp(2.8rem,8vw,7.4rem)]" />
          <Reveal delay={0.15}>
            <p className="mt-6 text-xl font-semibold md:text-2xl">Let&apos;s bring your vision to life.</p>
          </Reveal>
        </div>
        <Reveal delay={0.2} className="flex flex-col gap-3 lg:items-end">
          <QuoteButton variant="black" className="w-full lg:w-auto">Get your free estimate</QuoteButton>
          <a href={BUSINESS.phoneHref} className="inline-flex min-h-[52px] items-center justify-center gap-2 border-2 border-white px-7 text-[0.82rem] font-extrabold uppercase tracking-[0.14em] transition-colors hover:bg-white hover:text-ink">
            <Phone className="size-4" aria-hidden /> Call or text {BUSINESS.phone}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
