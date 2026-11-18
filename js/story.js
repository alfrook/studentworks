// The homepage story: one pinned stage, one scroll-progress value, every scene
// driven from it. Only CSS transforms and opacity change while scrolling (plus the
// position of each paint-wipe mask inside the drawings).
//
// Units: progress is measured in "screens" (u). u = 1 means you scrolled one
// stage-height past the start of the story. Everything below is keyed to u.
//
// Coordinates: the camera works in Toronto map units (see tools/build-map.py).
// Each layer says where its own drawing sits on that map, so one camera can zoom
// smoothly from the whole city down to one house, and into its kitchen.

const DATA = JSON.parse(document.getElementById("story-data").textContent); // written by tools/build-scenes.py

const FH_RECT = [320, 195, 90, 130];   // Forest Hill drawing, in map units (must match tools/build-map.py)
const FH_SCALE = 10;
const HOUSE_AT = [353.4, 268.53];      // centre of the target lot, in map units (printed by tools/build-map.py)
const HOUSE_SPAN = 3.0;                // how wide the house drawing is, in map units

// Where the house drawing sits on the map
const hvb = DATA.house.viewBox;
const HK = HOUSE_SPAN / hvb[2];
const HOUSE_ORIGIN = [HOUSE_AT[0] - (hvb[0] + hvb[2] / 2) * HK, HOUSE_AT[1] - (hvb[1] + hvb[3] / 2) * HK];
const houseBox = (x, y, w, h) => [HOUSE_ORIGIN[0] + x * HK, HOUSE_ORIGIN[1] + y * HK, w * HK, h * HK];
const HOUSE_ALL = houseBox(...hvb);
// The overview frame: the house and yard, trimming some street and lawn so it reads larger on a phone
const HOUSE_FRAME = houseBox(hvb[0] + hvb[2] * 0.22, hvb[1] + hvb[3] * 0.04, hvb[2] * 0.72, hvb[3] * 0.8);

// Where the kitchen cutaway sits: centred on the kitchen window of the house,
// small enough to fit inside it, so the camera can zoom "through" the window.
const kvb = DATA.kitchen.viewBox;
const WIN = DATA.house.anchors.kitchen;                 // kitchen window, in house drawing units
const KITCHEN_IN_WINDOW = 90;                           // kitchen drawing width, in house drawing units
const KK = HK * KITCHEN_IN_WINDOW / kvb[2];
const KITCHEN_ORIGIN = [
  HOUSE_ORIGIN[0] + WIN[0] * HK - (kvb[0] + kvb[2] / 2) * KK,
  HOUSE_ORIGIN[1] + WIN[1] * HK - (kvb[1] + kvb[3] / 2) * KK,
];
const kitchenBox = (x, y, w, h) => [KITCHEN_ORIGIN[0] + x * KK, KITCHEN_ORIGIN[1] + y * KK, w * KK, h * KK];
const WINDOW_BOX = houseBox(WIN[0] - 70, WIN[1] - 50, 140, 100);

// Frame a beat: its painted area plus some room, never tighter than MIN_FRAME.
const MIN_FRAME = { house: [300, 220], kitchen: [700, 480] };
const MIN_FRAME_BY_KEY = { door: [300, 240], garage: [380, 300], balcony: [520, 420] }; // the front door gets a closer look
function focusBox(beat) {
  // the interior is framed as a whole room; house beats frame the painted part
  const vb = DATA.kitchen.viewBox;
  let [x0, y0, x1, y1] = beat.scene === "kitchen" ? [vb[0], vb[1], vb[0] + vb[2], vb[1] + vb[3]] : DATA[beat.scene].wipes[beat.key].bbox;
  for (const k of beat.alsoPaint || []) {
    const b = DATA[beat.scene].wipes[k]?.bbox;
    if (b) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
  }
  const [mw, mh] = MIN_FRAME_BY_KEY[beat.key] || MIN_FRAME[beat.scene];
  const pad = beat.scene === "kitchen" ? 1.02 : 1.12;
  const w = Math.max((x1 - x0) * pad, mw), h = Math.max((y1 - y0) * pad, mh);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return (beat.scene === "kitchen" ? kitchenBox : houseBox)(cx - w / 2, cy - h / 2, w, h);
}

/* ---------- The timeline. Times are in screens of scroll. ---------- */
const BEAT = 0.75;                       // one paint beat
const CAMERA = [                         // centre + r (size of the square that must fit), or a box to fit
  { u: 0.0, x: 470, y: 300, r: 760 },    // Toronto
  { u: 0.35, x: 470, y: 300, r: 760 },
  { u: 1.5, x: 362, y: 262, r: 70 },     // Forest Hill
  { u: 1.75, x: 362, y: 262, r: 70 },
  { u: 2.55, x: HOUSE_AT[0], y: HOUSE_AT[1], r: 7 }, // the lot
  { u: 3.2, box: HOUSE_FRAME },          // the house, unpainted
  { u: 3.55, box: HOUSE_FRAME },
];
const LAYERS = {
  toronto: { origin: [0, 0], k: 1, opacity: [[0, 1], [1.25, 1], [1.8, 0]] },
  labels: { origin: [0, 0], k: 1, opacity: [[0, 1], [0.65, 1], [1.0, 0]] },
  fh: { origin: [FH_RECT[0], FH_RECT[1]], k: 1 / FH_SCALE, opacity: [[0, 0], [0.9, 0], [1.45, 1], [2.5, 1], [2.85, 0]] },
  house: { origin: HOUSE_ORIGIN, k: HK, opacity: [[0, 0], [2.5, 0], [2.9, 1]] },
  kitchen: { origin: KITCHEN_ORIGIN, k: KK, opacity: [[0, 0]] },
};
const CHAPTERS = [
  { u: 0, fig: "", lead: "Located in", place: "Toronto", sub: "" },
  { u: 1.05, fig: "", place: "Forest Hill", sub: "and surrounding areas" },
  { u: 2.75, fig: "", lead: "", place: "Residential or Commercial", sub: "" },
];
const WIPES = []; // { key, u0, u1 }

const SPANS = []; // each beat: when it starts and ends, and its wipes in order (used by photo plates)
let t = 3.55, inKitchen = false, n = 1;
for (const beat of DATA.beats) {
  if (beat.scene === "kitchen" && !inKitchen) {          // zoom through the kitchen window
    CAMERA.push({ u: t + 0.4, box: WINDOW_BOX });
    LAYERS.kitchen.opacity.push([t + 0.22, 0], [t + 0.42, 1]);
    LAYERS.house.opacity.push([t + 0.28, 1], [t + 0.45, 0]);
    CHAPTERS.push({ u: t + 0.1, fig: "", place: "Interiors", sub: "", chip: null });
    t += 0.45;
    inKitchen = true;
  } else if (beat.scene === "house" && inKitchen) {      // and back out
    CAMERA.push({ u: t + 0.3, box: WINDOW_BOX });
    LAYERS.kitchen.opacity.push([t + 0.05, 1], [t + 0.22, 0]);
    LAYERS.house.opacity.push([t, 0], [t + 0.15, 1]);
    t += 0.3;
    inKitchen = false;
  }
  const box = focusBox(beat);
  const preps = (beat.preps || []).filter((pr) => DATA[beat.scene].wipes[pr.key]);
  if (preps.length) {
    // stages: as it is (weathered), then each prep, then the colour. Each stage is labelled.
    const stages = beat.stages || [];
    const per = 0.5, len = 0.45 + per * (preps.length + 1) + 0.2;
    CAMERA.push({ u: t + 0.3, box }, { u: t + len, box });
    CHAPTERS.push({ u: t + 0.08, fig: "", place: beat.label, sub: beat.caption, chip: null, steps: stages, stage: 0 });
    const keys = [];
    [...preps, beat].forEach((st, i) => {
      const a = t + 0.45 + per * i;
      WIPES.push({ key: st.key, u0: a + 0.06, u1: a + 0.36 });
      if (st === beat) for (const k of beat.alsoPaint || []) if (DATA[beat.scene].wipes[k]) WIPES.push({ key: k, u0: a + 0.06, u1: a + 0.36 });
      keys.push(st.key);
      CHAPTERS.push({ u: a - 0.04, fig: "", place: beat.label, sub: beat.caption, chip: null, steps: stages, stage: i + 1 });
    });
    SPANS.push({ key: beat.key, start: t, end: t + len, wipes: keys });
    t += len;
  } else {
    CAMERA.push({ u: t + 0.3, box }, { u: t + BEAT, box });
    WIPES.push({ key: beat.key, u0: t + 0.22, u1: t + 0.62 });
    CHAPTERS.push({ u: t + 0.08, fig: "", place: beat.label, sub: "", chip: beat });
    SPANS.push({ key: beat.key, start: t, end: t + BEAT, wipes: [beat.key] });
    t += BEAT;
  }
}
// leave room under the house for the Book a quote button
const FINALE_FRAME = HOUSE_FRAME; // the Book a quote button takes the bottom bar's place, not the drawing's
CAMERA.push({ u: t + 0.6, box: FINALE_FRAME, short: HOUSE_FRAME }, { u: t + 1.1, box: FINALE_FRAME, short: HOUSE_FRAME });
CHAPTERS.push({ u: t + 0.2, fig: "", lead: "", place: "Forest Hill Student Works Painting", sub: "", finale: true });
// The opening logo screen comes first: shift everything after it by INTRO screens.
const INTRO = 0.8;
for (const k of CAMERA) k.u += INTRO;
for (const L of Object.values(LAYERS)) for (const p of L.opacity) if (p[0] > 0) p[0] += INTRO;
for (const ch of CHAPTERS) ch.u += INTRO;
for (const w of WIPES) { w.u0 += INTRO; w.u1 += INTRO; }
for (const sp of SPANS) { sp.start += INTRO; sp.end += INTRO; }
const UNITS = t + 1.1 + INTRO; // length of the story in screens

/* ------------------------------------------------------------------------ */

// Visitors who prefer reduced motion get the still, step-by-step version instead
// (the .story-steps list in index.html); the animated stage never starts.
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)");
REDUCE.addEventListener("change", () => location.reload());
if (REDUCE.matches) document.documentElement.classList.add("reduce-motion");
else startStory();

function startStory() {
  const root = document.documentElement;
  const track = document.querySelector("[data-track]");
  const stage = document.querySelector("[data-stage]");
  const splash = document.querySelector("[data-splash]");
  const logo = document.querySelector("[data-splash-logo]");
  let logoZoom = -1, logoFade = -1;
  const bar = document.querySelector("[data-progress]");
  const hudEl = document.querySelector(".hud");
  const footEl = document.querySelector(".hud-foot");
  const hud = {
    fig: document.querySelector("[data-hud-eyebrow]"),
    place: document.querySelector("[data-hud-place]"),
    lead: document.querySelector("[data-hud-lead]"),
    steps: document.querySelector("[data-hud-steps]"),
    sub: document.querySelector("[data-hud-sub]"),
    chip: document.querySelector("[data-hud-chip]"),
    swatch: document.querySelector("[data-hud-swatch]"),
    colour: document.querySelector("[data-hud-colour]"),
  };
  const finale = document.querySelector("[data-finale]");

  const layers = Object.entries(LAYERS).map(([name, cfg]) => {
    const el = document.querySelector(`[data-layer="${name}"]`);
    el.querySelector("svg").removeAttribute("viewBox"); // with JS, 1 SVG unit = 1 CSS pixel; the camera does the scaling
    return { name, cfg, el, cam: el.querySelector(".cam"), shown: null };
  });

  track.style.setProperty("--units", UNITS);

  /* ---------- maths ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t); // smoothstep

  const wipes = {}; // key -> { el, travel, t }, filled as the drawings load
  let keys = []; // CAMERA resolved for the current screen size: { u, x, y, r }

  function segment(list, u) {
    if (u <= list[0].u) return [list[0], list[0], 0];
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i], b = list[i + 1];
      if (u <= b.u) return [a, b, ease((u - a.u) / (b.u - a.u))];
    }
    const last = list[list.length - 1];
    return [last, last, 0];
  }

  // Zoom so that the point being zoomed into stays still on screen: zoom on a log
  // scale and move the centre around that fixed point.
  function camera(u) {
    const [a, b, t] = segment(keys, u);
    if (a === b || t === 0) return a;
    const r = a.r * Math.pow(b.r / a.r, t);
    if (Math.abs(a.r - b.r) < 1e-9) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r };
    const fx = (a.x * b.r - b.x * a.r) / (b.r - a.r);
    const fy = (a.y * b.r - b.y * a.r) / (b.r - a.r);
    const k = r / a.r; // at r = b.r this lands exactly on b
    return { x: fx + (a.x - fx) * k, y: fy + (a.y - fy) * k, r };
  }

  function opacityAt(pairs, u) {
    if (u <= pairs[0][0]) return pairs[0][1];
    for (let i = 0; i < pairs.length - 1; i++) {
      const [u0, o0] = pairs[i], [u1, o1] = pairs[i + 1];
      if (u <= u1) return o0 + (o1 - o0) * ease((u - u0) / (u1 - u0));
    }
    return pairs[pairs.length - 1][1];
  }

  /* ---------- measuring ---------- */
  let vw = 0, vh = 0, unit = 0, trackTop = 0, top = 0, bottom = 0;
  const sceneEl = document.querySelector("[data-scene]");
  function measure() {
    const rect = stage.getBoundingClientRect();
    unit = rect.height;                                   // one "screen" of scrolling
    const stageTop = parseFloat(getComputedStyle(stage).top) || 0; // where the stage sticks
    trackTop = track.getBoundingClientRect().top + scrollY - stageTop;
    // The camera frames the middle row only (the words and the bottom bar have rows of their own)
    const sa = sceneEl.getBoundingClientRect();
    vw = sa.width;
    vh = sa.height;
    top = 0;
    bottom = 0;
    const availH = vh;
    const m = Math.min(vw, vh);
    keys = CAMERA.map((k) => {
      let x, y, r;
      if (k.box) {
        const [bx, by, bw, bh] = (vh < 520 && k.short) || k.box; // short screens: the button sits beside the house
        const S = Math.min(vw / bw, availH / bh) * 0.94;
        r = m / S;
        x = bx + bw / 2;
        y = by + bh / 2;
      } else ({ x, y, r } = k);
      const S = m / r;
      const shift = (top + availH / 2 - vh / 2) / S; // centre of the free area, not of the stage
      return { u: k.u, x, y: y - shift, r };
    });
  }

  /* ---------- drawing a frame ---------- */
  let chapter = -1;
  /* ---------- Photo plates (data/scenes.json) ----------
     When a beat has all its photos, a full-screen photo plate covers the drawing for
     that beat: the "after" photo wipes over the "before" one (and the deck goes
     dirty -> washed -> sanded -> stained), with a slow push-in, grain and a vignette. */
  const platesEl = document.querySelector("[data-plates]");
  const plates = [];
  let small = false; // set from "phoneSizes" in data/scenes.json
  function plateSrc(path) { return small ? path.replace(/(\.[a-z]+)$/i, "-1200$1") : path; }
  function addPlate(images, start, end, wipes, alt) {
    const el = document.createElement("div");
    el.className = "plate";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", alt || "");
    const imgs = images.map((path, i) => {
      const im = document.createElement("img");
      im.alt = "";
      im.decoding = "async";
      im.dataset.src = path;
      if (i) im.style.clipPath = "polygon(0 0, 0 0, 0 100%, 0 100%)";
      el.append(im);
      return im;
    });
    platesEl.append(el);
    plates.push({ el, imgs, start, end, wipes, loaded: false, shown: null });
  }
  function loadPlate(p) {
    p.loaded = true;
    for (const im of p.imgs) {
      im.onerror = () => { if (im.src.includes("-1200.")) im.src = im.dataset.src; }; // fall back to the full-size file
      im.src = plateSrc(im.dataset.src);
    }
  }
  async function setupPlates() {
    if (!platesEl) return;
    let cfg;
    try {
      const json = await (await fetch("data/scenes.json")).json();
      cfg = json.scenes || {};
      small = !!json.phoneSizes && matchMedia("(max-width: 700px)").matches;
    } catch { return; }
    const full = (o, ks) => o && ks.every((k) => o[k]);
    const ch = (i) => CHAPTERS[i] && CHAPTERS[i].u;
    const firstBeat = SPANS[0] ? SPANS[0].start : UNITS;
    const finaleU = CHAPTERS[CHAPTERS.length - 1].u;
    if (full(cfg.toronto, ["photo"])) addPlate([cfg.toronto.photo], INTRO * 0.6, ch(1), [], cfg.toronto.alt);
    if (full(cfg["forest-hill"], ["photo"])) addPlate([cfg["forest-hill"].photo], ch(1), ch(2), [], cfg["forest-hill"].alt);
    if (full(cfg.house, ["before"])) addPlate([cfg.house.before], ch(2), firstBeat, [], cfg.house.alt);
    if (full(cfg.house, ["after"])) addPlate([cfg.house.after], finaleU - 0.2, UNITS + 1, [], cfg.house.alt);
    for (const sp of SPANS) {
      const c = cfg[sp.key];
      const order = sp.key === "deck" ? ["before", "washed", "sanded", "after"] : ["before", "after"];
      if (!full(c, order) || c.use === false) continue;   // not all photos yet (or switched off): keep the drawing
      const wipes = sp.wipes.map((k) => WIPES.find((w) => w.key === k));
      addPlate(order.map((k) => c[k]), sp.start, sp.end, wipes, c.alt);
    }
    schedule();
  }
  function renderPlates(u) {
    for (const p of plates) {
      if (!p.loaded && u > p.start - 1.5 && u < p.end + 0.5) loadPlate(p);
      const o = Math.min(clamp((u - p.start) / 0.18, 0, 1), clamp((p.end + 0.12 - u) / 0.18, 0, 1));
      const show = o > 0.001;
      if (show !== p.shown) { p.el.style.visibility = show ? "visible" : "hidden"; p.shown = show; }
      if (!show) continue;
      p.el.style.opacity = o.toFixed(3);
      const k = clamp((u - p.start) / Math.max(p.end - p.start, 0.01), 0, 1);
      p.el.style.transform = `scale(${(1.06 + 0.05 * k).toFixed(4)}) translate3d(${(-1.2 * k).toFixed(3)}%, ${(-0.8 * k).toFixed(3)}%, 0)`;
      p.wipes.forEach((w, i) => {
        if (!w) return;
        const a = ease(clamp((u - w.u0) / (w.u1 - w.u0), 0, 1)) * 112; // slanted edge, like a brush pass
        p.imgs[i + 1].style.clipPath = `polygon(0 0, ${a.toFixed(2)}% 0, ${(a - 12).toFixed(2)}% 100%, 0 100%)`;
      });
    }
  }

  function render() {
    const u = clamp((scrollY - trackTop) / unit, 0, UNITS);
    const cam = camera(u);
    const S = Math.min(vw, vh) / cam.r; // screen pixels per map unit

    for (const L of layers) {
      const o = opacityAt(L.cfg.opacity, u);
      const show = o > 0.001;
      if (show !== L.shown) {
        L.el.style.visibility = show ? "visible" : "hidden";
        L.shown = show;
      }
      if (!show) continue;
      L.el.style.opacity = o.toFixed(3);
      const s = S * L.cfg.k;
      const tx = vw / 2 + (L.cfg.origin[0] - cam.x) * S;
      const ty = vh / 2 + (L.cfg.origin[1] - cam.y) * S;
      L.cam.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(6)})`;
    }

    let c = 0;
    for (let i = 0; i < CHAPTERS.length; i++) if (u >= CHAPTERS[i].u) c = i;
    if (c !== chapter) setChapter(c, chapter !== -1);

    for (const w of WIPES) setWipe(w.key, ease(clamp((u - w.u0) / (w.u1 - w.u0), 0, 1)));
    renderPlates(u);

    // Opening logo: zoom into the paintbrush and fade into the map
    const zoom = ease(clamp((u - 0.04) / (INTRO - 0.04), 0, 1));
    const fade = 1 - ease(clamp((u - INTRO * 0.4) / (INTRO * 0.6), 0, 1));
    if (fade !== logoFade || zoom !== logoZoom) {
      logoZoom = zoom;
      logoFade = fade;
      logo.style.transform = `scale(${Math.pow(9, zoom).toFixed(4)})`;
      splash.style.opacity = fade.toFixed(3);
      splash.style.visibility = fade > 0.001 ? "visible" : "hidden";
      root.classList.toggle("on-logo", fade > 0.5);
    }

    bar.style.transform = `scaleX(${(u / UNITS).toFixed(4)})`;
  }

  function setChapter(i, animate) {
    chapter = i;
    const ch = CHAPTERS[i];
    finale.classList.toggle("is-on", !!ch.finale);
    root.classList.toggle("finale-on", !!ch.finale);
    finale.inert = !ch.finale;
    const apply = () => {
      hud.fig.textContent = ch.fig;
      hud.place.textContent = ch.place;
      hud.lead.textContent = ch.lead ?? "We paint"; // the small line above the big word
      hud.lead.hidden = !hud.lead.textContent;
      hud.sub.textContent = ch.sub;
      if (ch.chip) {
        hud.swatch.style.background = ch.chip.hex2 ? `linear-gradient(135deg, ${ch.chip.hex} 50%, ${ch.chip.hex2} 50%)` : ch.chip.hex;
        hud.colour.textContent = `${ch.chip.label} · ${ch.chip.colour}`;
      }
      hud.chip.classList.toggle("is-on", !!ch.chip);
    if (ch.steps && ch.steps.length) {
      hud.steps.innerHTML = ch.steps.map((label, i) => `<li${i === ch.stage ? ' class="is-now"' : i < ch.stage ? ' class="is-done"' : ""}><b>${i + 1}</b>${label}</li>`).join("");
    }
    hud.steps.hidden = !(ch.steps && ch.steps.length);
    hud.chip.hidden = !hud.steps.hidden;
      hud.place.classList.remove("is-swapping");
      hud.sub.classList.remove("is-swapping");
    };
    if (!animate) return apply();
    hud.place.classList.add("is-swapping");
    hud.sub.classList.add("is-swapping");
    hud.chip.classList.add("is-swapping");
    setTimeout(() => { apply(); hud.chip.classList.remove("is-swapping"); }, 180);
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  }

  /* ---------- paint wipes: 0 = unpainted, 1 = fully painted ---------- */
  function setWipe(key, t) {
    const w = wipes[key];
    if (!w || w.t === t) return;
    w.t = t;
    w.el.setAttribute("transform", `translate(${(w.travel * t).toFixed(1)} 0)`);
  }

  measure();
  render();
  addEventListener("scroll", schedule, { passive: true });
  // if the words row changes height (e.g. labels wrap), re-fit the camera to the drawing row
  if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); schedule(); }).observe(sceneEl);
  addEventListener("resize", () => { measure(); schedule(); });

  // "Skip to booking" and "Book a quote" jump straight there (no slow scroll through the story)
  // and move keyboard focus to the booking section.
  document.querySelectorAll('a[href="#book"], a[href="#operator"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const headerH = parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 60;
      scrollTo({ top: target.getBoundingClientRect().top + scrollY - headerH - 8, behavior: "instant" });
      const heading = target.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      history.replaceState(null, "", a.getAttribute("href"));
    })
  );

  /* ---------- load the drawings after the first scene ---------- */
  async function loadLayer(name) {
    const L = layers.find((l) => l.name === name);
    const src = L.el.dataset.src;
    try {
      const text = await (await fetch(src)).text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const frag = document.createDocumentFragment();
      for (const node of [...doc.documentElement.children]) frag.append(document.importNode(node, true));
      L.cam.append(frag);
      const scene = DATA[name];
      L.cam.querySelectorAll("[data-wipe]").forEach((el) => {
        const key = el.dataset.wipe;
        wipes[key] = { el, travel: scene.wipes[key].travel, t: 0 };
      });
      if (new URLSearchParams(location.search).has("painted")) Object.keys(wipes).forEach((k) => setWipe(k, 1)); // preview: ?painted
      else schedule();
    } catch (err) {
      console.warn(`Could not load ${src}`, err);
    }
  }
  // Load the drawings while the logo shows
  (async () => {
    setupPlates();
    await loadLayer("fh");
    await Promise.all([loadLayer("house"), loadLayer("kitchen")]);
  })();
}
