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
  { u: 2.45, box: HOUSE_FRAME },         // straight into the house, unpainted
  { u: 2.8, box: HOUSE_FRAME },
];
const LAYERS = {
  toronto: { origin: [0, 0], k: 1, opacity: [[0, 1], [1.25, 1], [1.8, 0]] },
  labels: { origin: [0, 0], k: 1, opacity: [[0, 1], [0.65, 1], [1.0, 0]] },
  fh: { origin: [FH_RECT[0], FH_RECT[1]], k: 1 / FH_SCALE, opacity: [[0, 0], [0.9, 0], [1.45, 1], [1.85, 1], [2.08, 0]] },
  house: { origin: HOUSE_ORIGIN, k: HK, opacity: [[0, 0], [2.04, 0], [2.3, 1]] }, // after the map (and its pin) has gone
  kitchen: { origin: KITCHEN_ORIGIN, k: KK, opacity: [[0, 0]] },
};
const CHAPTERS = [
  { u: 0, fig: "", lead: "Located in", place: "Toronto", sub: "" },
  { u: 1.05, fig: "", place: "Forest Hill", sub: "and surrounding areas" },
  { u: 2.2, fig: "", lead: "", place: "Residential or Commercial", sub: "" },
];
const WIPES = []; // { key, u0, u1 }

const SPANS = []; // each beat: when it starts and ends, and its wipes in order (used by photo plates)
let t = 2.8, inKitchen = false, n = 1;
for (const beat of DATA.beats) {
  if (beat.scene === "kitchen" && !inKitchen) {          // zoom through the kitchen window
    CAMERA.push({ u: t + 0.4, box: WINDOW_BOX });
    LAYERS.house.opacity.push([t + 0.12, 1], [t + 0.27, 0]);   // the house fades out first...
    LAYERS.kitchen.opacity.push([t + 0.27, 0], [t + 0.42, 1]); // ...then the room fades in: never both at once
    CHAPTERS.push({ u: t + 0.1, fig: "", place: "Interiors", sub: "", chip: null });
    t += 0.45;
    inKitchen = true;
  } else if (beat.scene === "house" && inKitchen) {      // and back out
    CAMERA.push({ u: t + 0.3, box: WINDOW_BOX });
    LAYERS.kitchen.opacity.push([t + 0.02, 1], [t + 0.14, 0]);
    LAYERS.house.opacity.push([t + 0.14, 0], [t + 0.28, 1]);
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
      WIPES.push({ key: st.key, u0: a - 0.04, u1: a + 0.34 }); // a slow sweep across the deck
      if (st === beat) for (const k of beat.alsoPaint || []) if (DATA[beat.scene].wipes[k]) WIPES.push({ key: k, u0: a - 0.04, u1: a + 0.34 });
      keys.push(st.key);
      CHAPTERS.push({ u: a - 0.04, fig: "", place: beat.label, sub: beat.caption, chip: null, steps: stages, stage: i + 1 });
    });
    SPANS.push({ key: beat.key, start: t, end: t + len, wipes: keys });
    t += len;
  } else {
    CAMERA.push({ u: t + 0.3, box }, { u: t + BEAT, box });
    WIPES.push({ key: beat.key, u0: t + 0.22, u1: t + 0.62 });
    CHAPTERS.push({ u: t + 0.08, fig: "", place: beat.label, sub: "", chip: null });
    SPANS.push({ key: beat.key, start: t, end: t + BEAT, wipes: [beat.key] });
    t += BEAT;
  }
}
/* ---------- Film mode (data in index.html #film-data) ----------
   When the filmed story is switched on, it plays on its own like a video (no scrolling):
   the logo, then the film with the words above it, then Book a quote. Story time is
   then in seconds of the film, and the logo zooms away during its first INTRO seconds.
   The drawings stay for reduced motion / no JavaScript, and come back (scroll-driven)
   when "use" is false. */
const INTRO = 0.8; // the opening logo screen: screens of scrolling, or seconds in film mode
const FILM = (() => {
  try {
    const f = JSON.parse(document.getElementById("film-data")?.textContent || "null");
    return f && f.use ? f : null;
  } catch { return null; }
})();
if (FILM) {
  CAMERA.length = 0;
  CAMERA.push({ u: 0, x: 470, y: 300, r: 760 });
  for (const L of Object.values(LAYERS)) L.opacity = [[0, 0]];  // drawings hidden
  CHAPTERS.length = 0;
  for (const c of FILM.chapters) CHAPTERS.push({ u: Math.max(0, c.t - INTRO), fig: "", lead: c.lead, place: c.place, sub: c.sub || "", chip: null });
  WIPES.length = 0;
  SPANS.length = 0;
  t = 1e4; // the end card's time is set from the video's length once it loads
}
// leave room under the house for the Book a quote button
const FINALE_FRAME = HOUSE_FRAME; // the Book a quote button takes the bottom bar's place, not the drawing's
CAMERA.push({ u: t + 0.6, box: FINALE_FRAME, short: HOUSE_FRAME }, { u: t + 1.1, box: FINALE_FRAME, short: HOUSE_FRAME });
CHAPTERS.push({ u: t + 0.2, fig: "", lead: "", place: "ForestHill Student Painters", sub: "", finale: true });
// The opening logo screen comes first: shift everything after it by INTRO screens.
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

  /* ---------- Film: plays on its own like a video; when it ends you can scroll back and forth through it ---------- */
  // mode "auto": it plays by itself and the page is locked (it's a video).
  // mode "scrub": the film has ended (or was paused); scrolling moves through it, forwards and back.
  const film = FILM && document.querySelector("[data-film]");
  const ctl = document.querySelector("[data-story-ctl]");
  const bigPlay = document.querySelector("[data-film-play]");
  const SCRUB = FILM ? FILM.scrub ?? 6 : 0;       // screens of scrolling for the whole film
  let D = FILM ? FILM.duration || 13 : 0;         // film length in seconds (corrected from the file once it loads)
  let outroAt = D + (FILM ? FILM.end ?? 0.4 : 0); // story time when the logo starts coming back
  let filmEnd = outroAt + INTRO;                  // story time when the logo is fully back
  let mode = "auto";
  let scrubU = 0;         // story time (seconds) in scrub mode
  let endedAt = 0;        // when the film finished (performance.now), 0 while it plays
  let introDone = false;  // the opening logo has zoomed away
  let zooming = false, zoomStart = 0;   // the logo is zooming away (the film waits on its first picture until it is gone)
  let wanted = true;      // false once the visitor pauses
  let running = false;
  let seeking = false, seekWanted = null;
  function filmClock() {
    if (mode === "scrub") return scrubU;
    if (endedAt) return Math.min(filmEnd, D + (performance.now() - endedAt) / 1000);
    return film.currentTime;
  }
  function tick() {
    render();
    if (mode === "auto" && endedAt && filmClock() >= filmEnd) { running = false; enterScrub(filmEnd); return; }
    if (mode === "auto" && running) requestAnimationFrame(tick);
    else running = false;
  }
  function run() { if (!running) { running = true; requestAnimationFrame(tick); } }
  // The logo zooms away first, over the film's first picture, and only then does the film play,
  // so none of the film's seconds are hidden behind the logo.
  function beginZoom() {
    if (introDone) { play(); return; }
    zooming = true; zoomStart = performance.now();
    requestAnimationFrame(zoomLoop);
  }
  function zoomLoop() {
    if (!zooming) return;
    render();
    if ((performance.now() - zoomStart) / 1000 >= INTRO) {
      zooming = false; introDone = true; render();
      if (wanted && mode === "auto") play();
      return;
    }
    requestAnimationFrame(zoomLoop);
  }
  let ctlState = "";
  function setCtl() {
    const state = mode === "auto" ? "pause" : scrubU >= D - 0.05 ? "replay" : "play";
    if (state === ctlState) return;
    ctlState = state;
    ctl.dataset.state = state;
    ctl.setAttribute("aria-label", { pause: "Pause the film", play: "Play the film", replay: "Watch it again" }[state]);
  }
  // seek the video to a time, one seek at a time (a new one starts when the last has landed)
  function seekTo(t) {
    t = clamp(t, 0, D);
    if (Math.abs(film.currentTime - t) < 0.012) return;
    if (seeking) { seekWanted = t; return; }
    seeking = true;
    try { film.currentTime = t; } catch { seeking = false; }
  }
  function enterScrub(u) {
    mode = "scrub";
    zooming = false;
    running = false;
    wanted = false;
    endedAt = 0;
    film.pause();
    scrubU = clamp(u, 0, filmEnd);
    root.classList.remove("story-lock");
    bigPlay.hidden = true;
    ctl.hidden = false;
    measure();
    scrollTo({ top: trackTop + (scrubU / filmEnd) * SCRUB * unit, behavior: "instant" }); // the scroll bar matches where the film is
    seekTo(Math.min(scrubU, D));
    setCtl();
    render();
  }
  function lock() { root.classList.add("story-lock"); }
  function unlockInPlace() {                          // stop the film and free the page, without moving the scroll position
    if (mode !== "auto") return;
    mode = "scrub"; running = false; wanted = false; endedAt = 0; introDone = true; zooming = false;
    film.pause();
    root.classList.remove("story-lock");
    bigPlay.hidden = true;
    ctl.hidden = false;
    setCtl();
    schedule();
  }
  function restart() {                                // watch it again from the start
    scrollTo({ top: 0, behavior: "instant" });
    lock();
    mode = "auto"; wanted = true; endedAt = 0; introDone = false; zooming = false; scrubU = 0;
    bigPlay.hidden = true; ctl.hidden = false;
    seekWanted = null;
    try { film.currentTime = 0; } catch {}
    setCtl();
    render();
    beginZoom();
  }
  function resume() {                                 // carry on from where it was paused
    if (scrubU >= D - 0.05) return restart();
    lock();
    mode = "auto"; wanted = true; endedAt = 0; introDone = scrubU >= INTRO;
    bigPlay.hidden = true;
    try { film.currentTime = scrubU; } catch {}
    setCtl();
    play();
  }
  function play() {
    film.muted = true;
    film.playbackRate = FILM.rate || 1;
    const p = film.play();
    if (p && p.catch) p.catch((e) => {
      if (e && e.name !== "NotAllowedError") return; // still loading: it starts when it's ready
      // autoplay blocked (iPhone Low Power Mode, some in-app browsers): show the first shot, a big Play button, and let them scroll
      enterScrub(INTRO);
      ctl.hidden = true;
      bigPlay.hidden = false;
    });
  }
  function showStill() {                              // the video can't play here at all: the first picture and the words, scrollable
    enterScrub(INTRO);
    ctl.hidden = true;
  }
  function startFilm() {
    film.hidden = false;
    document.querySelector(".story").classList.add("story--play");
    document.querySelector(".scroll-cue")?.setAttribute("hidden", "");
    track.style.setProperty("--units", SCRUB);
    ctl.hidden = false;
    if (CHAPTERS[CHAPTERS.length - 1].finale) CHAPTERS.pop(); // the film ends on the logo, not on an end card
    const timed = () => {
      if (film.duration && isFinite(film.duration)) D = film.duration;
      outroAt = D + (FILM.end ?? 0.4);
      filmEnd = outroAt + INTRO;
    };
    if (film.readyState >= 1) timed(); else film.addEventListener("loadedmetadata", timed, { once: true });
    film.addEventListener("playing", run);
    film.addEventListener("seeked", () => {
      seeking = false;
      if (seekWanted !== null) { const t = seekWanted; seekWanted = null; seekTo(t); }
      schedule();
    });
    film.addEventListener("ended", () => { if (mode === "auto") { endedAt = performance.now(); ctl.hidden = true; run(); } });
    // Some hosts can't send a video in pieces, and iPhones won't play it then: download it whole and play it from memory.
    let triedWhole = false;
    film.addEventListener("error", () => {
      if (triedWhole) return showStill();
      triedWhole = true;
      fetch(FILM.src)
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((b) => { film.src = URL.createObjectURL(b.type ? b : new Blob([b], { type: "video/mp4" })); film.load(); })
        .catch(showStill);
    }, true);
    document.querySelector("[data-splash-replay]")?.addEventListener("click", restart);   // "Watch again" on the end logo screen
    ctl.addEventListener("click", () => {
      if (mode === "auto") { wanted = false; film.pause(); enterScrub(film.currentTime); }   // pausing lets you look around
      else resume();
    });
    bigPlay.addEventListener("click", restart);
    // scrolling moves through the film once it has ended
    addEventListener("scroll", () => { if (mode === "scrub") schedule(); }, { passive: true });
    let started = false;   // (no need to pause when scrolled away: while it plays by itself the page is locked)
    // the logo shows for a moment and covers the loading: the film starts once enough of it
    // has downloaded to play straight through without stalling (or after 4 s on a slow connection)
    let held = false, ready = film.readyState >= 4;
    const go = () => {
      if (started || !held || !ready) return;
      started = true;
      if (wanted && mode === "auto") beginZoom();
    };
    film.addEventListener("canplaythrough", () => {
      ready = true;
      if (started && wanted && mode === "auto" && !endedAt && film.paused) play(); // e.g. ready after downloading it whole
      go();
    });
    // arriving part-way down the page (a reload, the back button, a link to #book): no lock, no autoplay.
    // The film is simply there to scroll through, and the play button is in the bar.
    // (a "#" on the address only counts when it names a real section: a host page can add its own)
    let deepLink = false;
    try { deepLink = location.hash.length > 1 && !!document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
    if (deepLink || scrollY > 80) {
      mode = "scrub"; wanted = false; introDone = true; started = true;
      scrubU = filmEnd;
      setCtl();
      return;
    }
    lock();
    setTimeout(() => { held = true; go(); }, (FILM.hold ?? 0.5) * 1000);
    setTimeout(() => { ready = true; go(); }, 4000);
    // safety net: if the film still hasn't started after 8 s (blocked, or stuck loading), show the first shot with a big Play button
    // rather than leaving the visitor looking at a logo
    setTimeout(() => {
      if (mode !== "auto" || endedAt || !film.paused || !wanted) return;
      enterScrub(INTRO);
      ctl.hidden = true;
      bigPlay.hidden = false;
    }, 8000);
  }

  function render() {
    if (film && mode === "scrub") scrubU = clamp((scrollY - trackTop) / (SCRUB * unit), 0, 1) * filmEnd;
    const u = film ? filmClock() : clamp((scrollY - trackTop) / unit, 0, UNITS);
    if (film && mode === "scrub") { seekTo(Math.min(u, D)); setCtl(); }
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
    if (c !== chapter) setChapter(c);

    for (const w of WIPES) setWipe(w.key, ease(clamp((u - w.u0) / (w.u1 - w.u0), 0, 1)));
    if (!film) renderPlates(u);

    // Opening logo: zoom into the paintbrush and fade into the map (or the film)
    if (film && u >= INTRO) introDone = true;
    // film: the logo opens it, and comes back at the end (zooming out); scrolling back through it plays this both ways
    let su = introDone ? INTRO : zooming ? (performance.now() - zoomStart) / 1000 : u;
    if (film) su = u >= outroAt ? INTRO * (1 - clamp((u - outroAt) / INTRO, 0, 1)) : mode === "scrub" ? Math.min(u, INTRO) : su;
    const zoom = ease(clamp((su - 0.04) / (INTRO - 0.04), 0, 1));
    const fade = 1 - ease(clamp((su - INTRO * 0.4) / (INTRO * 0.6), 0, 1));
    if (fade !== logoFade || zoom !== logoZoom) {
      logoZoom = zoom;
      logoFade = fade;
      logo.style.transform = `scale(${Math.pow(9, zoom).toFixed(4)})`;
      splash.style.opacity = fade.toFixed(3);
      splash.style.visibility = fade > 0.001 ? "visible" : "hidden";
      splash.style.pointerEvents = fade > 0.9 ? "auto" : "none"; // a fading logo must not block the buttons underneath
    }
    // the header stays hidden while the logo fills the screen, and comes back once the story has scrolled away
    root.classList.toggle("on-logo", fade > 0.5 && (!film || track.getBoundingClientRect().bottom > innerHeight * 0.6));
    if (film) root.classList.toggle("show-cue", mode === "scrub" && fade > 0.9 && bigPlay.hidden);

    bar.style.transform = `scaleX(${clamp(u / (film ? filmEnd : UNITS), 0, 1).toFixed(4)})`;
  }

  // Swap the words instantly: one element per line, its text replaced in one go, so two
  // words can never be on screen at once (no timers, no cross-fading text).
  const fadeIn = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setText(el, text) {
    if (el.textContent === text) return false;
    el.textContent = text;
    return true;
  }
  // The words glide instead of snapping. The old word slides up and fades out first; only then does the new one rise into
  // place and fade in, one after the other inside a clipped box, so two words are never on screen over each other.
  const ghost = document.querySelector("[data-hud-ghost]");
  let placeToken = 0, leadToken = 0;
  function flowPlace(text) {
    const old = hud.place.textContent;
    hud.place.style.opacity = "";
    if (old === text) return;
    hud.place.textContent = text;
    if (!fadeIn || !hud.place.animate || !ghost || !old) return;
    const my = ++placeToken;
    hud.place.getAnimations().forEach((a) => a.cancel());
    ghost.getAnimations().forEach((a) => a.cancel());
    ghost.textContent = old;
    ghost.hidden = false;
    hud.place.style.opacity = "0";                      // waits, unseen, until the old word has gone
    const out = ghost.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-40%)" }], { duration: 170, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    out.onfinish = () => {
      if (my !== placeToken) return;
      ghost.hidden = true;
      hud.place.animate([{ opacity: 0, transform: "translateY(42%)" }, { opacity: 1, transform: "none" }], { duration: 430, easing: "cubic-bezier(.2,.8,.2,1)" });
      hud.place.style.opacity = "";                     // from here the animation sets the opacity
    };
  }
  function flowLead(text) {
    const had = hud.lead.textContent;
    if (had === text) { hud.lead.hidden = !text; return; }
    const quick = !fadeIn || !hud.lead.animate;
    const set = () => { setText(hud.lead, text); hud.lead.hidden = !text; };
    const my = ++leadToken;
    hud.lead.getAnimations().forEach((a) => a.cancel());
    if (quick) { set(); return; }
    if (!had) { set(); hud.lead.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 200, easing: "ease-out", fill: "backwards" }); return; }
    const out = hud.lead.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
    out.onfinish = () => {
      if (my !== leadToken) return;
      set();
      out.cancel();
      if (text) hud.lead.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 340, easing: "ease-out" });
    };
  }
  function flowSub(text) {
    if (hud.sub.textContent === text) return;
    setText(hud.sub, text);
    if (fadeIn && hud.sub.animate && text) hud.sub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 460, delay: 260, easing: "ease-out", fill: "backwards" });
  }
  function setChapter(i) {
    chapter = i;
    const ch = CHAPTERS[i];
    finale.classList.toggle("is-on", !!ch.finale);
    root.classList.toggle("finale-on", !!ch.finale);
    finale.inert = !ch.finale;
    const lead = ch.lead ?? "We paint"; // the small line above the big word
    flowLead(lead);
    flowSub(ch.sub || "");
    flowPlace(ch.place);
    const hasSteps = !!(ch.steps && ch.steps.length);
    if (hasSteps) {
      const html = ch.steps.map((label, k) => `<li${k === ch.stage ? ' class="is-now"' : k < ch.stage ? ' class="is-done"' : ""}><b>${k + 1}</b>${label}</li>`).join("");
      if (hud.steps.innerHTML !== html) hud.steps.innerHTML = html;
    }
    hud.steps.hidden = !hasSteps;
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

  if (film) startFilm();
  if (film) document.addEventListener("focusin", (e) => { if (!e.target.closest(".story, .site-header")) unlockInPlace(); });
  measure();
  render();
  if (!film) addEventListener("scroll", schedule, { passive: true });
  // if the words row changes height (e.g. labels wrap), re-fit the camera to the drawing row
  // when the layout changes size (turning the phone, resizing the window) keep the film at the same point
  function relayout() {
    const keep = film && mode === "scrub" && scrollY < trackTop + SCRUB * unit ? scrubU / filmEnd : null, was = unit;
    measure();
    if (keep !== null && Math.abs(unit - was) > 2) scrollTo({ top: trackTop + keep * SCRUB * unit, behavior: "instant" });
    schedule();
  }
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(sceneEl);
  addEventListener("resize", relayout);

  // "Skip to booking" and "Book a quote" jump straight there (no slow scroll through the story)
  // and move keyboard focus to the booking section.
  document.querySelectorAll('a[href="#book"], a[href="#operator"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (film) unlockInPlace();
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
  // Load the drawings while the logo shows (not needed when the film plays instead)
  if (!film) (async () => {
    setupPlates();
    await loadLayer("fh");
    await Promise.all([loadLayer("house"), loadLayer("kitchen")]);
  })();
}
