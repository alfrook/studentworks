"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PROCESS, asset } from "@/lib/site";
import { MaskHeading, Reveal } from "./ui";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Desktop (lg+, motion allowed): the section pins and scrolling walks through the four stages,
 * with a progress bar and step counter. Phones, tablets and reduced motion get a stacked list.
 */
export default function Process() {
  const root = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);
  const [step, setStep] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        setPinned(true);
        // wait one frame so the pinned layout is in the DOM
        let st: ScrollTrigger | undefined;
        const id = requestAnimationFrame(() => {
          const q = gsap.utils.selector(root);
          const texts = q<HTMLElement>("[data-ptext]");
          const imgs = q<HTMLElement>("[data-pimg]");
          gsap.set(texts.slice(1), { autoAlpha: 0, y: 40 });
          gsap.set(imgs.slice(1), { clipPath: "inset(100% 0 0 0)" });
          // Each change starts at i * GAP: old text out, then new text in, while the new photo wipes up.
          const GAP = 1.5;
          const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
          for (let i = 1; i < PROCESS.length; i++) {
            const t = (i - 1) * GAP + 0.5;
            tl.to(texts[i - 1], { autoAlpha: 0, y: -40, duration: 0.45 }, t)
              .to(texts[i], { autoAlpha: 1, y: 0, duration: 0.5 }, t + 0.5)
              .to(imgs[i], { clipPath: "inset(0% 0 0 0)", duration: 1 }, t)
              .fromTo(imgs[i].querySelector("img"), { scale: 1.2 }, { scale: 1, duration: 1 }, t);
          }
          tl.to({}, { duration: 0.5 }); // hold on the last stage
          const bar = q<HTMLElement>("[data-pbar]")[0];
          st = ScrollTrigger.create({
            trigger: q("[data-pin]")[0],
            start: "top top",
            end: () => `+=${window.innerHeight * PROCESS.length}`,
            pin: true,
            scrub: 0.6,
            animation: tl,
            onUpdate: (self) => {
              // counter follows the text: step i is "on" once its text has started fading in
              const t = self.progress * tl.duration();
              setStep(Math.max(0, Math.min(PROCESS.length - 1, Math.floor((t - 1) / GAP) + 1)));
              if (bar) bar.style.transform = `scaleX(${self.progress})`;
            },
          });
          ScrollTrigger.refresh();
        });
        return () => {
          cancelAnimationFrame(id);
          st?.kill();
          setPinned(false);
          setStep(0);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="process" className="bg-mist text-ink">
      <div className="container-x pt-24 md:pt-36">
        <Reveal><p className="eyebrow mb-6">Our process</p></Reveal>
        <MaskHeading lines={["Our process.", "Your peace", "of mind."]} accentLast className="text-[clamp(2.8rem,8.4vw,7.5rem)]" />
      </div>

      {pinned ? (
        <div data-pin className="flex h-screen items-center">
          <div className="container-x grid w-full grid-cols-[1fr_1.15fr] items-center gap-16">
            <div>
              <div className="mb-10 flex items-center gap-4" aria-hidden>
                <span className="text-sm font-extrabold tabular-nums">0{step + 1}</span>
                <span className="relative h-[3px] flex-1 bg-ink/15">
                  <span data-pbar className="absolute inset-0 origin-left scale-x-0 bg-red" />
                </span>
                <span className="text-sm font-extrabold tabular-nums text-muted">0{PROCESS.length}</span>
              </div>
              <ol className="relative min-h-[22rem]" aria-label="Process steps">
                {PROCESS.map((p) => (
                  <li key={p.n} data-ptext className="absolute inset-0">
                    <p className="text-[7rem] font-extrabold leading-none tracking-[-0.06em] text-red">{p.n}</p>
                    <h3 className="mt-2 text-6xl font-extrabold uppercase tracking-[-0.045em]">{p.name}</h3>
                    <p className="mt-6 max-w-md text-xl leading-relaxed text-muted">{p.text}</p>
                  </li>
                ))}
              </ol>
              <ul className="mt-6 flex gap-2" aria-hidden>
                {PROCESS.map((p, i) => (
                  <li key={p.n} className={`text-xs font-bold uppercase tracking-[0.16em] transition-colors duration-500 ${i === step ? "text-ink" : "text-ink/40"}`}>
                    {p.name}
                    {i < PROCESS.length - 1 && <span className="mx-2 text-ink/30">/</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/5] max-h-[80vh] w-full justify-self-end overflow-hidden bg-graphite">
              {PROCESS.map((p) => (
                <div key={p.n} data-pimg className="absolute inset-0 overflow-hidden">
                  <img src={asset(p.image)} alt={p.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: p.pos }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ol className="container-x mt-14 grid gap-14 pb-24 md:mt-20 md:pb-36" aria-label="Process steps">
          {PROCESS.map((p, i) => (
            <li key={p.n} className="grid gap-6 border-t-2 border-ink pt-6 md:grid-cols-2 md:gap-10">
              <Reveal>
                <div className="flex items-baseline gap-4">
                  <span className="text-6xl font-extrabold tracking-[-0.06em] text-red">{p.n}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Step {i + 1} of {PROCESS.length}</span>
                </div>
                <h3 className="mt-3 text-4xl font-extrabold uppercase tracking-[-0.04em] md:text-5xl">{p.name}</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{p.text}</p>
              </Reveal>
              <Reveal delay={0.1} className="aspect-[4/3] overflow-hidden bg-graphite">
                <img src={asset(p.image)} alt={p.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: p.pos }} />
              </Reveal>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
