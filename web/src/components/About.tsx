"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { BUSINESS, asset } from "@/lib/site";
import { MaskHeading, QuoteButton, Reveal } from "./ui";

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <section id="about" className="bg-ink py-24 text-white md:py-36">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div ref={ref} className="relative aspect-square overflow-hidden bg-graphite">
          <motion.img
            src={asset("/images/alex.webp")}
            alt={`${BUSINESS.owner}, owner of Student Works Painting, Forest Hill`}
            loading="lazy"
            className="absolute inset-0 h-[116%] w-full object-cover object-[50%_30%]"
            style={{ y, top: "-8%" }}
          />
          <span aria-hidden className="absolute bottom-0 left-0 h-2 w-1/3 bg-red" />
        </div>
        <div>
          <Reveal><p className="eyebrow mb-6 text-white/80">About</p></Reveal>
          <MaskHeading lines={["Meet", "Alexander Frook."]} className="text-[clamp(2.6rem,6.4vw,5.6rem)]" />
          <Reveal delay={0.1}>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-red">Owner/Operator, {BUSINESS.name} · {BUSINESS.division}</p>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-white/80">
              <p>
                I run the Student Works Painting division in Forest Hill. I&apos;m a graduate of Forest Hill Collegiate Institute and an engineering student at the University of
                Guelph, and I bring painting experience from across Grey-Bruce to our neighbourhood.
              </p>
              <p>
                My goal is to run one of the top Student Works divisions in the province, which means a lot of homes painted with top levels of service, quality and customer
                satisfaction. Residential or commercial, painting or staining, you get a crew you can count on.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <QuoteButton>Get a free quote</QuoteButton>
              <a href="join.html" className="inline-flex min-h-[52px] items-center border-2 border-white/30 px-7 text-[0.82rem] font-extrabold uppercase tracking-[0.14em] transition-colors hover:border-white hover:bg-white hover:text-ink">
                Join the crew
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
