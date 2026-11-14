"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { asset } from "@/lib/site";
import { LinkButton, QuoteButton } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1.08 : 1.18]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-22%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  const word = (text: string, i: number, red = false) => (
    <span className="block overflow-hidden pb-[0.04em]">
      <motion.span
        className={`block ${red ? "text-red" : ""}`}
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.15, ease: EASE, delay: 0.25 + i * 0.12 }}
      >
        {text}
      </motion.span>
    </span>
  );

  return (
    <section id="home" ref={ref} className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-white">
      <motion.div className="absolute inset-0 -z-10" style={{ y: imgY, scale: imgScale }}>
        <motion.picture className="block h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>
          <source media="(min-width: 768px)" srcSet={asset("/images/hero-desktop.webp")} />
          <img
            src={asset("/images/hero-mobile.webp")}
            alt="A house freshly repainted by Student Works Painting"
            className="h-full w-full object-cover object-[40%_30%] md:object-[50%_45%]"
            fetchPriority="high"
            width={1050}
            height={1400}
          />
        </motion.picture>
      </motion.div>
      {/* readability overlays */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/55 to-transparent" />

      <motion.div style={{ y: textY, opacity: fade }} className="container-x pb-14 pt-36 md:pb-20">
        <motion.p
          className="eyebrow mb-6 text-white/85"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        >
          Exterior painting · Forest Hill, Toronto
        </motion.p>
        <h1 className="display text-[clamp(3.1rem,11.5vw,10.5rem)]">
          {word("We don't", 0)}
          {word("just paint.", 1)}
          {word("We", 2)}
          {word("transform.", 3, true)}
        </h1>
        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[minmax(0,32rem)_auto] md:items-end md:justify-between">
          <motion.p
            className="max-w-[32rem] text-lg font-medium leading-relaxed text-white/85 md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.85 }}
          >
            Professional exterior painting that protects your home and makes it stand out.
          </motion.p>
          <motion.div
            className="flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1 }}
          >
            <QuoteButton>Get a free quote</QuoteButton>
            <LinkButton href="#work" variant="ghost-light">
              Explore our work
            </LinkButton>
          </motion.div>
        </div>
      </motion.div>

      <motion.a
        href="#services"
        aria-label="Scroll to services"
        className="absolute bottom-6 right-5 hidden size-12 place-items-center border border-white/30 text-white md:grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <ArrowDown className="size-5 motion-safe:animate-bounce" aria-hidden />
      </motion.a>
    </section>
  );
}
