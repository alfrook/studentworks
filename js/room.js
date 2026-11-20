// "Try your own room": take or choose a photo, tap the thing you want to repaint, pick a colour.
// Everything happens on the visitor's device in this page: the photo is never uploaded or stored.
// No libraries, no services, no cost.
//
// How it works
//  1. The photo is drawn to a canvas (at most MAX pixels on the long side) and converted to CIE Lab colour.
//  2. Tapping selects the connected area of similar colour around the tap (a "magic wand"): it follows smooth
//     changes in brightness (shading, light falloff) but stops at edges and at changes of colour.
//  3. The selected area is recoloured in Lab: the new colour's hue and lightness replace the old, while the
//     photo's own light and shadow (the variation around the area's average) are kept, so it still looks like a photo.
// Called from js/colours.js: mountRoom(stageEl, panelEl).

const MAX = 1100;                       // longest side of the working picture, in pixels
const MAX_AREAS = 5;
// what an area can be (the name is only a label), and the colour it starts with
const KINDS = { "Walls": "#8fa38a", "Ceiling": "#efe9dc", "Trim": "#f7f7f5", "Door": "#1f3557", "Garage door": "#1f2021", "Siding": "#1f3557", "Deck": "#7b4a2a", "Fence": "#9a6b43", "Other": "#b5654a" };
const NAMES = ["Walls", "Trim", "Door", "Ceiling", "Other"];       // the order new areas are named in
const COLOURS = [
  ["Bright white", "#f7f7f5"], ["Warm white", "#efe9dc"], ["Cream", "#e6dcc3"], ["Light grey", "#cfcfcc"],
  ["Greige", "#b9b2a6"], ["Soft blue", "#9fb7cf"], ["Sage green", "#8fa38a"], ["Slate blue", "#5f7a94"],
  ["Deep navy", "#1f3557"], ["Forest green", "#34523f"], ["Terracotta", "#b5654a"], ["Sunflower yellow", "#efb11d"],
  ["Red", "#b11f24"], ["Charcoal", "#3a3f44"], ["Black", "#1f2021"], ["Walnut stain", "#7b4a2a"], ["Cedar stain", "#9a6b43"],
];

/* ---------------------------------------------------------------- colour maths */
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const f3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
function rgbToLab(r, g, b, out, o) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const fx = f3((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const fy = f3(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const fz = f3((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  out[o] = 116 * fy - 16; out[o + 1] = 500 * (fx - fy); out[o + 2] = 200 * (fy - fz);
}
const inv3 = (t) => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
const gamma = (c) => { c = c <= 0 ? 0 : c >= 1 ? 1 : c; return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055); };
function labToRgb(L, a, b, out, o) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = inv3(fx) * 0.95047, y = inv3(fy), z = inv3(fz) * 1.08883;
  out[o] = gamma(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
  out[o + 1] = gamma(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  out[o + 2] = gamma(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
}
const hexLab = (hex) => { const o = new Float32Array(3); rgbToLab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), o, 0); return o; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* a box blur on one float plane (r = 2 smooths noise before the "wand" decides what is similar) */
function blurPlane(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let sum = 0; const row = y * W;
    for (let x = -r; x <= r; x++) sum += src[row + clamp(x, 0, W - 1)];
    for (let x = 0; x < W; x++) { tmp[row + x] = sum / n; sum += src[row + clamp(x + r + 1, 0, W - 1)] - src[row + clamp(x - r, 0, W - 1)]; }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[clamp(y, 0, H - 1) * W + x];
    for (let y = 0; y < H; y++) { out[y * W + x] = sum / n; sum += tmp[clamp(y + r + 1, 0, H - 1) * W + x] - tmp[clamp(y - r, 0, H - 1) * W + x]; }
  }
  return out;
}

/* ---------------------------------------------------------------- the component */
export function mountRoom(stage, panel, { onSummary = () => {} } = {}) {
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  let W = 0, H = 0;
  let orig = null;                 // Uint8ClampedArray, the photo as taken
  let Lf, Af, Bf, bL, bA, bB, grad; // Lab planes (and smoothed copies for the wand)
  let outImg = null, ctx = null, canvas = null;
  let seenBuf = new Uint8Array(0), stackBuf = new Int32Array(0);
  const areas = [];
  let active = -1, tool = "tap", brush = 16, showOriginal = false;

  /* ---------- the stage: a prompt, then the photo ---------- */
  stage.innerHTML = `
    <div class="room__empty" data-room-empty>
      <div class="room__empty-art" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M8 52V22L32 8l24 14v30z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="34" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="3"/></svg></div>
      <h3>Try colours on your own room</h3>
      <p>Take a photo of a room, then tap the wall, door or trim you want to change.</p>
      <div class="room__buttons">
        <button type="button" class="button button--cta" data-room-camera>Take a photo</button>
        <button type="button" class="button button--call" data-room-choose>Choose a photo</button>
      </div>
      <p class="room__privacy">Your photo stays on your device. It isn&#8217;t uploaded or saved.</p>
      <p class="room__tip">Tip: stand back, face the wall, and use good daylight.</p>
      <p class="room__error" data-room-error role="alert" hidden></p>
    </div>
    <div class="room__work" data-room-work hidden>
      <canvas data-room-canvas tabindex="0" role="img" aria-label="Your photo. Tap the part you want to repaint. Keyboard: arrow keys move the pointer, Enter selects."></canvas>
      <span class="room__cursor" data-room-cursor hidden></span>
      <span class="room__badge" data-room-badge hidden>Original photo</span>
    </div>
    <input type="file" accept="image/*" capture="environment" hidden data-room-input-camera>
    <input type="file" accept="image/*" hidden data-room-input-file>`;
  const $ = (s, root = stage) => root.querySelector(s);
  const empty = $("[data-room-empty]"), work = $("[data-room-work]"), errorEl = $("[data-room-error]");
  const cursorEl = $("[data-room-cursor]"), badge = $("[data-room-badge]");
  canvas = $("[data-room-canvas]");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!matchMedia("(pointer: coarse)").matches) $("[data-room-camera]").hidden = true;   // "Take a photo" is for phones and tablets
  $("[data-room-camera]").addEventListener("click", () => $("[data-room-input-camera]").click());
  $("[data-room-choose]").addEventListener("click", () => $("[data-room-input-file]").click());
  for (const inp of stage.querySelectorAll("input[type=file]")) inp.addEventListener("change", () => { const f = inp.files[0]; inp.value = ""; if (f) loadFile(f); });
  // drag a photo onto the stage (computers)
  stage.addEventListener("dragover", (e) => { e.preventDefault(); });
  stage.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });

  /* ---------- the panel ---------- */
  panel.innerHTML = `
    <p class="room__hint" data-room-hint aria-live="polite">Add a photo to begin.</p>
    <div class="room__body" data-room-body hidden>
      <div class="room__tools" role="group" aria-label="Tools">
        <button type="button" class="chip" data-tool="tap" aria-pressed="true">Tap to select</button>
        <button type="button" class="chip" data-tool="add" aria-pressed="false">Paint in</button>
        <button type="button" class="chip" data-tool="erase" aria-pressed="false">Erase</button>
        <button type="button" class="chip chip--ghost" data-undo>Undo</button>
        <button type="button" class="chip chip--ghost" data-compare aria-pressed="false">Hold to compare</button>
      </div>
      <label class="room__range" data-brush-wrap hidden><span>Brush size</span><input type="range" min="6" max="50" value="16" data-brush></label>
      <div class="room__areas" role="group" aria-label="Areas to repaint" data-areas></div>
      <label class="room__kind"><span>This area is</span><select data-kind>${Object.keys(KINDS).map((k) => `<option>${k}</option>`).join("")}</select></label>
      <fieldset class="room__colour" data-colour-wrap>
        <legend data-colour-legend>Colour</legend>
        <div class="swatches" data-swatches></div>
        <label class="room__custom"><input type="color" value="#8fa38a" data-custom><span>Any colour</span></label>
      </fieldset>
      <label class="room__range" data-tol-wrap><span>How much to select</span><input type="range" min="0" max="100" value="45" data-tol><small><span>Less</span><span>More</span></small></label>
      <p class="viz__summary" data-room-summary aria-live="polite"></p>
      <div class="room__actions">
        <a class="button button--cta" href="#book">Get a free quote for this look <span aria-hidden="true">&#8594;</span></a>
        <button type="button" class="button button--call" data-save>Save picture</button>
        <button type="button" class="chip chip--ghost" data-new>Use a different photo</button>
      </div>
      <p class="viz__note">Colours on screen are only approximate. Real colours look different in your light.</p>
    </div>`;
  const P = (s) => panel.querySelector(s);
  const hint = P("[data-room-hint]");
  const body = P("[data-room-body]");
  const swatches = P("[data-swatches]");
  swatches.innerHTML = COLOURS.map(([name, hex]) => `<label class="sw"><input type="radio" name="room-colour" value="${hex}" data-name="${name}"><span class="sw__dot" style="--c:${hex}"></span><span class="visually-hidden">${name}</span></label>`).join("");

  const say = (t) => { hint.textContent = t; };
  const fail = (t) => { errorEl.textContent = t; errorEl.hidden = !t; };

  /* ---------- loading a photo ---------- */
  function loadFile(file) {
    fail("");
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "")) { fail("That doesn’t look like a photo. Try a JPG or PNG."); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); start(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fail("That photo couldn’t be opened. Try a JPG or PNG, or take a new photo."); };
    img.src = url;
  }
  function start(img) {
    const sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    W = Math.max(2, Math.round(img.naturalWidth * sc)); H = Math.max(2, Math.round(img.naturalHeight * sc));
    canvas.width = W; canvas.height = H;
    ctx.drawImage(img, 0, 0, W, H);                    // (browsers apply the photo's rotation here)
    const data = ctx.getImageData(0, 0, W, H);
    orig = new Uint8ClampedArray(data.data);
    outImg = new ImageData(new Uint8ClampedArray(orig), W, H);
    const n = W * H, lab = new Float32Array(3);
    Lf = new Float32Array(n); Af = new Float32Array(n); Bf = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) { rgbToLab(orig[p], orig[p + 1], orig[p + 2], lab, 0); Lf[i] = lab[0]; Af[i] = lab[1]; Bf[i] = lab[2]; }
    bL = blurPlane(Lf, W, H, 2); bA = blurPlane(Af, W, H, 2); bB = blurPlane(Bf, W, H, 2);
    grad = new Float32Array(n);                         // how fast brightness changes: high = an edge
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = bL[i + 1] - bL[i - 1] + 0.5 * (bL[i - W + 1] - bL[i - W - 1] + bL[i + W + 1] - bL[i + W - 1]);
      const gy = bL[i + W] - bL[i - W] + 0.5 * (bL[i + W - 1] - bL[i - W - 1] + bL[i + W + 1] - bL[i - W + 1]);
      grad[i] = Math.hypot(gx, gy) / 3;
    }
    areas.length = 0; active = -1; tool = "tap";
    addArea();
    empty.hidden = true; work.hidden = false; body.hidden = false;
    stage.classList.add("is-photo");
    syncUI();
    say("Tap the wall (or whatever you want to repaint) in your photo.");
    stage.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  /* ---------- areas ---------- */
  function addArea() {
    if (areas.length >= MAX_AREAS) return;
    const used = new Set(areas.map((a) => a.name));
    const name = NAMES.find((n) => !used.has(n)) || "Other";
    const colour = KINDS[name];
    areas.push({ name, colour, userColour: false, colourName: COLOURS.find((c) => c[1] === colour)?.[0] || "Custom colour", tol: 45, actions: [], bin: new Uint8Array(W * H), alpha: new Uint8Array(W * H), lmean: 50, has: false });
    active = areas.length - 1;
  }
  const cur = () => areas[active];

  /* the "wand": connected pixels that look like the tapped one */
  function flood(sx, sy, tol, bin) {
    const i0 = sy * W + sx;
    let sL = 0, sA = 0, sB = 0, c = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = sx + dx, y = sy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x; sL += bL[i]; sA += bA[i]; sB += bB[i]; c++;
    }
    sL /= c; sA /= c; sB /= c;
    const tolC = 3.5 + tol * 0.2, tolL = 10 + tol * 0.6, stepL = 1.6 + tol * 0.05, edgeT = 3.2 + tol * 0.2;
    if (seenBuf.length !== W * H) { seenBuf = new Uint8Array(W * H); stackBuf = new Int32Array(W * H); }
    const seen = seenBuf, stack = stackBuf; seen.fill(0);
    let sp = 0; stack[sp++] = i0; seen[i0] = 1; bin[i0] = 1;
    while (sp) {
      const q = stack[--sp], x = q % W, y = (q / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x + 1 : k === 1 ? x - 1 : x, ny = k === 2 ? y + 1 : k === 3 ? y - 1 : y;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const p = ny * W + nx; if (seen[p]) continue; seen[p] = 1;
        if (grad[p] > edgeT) continue;
        if (Math.hypot(bA[p] - sA, bB[p] - sB) > tolC) continue;
        if (Math.abs(bL[p] - sL) > tolL || Math.abs(bL[p] - bL[q]) > stepL) continue;
        bin[p] = 1; stack[sp++] = p;
      }
    }
  }
  function stamp(bin, x, y, r, value) {
    const r2 = r * r;
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) <= r2) bin[yy * W + xx] = value;
    }
  }
  function feather(a, x0 = 0, y0 = 0, x1 = W, y1 = H) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    const bin = a.bin, al = a.alpha;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = clamp(y + dy, 0, H - 1) * W; for (let dx = -1; dx <= 1; dx++) s += bin[yy + clamp(x + dx, 0, W - 1)]; }
      al[y * W + x] = (s * 255 / 9) | 0;
    }
  }
  function rebuild(a) {                                  // replay the taps and brush strokes, soften the edge, measure the average light
    a.bin.fill(0);
    for (const act of a.actions) {
      if (act.k === "seed") flood(act.x, act.y, a.tol, a.bin);
      else for (const [x, y] of act.pts) stamp(a.bin, x, y, act.r, act.mode === "add" ? 1 : 0);
    }
    feather(a);
    let s = 0, n = 0;
    for (let i = 0; i < a.bin.length; i++) if (a.bin[i]) { s += Lf[i]; n++; }
    a.has = n > 20; a.lmean = n ? s / n : 50;
  }

  /* ---------- painting the result ---------- */
  const px = new Float32Array(3);
  function render(x0 = 0, y0 = 0, x1 = W, y1 = H) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    if (x1 <= x0 || y1 <= y0) return;
    const data = outImg.data, live = [];
    for (const a of areas) if (a.has || a.drawing) { const t = hexLab(a.colour); live.push({ a, Lt: t[0], at: t[1], bt: t[2], k: 0.35 + 0.65 * (t[0] / 100) }); }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * W + x, p = i * 4;
      let r = orig[p], g = orig[p + 1], b = orig[p + 2];
      if (!showOriginal) for (const v of live) {
        const w = v.a.alpha[i]; if (!w) continue;
        // new lightness = the target's, plus the photo's own light and shadow around the area's average
        labToRgb(clamp(v.Lt + (Lf[i] - v.a.lmean) * v.k, 1, 99), v.at, v.bt, px, 0);
        const m = w / 255; r = orig[p] + (px[0] - orig[p]) * m; g = orig[p + 1] + (px[1] - orig[p + 1]) * m; b = orig[p + 2] + (px[2] - orig[p + 2]) * m;
        // (later areas are painted over earlier ones, from the original photo)
      }
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
    }
    ctx.putImageData(outImg, 0, 0, x0, y0, x1 - x0, y1 - y0);
  }

  /* ---------- the panel's state ---------- */
  function syncUI() {
    const a = cur();
    P("[data-areas]").innerHTML = areas.map((v, i) => `<button type="button" class="area" data-area="${i}" aria-pressed="${i === active}"><i style="background:${v.colour}"></i>${v.name}</button>`).join("")
      + (areas.length < MAX_AREAS ? `<button type="button" class="area area--add" data-add-area>+ Add another area</button>` : "")
      + (areas.length > 1 ? `<button type="button" class="area area--remove" data-remove-area aria-label="Remove ${a.name}">Remove ${a.name}</button>` : "");
    P("[data-kind]").value = a.name;
    P("[data-colour-legend]").innerHTML = `${a.name} colour <span>${a.colourName}</span>`;
    const r = swatches.querySelector(`input[value="${a.colour}"]`);
    swatches.querySelectorAll("input").forEach((i) => { i.checked = i === r; });
    P("[data-custom]").value = a.colour;
    P("[data-tol]").value = a.tol;
    panel.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === tool)));
    P("[data-brush-wrap]").hidden = tool === "tap";
    P("[data-tol-wrap]").hidden = !a.actions.some((x) => x.k === "seed");
    const painted = areas.filter((v) => v.has);
    const text = painted.length ? painted.map((v) => `${v.name.toLowerCase()} in ${v.colourName.toLowerCase()}`).join(", ") : "";
    P("[data-room-summary]").textContent = text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : "";
    onSummary(text);
    canvas.style.touchAction = tool === "tap" ? "pan-y pinch-zoom" : "none";
    canvas.style.cursor = tool === "tap" ? "crosshair" : "cell";
  }

  /* ---------- tapping and brushing on the photo ---------- */
  const toImage = (e) => { const r = canvas.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) * W / r.width), 0, W - 1), clamp(Math.floor((e.clientY - r.top) * H / r.height), 0, H - 1)]; };
  function tapAt(x, y) {
    const a = cur();
    a.actions.push({ k: "seed", x, y });
    rebuild(a);
    render(); syncUI();
    say(a.has ? `Selected the ${a.name.toLowerCase()}. Pick a colour, or tap more of it to add to the selection. "Paint in" and "Erase" fix the edges.` : "That spot is too small. Tap a larger part of the wall.");
  }
  let down = null, stroke = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const [x, y] = toImage(e);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), ix: x, iy: y };
    if (tool !== "tap") {
      canvas.setPointerCapture(e.pointerId);
      const a = cur(); a.drawing = true;
      stroke = { k: "stroke", mode: tool, r: Math.round(brush * W / canvas.getBoundingClientRect().width), pts: [[x, y]] };
      stamp(a.bin, x, y, stroke.r, tool === "add" ? 1 : 0);
      feather(a, x - stroke.r - 2, y - stroke.r - 2, x + stroke.r + 3, y + stroke.r + 3);
      render(x - stroke.r - 3, y - stroke.r - 3, x + stroke.r + 4, y + stroke.r + 4);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!stroke) return;
    const [x, y] = toImage(e), last = stroke.pts[stroke.pts.length - 1], a = cur();
    const steps = Math.max(1, Math.ceil(Math.hypot(x - last[0], y - last[1]) / Math.max(2, stroke.r / 3)));
    for (let s = 1; s <= steps; s++) {
      const sx = Math.round(last[0] + (x - last[0]) * s / steps), sy = Math.round(last[1] + (y - last[1]) * s / steps);
      stamp(a.bin, sx, sy, stroke.r, stroke.mode === "add" ? 1 : 0);
      stroke.pts.push([sx, sy]);
      feather(a, sx - stroke.r - 2, sy - stroke.r - 2, sx + stroke.r + 3, sy + stroke.r + 3);
      render(sx - stroke.r - 3, sy - stroke.r - 3, sx + stroke.r + 4, sy + stroke.r + 4);
    }
  });
  const endPointer = (e) => {
    if (stroke) {
      const a = cur(); a.drawing = false; a.actions.push(stroke); stroke = null; rebuild(a); render(); syncUI();
      say("Done. Keep going, or pick a colour.");
    } else if (down && tool === "tap" && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 600) tapAt(down.ix, down.iy);
    down = null;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", () => { if (stroke) { cur().drawing = false; stroke = null; rebuild(cur()); render(); } down = null; });

  // keyboard: arrow keys move a pointer, Enter or Space selects (or paints a dot with the brush)
  let kx = 0.5, ky = 0.5;
  const placeCursor = () => { cursorEl.style.left = `${kx * 100}%`; cursorEl.style.top = `${ky * 100}%`; };
  canvas.addEventListener("focus", () => { if (canvas.matches(":focus-visible")) { cursorEl.hidden = false; placeCursor(); } });   // keyboard users only
  canvas.addEventListener("blur", () => { cursorEl.hidden = true; });
  canvas.addEventListener("keydown", (e) => {
    const d = (e.shiftKey ? 0.1 : 0.03);
    if (e.key === "ArrowLeft") kx = clamp(kx - d, 0, 1); else if (e.key === "ArrowRight") kx = clamp(kx + d, 0, 1);
    else if (e.key === "ArrowUp") ky = clamp(ky - d, 0, 1); else if (e.key === "ArrowDown") ky = clamp(ky + d, 0, 1);
    else if (e.key === "Enter" || e.key === " ") {
      const x = clamp(Math.round(kx * (W - 1)), 0, W - 1), y = clamp(Math.round(ky * (H - 1)), 0, H - 1), a = cur();
      if (tool === "tap") tapAt(x, y);
      else { a.actions.push({ k: "stroke", mode: tool, r: Math.round(brush * 2), pts: [[x, y]] }); rebuild(a); render(); syncUI(); }
    } else return;
    e.preventDefault(); placeCursor();
  });

  /* ---------- panel controls ---------- */
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.tool) { tool = t.dataset.tool; syncUI(); say(tool === "tap" ? "Tap the part of your photo you want to repaint." : tool === "add" ? "Paint over the parts that were missed." : "Paint over the parts that should stay as they were."); }
    else if (t.hasAttribute("data-undo")) { const a = cur(); if (a.actions.length) { a.actions.pop(); rebuild(a); render(); syncUI(); say("Undone."); } }
    else if (t.dataset.area !== undefined) { active = +t.dataset.area; syncUI(); say(`Now editing: ${cur().name}. Tap that part of your photo.`); }
    else if (t.hasAttribute("data-add-area")) { addArea(); tool = "tap"; syncUI(); say(`New area: ${cur().name}. Tap it in your photo.`); }
    else if (t.hasAttribute("data-remove-area")) { areas.splice(active, 1); active = Math.max(0, active - 1); render(); syncUI(); }
    else if (t.hasAttribute("data-new")) { reset(); }
    else if (t.hasAttribute("data-save")) save();
    else if (t.hasAttribute("data-compare") && e.detail === 0) { setCompare(!showOriginal); }   // keyboard: toggles
  });
  const cmp = P("[data-compare]");
  const setCompare = (on) => { showOriginal = on; cmp.setAttribute("aria-pressed", String(on)); badge.hidden = !on; render(); };
  cmp.addEventListener("pointerdown", (e) => { e.preventDefault(); setCompare(true); });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) cmp.addEventListener(ev, () => { if (showOriginal && !cmp.matches(":focus-visible")) setCompare(false); });
  panel.addEventListener("change", (e) => {
    const a = cur();
    if (e.target.matches('input[name="room-colour"]')) { a.colour = e.target.value; a.colourName = e.target.dataset.name; a.userColour = true; render(); syncUI(); }
    else if (e.target.matches("[data-custom]")) { a.colour = e.target.value; a.colourName = "Custom colour"; a.userColour = true; render(); syncUI(); }
    else if (e.target.matches("[data-kind]")) {        // naming the area: it starts with a sensible colour unless one was already chosen
      a.name = e.target.value;
      if (!a.userColour) { a.colour = KINDS[a.name]; a.colourName = COLOURS.find((c) => c[1] === a.colour)?.[0] || "Custom colour"; }
      render(); syncUI();
      say(`Now tap the ${a.name.toLowerCase()} in your photo${a.has ? " (or leave it as it is)" : ""}.`);
    }
  });
  panel.addEventListener("input", (e) => {
    if (e.target.matches("[data-custom]")) { const a = cur(); a.colour = e.target.value; a.colourName = "Custom colour"; a.userColour = true; render(); }
    else if (e.target.matches("[data-tol]")) { const a = cur(); a.tol = +e.target.value; if (!a._t) a._t = requestAnimationFrame(() => { a._t = 0; rebuild(a); render(); }); }
    else if (e.target.matches("[data-brush]")) brush = +e.target.value;
  });

  /* ---------- save / start over ---------- */
  function save() {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.drawImage(canvas, 0, 0);
    const label = "ForestHill Student Painters · colour idea", fs = Math.max(13, Math.round(W / 55));
    g.font = `600 ${fs}px system-ui, sans-serif`;
    const tw = g.measureText(label).width, pad = fs * 0.6;
    g.fillStyle = "rgba(17,17,17,0.6)"; g.fillRect(pad, H - fs * 2 - pad / 2, tw + pad * 2, fs * 1.6 + pad / 2);
    g.fillStyle = "#fff"; g.fillText(label, pad * 2, H - fs * 1.1 - pad / 2 + fs * 0.2);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "my-room-colour-idea.jpg", { type: "image/jpeg" });
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My colour idea" }); return; } } catch { return; }   // (cancelled share)
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/jpeg", 0.92);
  }
  function reset() {
    areas.length = 0; active = -1; orig = outImg = null;
    work.hidden = true; empty.hidden = false; body.hidden = true; stage.classList.remove("is-photo");
    say("Add a photo to begin."); onSummary("");
  }
  return { reset };
}
