"use client";

import { ClipboardCheck, Home, Layers, MessageSquare, PaintRoller } from "lucide-react";
import { REASONS } from "@/lib/site";
import { MaskHeading, Reveal } from "./ui";

const ICONS = [ClipboardCheck, Layers, PaintRoller, MessageSquare, Home];

export default function WhyUs() {
  return (
    <section id="why" className="bg-paper py-24 md:py-36">
      <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal><p className="eyebrow mb-6">Why choose us</p></Reveal>
          <MaskHeading lines={["Built on quality.", "Backed by care."]} accentLast className="text-[clamp(2.6rem,6.4vw,5.6rem)]" />
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
              Our rule is simple: <strong className="text-ink">do it once, do it right.</strong> Here is what that means on your house.
            </p>
          </Reveal>
        </div>
        <ol className="border-t border-ink/15">
          {REASONS.map((r, i) => {
            const Icon = ICONS[i];
            return (
              <li key={r.title} className="border-b border-ink/15">
                <Reveal delay={i * 0.05} className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-8 md:grid-cols-[auto_auto_1fr] md:items-start md:gap-x-8">
                  <span className="pt-1 text-sm font-extrabold tabular-nums text-muted">0{i + 1}</span>
                  <span className="row-span-2 hidden size-14 place-items-center border-2 border-ink transition-colors duration-500 group-hover:border-red group-hover:bg-red group-hover:text-white md:grid">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <div className="col-start-2 md:col-start-3">
                    <h3 className="text-2xl font-extrabold uppercase tracking-[-0.03em] md:text-3xl">{r.title}</h3>
                    <p className="mt-3 max-w-lg text-base leading-relaxed text-muted md:text-lg">{r.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
