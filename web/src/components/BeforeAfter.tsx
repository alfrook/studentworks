"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronsLeftRight, ImageOff } from "lucide-react";
import { BEFORE_AFTER, asset } from "@/lib/site";

/** Placeholder panel shown until real same-house photos are supplied. Never fake a "before". */
function Missing({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-3 text-center ${dark ? "bg-graphite text-white/70" : "bg-mist text-muted"}`}
      style={{
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 22px, ${dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)"} 22px 44px)`,
      }}
    >
      <ImageOff className="size-8" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-[0.18em]">{label} photo needed</span>
    </div>
  );
}

export default function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { before, after, caption } = BEFORE_AFTER;
  const isPlaceholder = !before || !after;

  const moveTo = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <figure className="m-0">
      <div
        ref={box}
        className={`relative aspect-[4/5] w-full select-none overflow-hidden bg-graphite sm:aspect-[16/10] ${dragging ? "cursor-grabbing" : "cursor-ew-resize"}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging && moveTo(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* AFTER fills the frame; BEFORE is clipped to the left of the divider */}
        <div className="absolute inset-0">
          {after ? <img src={asset(after)} alt="After: the house freshly painted" className="h-full w-full object-cover" draggable={false} loading="lazy" /> : <Missing label="After" />}
        </div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {before ? (
            <img src={asset(before)} alt="Before: the same house with weathered paint" className="h-full w-full object-cover" draggable={false} loading="lazy" />
          ) : (
            <Missing label="Before" dark />
          )}
        </div>

        <span className="pointer-events-none absolute left-4 top-4 bg-ink px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-white">Before</span>
        <span className="pointer-events-none absolute right-4 top-4 bg-red px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-white">After</span>

        {/* divider + handle (keyboard: arrows, Home, End) */}
        <div className="pointer-events-none absolute inset-y-0 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_20px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }} />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% before shown`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 4;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setPos((p) => Math.max(0, p - step)); }
            if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setPos((p) => Math.min(100, p + step)); }
            if (e.key === "Home") { e.preventDefault(); setPos(0); }
            if (e.key === "End") { e.preventDefault(); setPos(100); }
          }}
          className={`absolute top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-red text-white shadow-xl transition-transform duration-200 ${dragging ? "scale-110" : "hover:scale-110"}`}
          style={{ left: `${pos}%` }}
        >
          <ChevronsLeftRight className="size-6" aria-hidden />
        </div>

        {isPlaceholder && (
          <span className="placeholder-tag pointer-events-none absolute bottom-4 left-1/2 w-max max-w-[90%] -translate-x-1/2 bg-ink/80 text-center text-white">
            Placeholder: real photos coming
          </span>
        )}
      </div>
      <figcaption className="mt-4 text-sm text-muted-dark">
        {isPlaceholder ? caption : "Same house, same spot. Drag the handle, or use the arrow keys, to compare."}
      </figcaption>
    </figure>
  );
}
