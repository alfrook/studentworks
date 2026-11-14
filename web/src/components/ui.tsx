"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useQuote } from "@/lib/quote";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade-and-rise when scrolled into view. */
export function Reveal({ delay = 0, y = 28, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Heading whose lines slide up from behind a mask, staggered.
 * The in-view trigger sits on the heading itself: the masked lines start clipped,
 * so observing each line directly would never fire.
 */
const tags = { h1: motion.h1, h2: motion.h2 };
export function MaskHeading({
  lines,
  as = "h2",
  className = "",
  accentLast = false,
}: {
  lines: string[];
  as?: "h1" | "h2";
  className?: string;
  accentLast?: boolean;
}) {
  const Tag = tags[as];
  return (
    <Tag
      className={`display ${className}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ staggerChildren: 0.09 }}
    >
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className={`block ${accentLast && i === lines.length - 1 ? "text-red" : ""}`}
            variants={{ hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 1, ease: EASE } } }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

type BtnProps = {
  children: React.ReactNode;
  variant?: "red" | "ghost-light" | "ghost-dark" | "black" | "white";
  className?: string;
};

const styles: Record<NonNullable<BtnProps["variant"]>, string> = {
  red: "bg-red text-white border-red hover:bg-ink hover:border-ink",
  black: "bg-ink text-white border-ink hover:bg-white hover:text-ink hover:border-white",
  white: "bg-white text-ink border-white hover:bg-ink hover:text-white hover:border-ink",
  "ghost-light": "bg-transparent text-white border-white/70 hover:bg-white hover:text-ink hover:border-white",
  "ghost-dark": "bg-transparent text-ink border-ink hover:bg-ink hover:text-white",
};

const base =
  "group inline-flex min-h-[52px] items-center justify-center gap-3 border-2 px-7 py-3 text-[0.82rem] font-extrabold uppercase tracking-[0.14em] transition-colors duration-300";

function Arrow() {
  return (
    <span aria-hidden className="relative block size-4 overflow-hidden">
      <ArrowUpRight className="absolute inset-0 size-4 transition-transform duration-300 ease-out-expo group-hover:-translate-y-4 group-hover:translate-x-4" />
      <ArrowUpRight className="absolute inset-0 size-4 -translate-x-4 translate-y-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-0 group-hover:translate-y-0" />
    </span>
  );
}

export function LinkButton({ href, variant = "red", className = "", children }: BtnProps & { href: string }) {
  return (
    <a href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
      <Arrow />
    </a>
  );
}

/** Any "get a quote" button: scrolls to the form and optionally preselects a service. */
export function QuoteButton({ service, variant = "red", className = "", children }: BtnProps & { service?: string }) {
  const { open } = useQuote();
  return (
    <a
      href="#contact"
      onClick={(e) => {
        e.preventDefault();
        open(service);
      }}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
      <Arrow />
    </a>
  );
}
