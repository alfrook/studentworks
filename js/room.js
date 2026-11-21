// "Try your own room": add a photo and it finds what can be painted (walls, ceiling, doors...) and paints it.
// Everything happens on the visitor's device in this page: the photo is never uploaded or stored.
// No libraries, no services, no cost.
//
// How it works
//  1. The photo is drawn to a canvas (at most MAX pixels on the long side) and converted to CIE Lab colour.
//  2. SENSING: the picture is split into smooth surfaces. Starting from the spot deepest inside an unclaimed
//     flat area, a region is grown over pixels of similar colour (following shading, stopping at edges), the
//     edge is tidied, and the next-flattest unclaimed spot is used, until most of the picture is covered.
//  3. Each surface is named from where it sits and what shape it is: touching the top = ceiling (or sky), touching
//     the bottom = floor (not painted), tall and rectangular = door, otherwise wall. Walls in the same colour family
//     (the lit and shaded sides of a corner) are joined as one.
//  4. The walls are painted straight away. Painting recolours in Lab: the new colour's hue and lightness replace the
//     old, while the photo's own light and shadow around the surface's average are kept, so it still looks like a photo.
//  5. Tapping the photo picks the surface under the finger (or, if nothing was found there, grows a new one).
// Called from js/colours.js: mountRoom(stageEl, panelEl).

const MAX = 960;                        // longest side of the working picture, in pixels
const MAX_AREAS = 7;
const KINDS = { "Walls": "#8fa38a", "Ceiling": "#f7f7f5", "Trim": "#f7f7f5", "Door": "#1f3557", "Garage door": "#1f2021", "Siding": "#1f3557", "Deck": "#7b4a2a", "Fence": "#9a6b43", "Other": "#b5654a" };
const COLOURS = [
  ["Bright white", "#f7f7f5"], ["Warm white", "#efe9dc"], ["Cream", "#e6dcc3"], ["Light grey", "#cfcfcc"],
  ["Greige", "#b9b2a6"], ["Soft blue", "#9fb7cf"], ["Sage green", "#8fa38a"], ["Slate blue", "#5f7a94"],
  ["Deep navy", "#1f3557"], ["Forest green", "#34523f"], ["Terracotta", "#b5654a"], ["Sunflower yellow", "#efb11d"],
  ["Red", "#b11f24"], ["Charcoal", "#3a3f44"], ["Black", "#1f2021"], ["Walnut stain", "#7b4a2a"], ["Cedar stain", "#9a6b43"],
];
const colourName = (hex) => COLOURS.find((c) => c[1] === hex)?.[0] || "Custom colour";

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

/* a box blur on one float plane (smooths noise before deciding what is similar) */
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
  let W = 0, H = 0;
  let orig = null;                  // the photo as taken (RGBA bytes)
  let Lf, Af, Bf, bL, bA, bB;       // Lab planes, and smoothed copies (what the sensing compares)
  let label = null;                 // per pixel: which piece of the picture it belongs to
  let pieces = new Map();           // piece id -> its measurements
  let regionArea = [];              // piece id -> index in areas[] (or nothing: floor, sky, etc.)
  let outImg = null, ctx = null, canvas = null;
  const areas = [];
  let active = -1, showOriginal = false, busy = false;

  /* ---------- the stage: a prompt, then the photo ---------- */
  stage.innerHTML = `
    <div class="room__empty" data-room-empty>
      <div class="room__empty-art" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M8 52V22L32 8l24 14v30z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="34" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="3"/></svg></div>
      <h3>Try colours on your own room</h3>
      <p>Add a photo of a room. We find the walls and other paintable surfaces and paint them for you.</p>
      <div class="room__buttons">
        <button type="button" class="button button--cta" data-room-camera>Take a photo</button>
        <button type="button" class="button button--call" data-room-choose>Choose a photo</button>
      </div>
      <p class="room__privacy">Your photo stays on your device. It isn&#8217;t uploaded or saved.</p>
      <p class="room__tip">Tip: stand back, face the wall, and use good daylight.</p>
      <p class="room__error" data-room-error role="alert" hidden></p>
    </div>
    <div class="room__work" data-room-work hidden>
      <canvas data-room-canvas tabindex="0" role="img" aria-label="Your photo. Tap a part of it to paint that part. Keyboard: arrow keys move the pointer, Enter selects."></canvas>
      <span class="room__cursor" data-room-cursor hidden></span>
      <span class="room__badge" data-room-badge hidden>Original photo</span>
      <div class="room__scan" data-room-scan hidden><span>Looking for walls, doors and ceilings&#8230;</span></div>
      <button type="button" class="room__compare" data-compare aria-pressed="false">Hold to compare</button>
    </div>
    <input type="file" accept="image/*" capture="environment" hidden data-room-input-camera>
    <input type="file" accept="image/*" hidden data-room-input-file>`;
  const $ = (s, root = stage) => root.querySelector(s);
  const empty = $("[data-room-empty]"), work = $("[data-room-work]"), errorEl = $("[data-room-error]");
  const cursorEl = $("[data-room-cursor]"), badge = $("[data-room-badge]"), scan = $("[data-room-scan]"), cmp = $("[data-compare]");
  canvas = $("[data-room-canvas]");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!matchMedia("(pointer: coarse)").matches) $("[data-room-camera]").hidden = true;   // "Take a photo" is for phones and tablets
  $("[data-room-camera]").addEventListener("click", () => $("[data-room-input-camera]").click());
  $("[data-room-choose]").addEventListener("click", () => $("[data-room-input-file]").click());
  for (const inp of stage.querySelectorAll("input[type=file]")) inp.addEventListener("change", () => { const f = inp.files[0]; inp.value = ""; if (f) loadFile(f); });
  stage.addEventListener("dragover", (e) => { e.preventDefault(); });                    // drag a photo onto the stage (computers)
  stage.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });

  /* ---------- the panel ---------- */
  panel.innerHTML = `
    <p class="room__hint" data-room-hint aria-live="polite">Add a photo to begin.</p>
    <div class="room__body" data-room-body hidden>
      <div class="room__areas" role="group" aria-label="Surfaces we found" data-areas></div>
      <fieldset class="room__colour">
        <legend data-colour-legend>Colour</legend>
        <div class="swatches" data-swatches></div>
        <label class="room__custom"><input type="color" value="#8fa38a" data-custom><span>Any colour</span></label>
      </fieldset>
      <label class="room__kind" data-kind-wrap hidden><span>This area is</span><select data-kind>${Object.keys(KINDS).map((k) => `<option>${k}</option>`).join("")}</select></label>
      <label class="room__range" data-tol-wrap hidden><span>How much to select</span><input type="range" min="0" max="100" value="45" data-tol><small><span>Less</span><span>More</span></small></label>
      <p class="viz__summary" data-room-summary aria-live="polite"></p>
      <div class="room__actions">
        <a class="button button--cta" href="#book">Get a free quote for this look <span aria-hidden="true">&#8594;</span></a>
        <button type="button" class="button button--call" data-save>Save picture</button>
        <button type="button" class="chip chip--ghost" data-new>Use a different photo</button>
      </div>
      <p class="viz__note">Colours on screen are only approximate. Real colours look different in your light.</p>
    </div>`;
  const P = (s) => panel.querySelector(s);
  const hint = P("[data-room-hint]"), body = P("[data-room-body]"), swatches = P("[data-swatches]");
  swatches.innerHTML = COLOURS.map(([name, hex]) => `<label class="sw"><input type="radio" name="room-colour" value="${hex}" data-name="${name}"><span class="sw__dot" style="--c:${hex}"></span><span class="visually-hidden">${name}</span></label>`).join("");
  const say = (t) => { hint.textContent = t; };
  const fail = (t) => { errorEl.textContent = t; errorEl.hidden = !t; };

  /* ---------- loading a photo ---------- */
  function loadFile(file) {
    if (busy) return;
    fail("");
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "")) { fail("That doesn’t look like a photo. Try a JPG or PNG."); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); start(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fail("That photo couldn’t be opened. Try a JPG or PNG, or take a new photo."); };
    img.src = url;
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
  async function start(img) {
    busy = true;
    const sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    W = Math.max(2, Math.round(img.naturalWidth * sc)); H = Math.max(2, Math.round(img.naturalHeight * sc));
    canvas.width = W; canvas.height = H;
    ctx.drawImage(img, 0, 0, W, H);                    // (browsers apply the photo's rotation here)
    empty.hidden = true; work.hidden = false; body.hidden = true; scan.hidden = false;
    stage.classList.add("is-photo");
    say("Looking for the walls, ceiling and doors…");
    await nextFrame();                                  // let the picture and the scanning animation appear first
    try {
      prepare();
      detect();
    } catch (err) {
      console.warn("room: sensing failed", err);
      areas.length = 0; label = new Uint16Array(W * H); regionArea = [];
    }
    scan.hidden = true; busy = false;
    body.hidden = false;
    render(); syncUI();
    const walls = areas.find((a) => a.name === "Walls");
    if (walls) say(`We found the walls and painted them ${walls.colourName.toLowerCase()}. Pick a colour below, turn on the other surfaces we found, or tap any part of the photo to paint it.`);
    else say("We couldn’t pick out a wall automatically. Tap the part of the photo you want to paint.");
    stage.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }
  function prepare() {
    const data = ctx.getImageData(0, 0, W, H);
    orig = new Uint8ClampedArray(data.data);
    outImg = new ImageData(new Uint8ClampedArray(orig), W, H);
    const n = W * H, lab = new Float32Array(3);
    Lf = new Float32Array(n); Af = new Float32Array(n); Bf = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) { rgbToLab(orig[p], orig[p + 1], orig[p + 2], lab, 0); Lf[i] = lab[0]; Af[i] = lab[1]; Bf[i] = lab[2]; }
    bL = blurPlane(Lf, W, H, 2); bA = blurPlane(Af, W, H, 2); bB = blurPlane(Bf, W, H, 2);
    areas.length = 0; active = -1; label = new Uint16Array(n); regionArea = []; pieces = new Map(); gI = null;
  }

  /* ---------- helpers for the pieces we paint ---------- */
  /* majority filter: removes thin leaks and speckle, fills tiny holes, smooths the outline */
  function smoothBin(bin, r = 2) {
    const tmp = new Int16Array(W * H), n = 2 * r + 1, half = (n * n) / 2;
    for (let y = 0; y < H; y++) {
      let sum = 0; const row = y * W;
      for (let x = -r; x <= r; x++) sum += bin[row + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) { tmp[row + x] = sum; sum += bin[row + clamp(x + r + 1, 0, W - 1)] - bin[row + clamp(x - r, 0, W - 1)]; }
    }
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) { bin[y * W + x] = sum > half ? 1 : 0; sum += tmp[clamp(y + r + 1, 0, H - 1) * W + x] - tmp[clamp(y - r, 0, H - 1) * W + x]; }
    }
  }
  // Guided filter (He et al.): the surface's mask is smoothed, but not across edges that are really in the photo,
  // so the paint stops exactly where the wall stops instead of at a blocky outline.
  let gI = null, gMean = null, gVar = null;
  function feather(a) {
    const n = W * H, r = 5, eps = 0.0016;
    if (!gI) {
      gI = new Float32Array(n); for (let i = 0; i < n; i++) gI[i] = Lf[i] / 100;
      gMean = blurPlane(gI, W, H, r);
      const sq = new Float32Array(n); for (let i = 0; i < n; i++) sq[i] = gI[i] * gI[i];
      const m2 = blurPlane(sq, W, H, r); gVar = new Float32Array(n); for (let i = 0; i < n; i++) gVar[i] = Math.max(0, m2[i] - gMean[i] * gMean[i]);
    }
    const p = new Float32Array(n), ip = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i] = a.bin[i]; ip[i] = gI[i] * p[i]; }
    const mp = blurPlane(p, W, H, r), mip = blurPlane(ip, W, H, r);
    const A = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0; i < n; i++) { const cov = mip[i] - gMean[i] * mp[i]; A[i] = cov / (gVar[i] + eps); B[i] = mp[i] - A[i] * gMean[i]; }
    const mA = blurPlane(A, W, H, r), mB = blurPlane(B, W, H, r);
    for (let i = 0; i < n; i++) {
      const t = clamp((mA[i] * gI[i] + mB[i] - 0.3) / 0.4, 0, 1);
      a.alpha[i] = (t * t * (3 - 2 * t) * 255) | 0;
    }
  }
  function measure(a) {                                      // the surface's average light (shading is kept around it)
    let s = 0, n = 0;
    for (let i = 0; i < a.bin.length; i++) if (a.bin[i]) { s += Lf[i]; n++; }
    a.has = n > 20; a.lmean = n ? s / n : 50;
  }
  const newArea = (name, extra = {}) => ({ name, auto: false, on: true, colour: KINDS[name] || KINDS.Other, colourName: colourName(KINDS[name] || KINDS.Other), userColour: false, tol: 40, seed: 0, bin: new Uint8Array(W * H), alpha: new Uint8Array(W * H), lmean: 50, has: false, ...extra });

  /* ---------- SENSING: split the photo into surfaces ---------- */
  // 1. Graph segmentation (Felzenszwalb & Huttenlocher): neighbouring pixels are joined in order of how alike they are,
  //    and two pieces only merge across an edge that is no stronger than the variation already inside them. A wall with a
  //    lighting gradient stays one piece (its steps are tiny); a wall and a ceiling, or a door and its frame, stay apart.
  function segment(k, minSize) {
    const n = W * H, wOf = new Uint16Array(2 * n).fill(65535);
    const wt = (i, j) => Math.hypot(bL[i] - bL[j], bA[i] - bA[j], bB[i] - bB[j]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x < W - 1) wOf[2 * i] = Math.min(1023, (wt(i, i + 1) * 16) | 0);
      if (y < H - 1) wOf[2 * i + 1] = Math.min(1023, (wt(i, i + W) * 16) | 0);
    }
    const count = new Int32Array(1025);
    for (let e = 0; e < 2 * n; e++) if (wOf[e] !== 65535) count[wOf[e] + 1]++;
    for (let i = 1; i < 1025; i++) count[i] += count[i - 1];
    const order = new Int32Array(count[1024]);
    for (let e = 0; e < 2 * n; e++) if (wOf[e] !== 65535) order[count[wOf[e]]++] = e;
    const parent = new Int32Array(n), size = new Int32Array(n).fill(1), inner = new Float32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let t = 0; t < order.length; t++) {
      const e = order[t], i = e >> 1, j = (e & 1) ? i + W : i + 1, w = wOf[e] / 16;
      let ra = find(i), rb = find(j); if (ra === rb) continue;
      if (w <= Math.min(inner[ra] + k / size[ra], inner[rb] + k / size[rb])) {
        if (size[ra] < size[rb]) { const t2 = ra; ra = rb; rb = t2; }
        parent[rb] = ra; size[ra] += size[rb]; inner[ra] = w;
      }
    }
    for (let t = 0; t < order.length; t++) {               // pieces that are still tiny join their most similar neighbour
      const e = order[t], i = e >> 1, j = (e & 1) ? i + W : i + 1;
      let ra = find(i), rb = find(j); if (ra === rb) continue;
      if (size[ra] < minSize || size[rb] < minSize) { if (size[ra] < size[rb]) { const t2 = ra; ra = rb; rb = t2; } parent[rb] = ra; size[ra] += size[rb]; }
    }
    const ids = new Map(), comp = new Uint16Array(n);
    for (let i = 0; i < n; i++) { const r = find(i); let id = ids.get(r); if (id === undefined) { id = ids.size + 1; ids.set(r, id); } comp[i] = id; }
    return { comp, count: ids.size };
  }
  // 2. Neighbouring pieces that are really one surface (soft border, near-identical colour) are joined.
  function mergePieces(comp, count) {
    const n = W * H;
    for (let pass = 0; pass < 6; pass++) {
      const area = new Float64Array(count + 1), sL = new Float64Array(count + 1), sA = new Float64Array(count + 1), sB = new Float64Array(count + 1);
      for (let i = 0; i < n; i++) { const c = comp[i]; area[c]++; sL[c] += bL[i]; sA[c] += bA[i]; sB[c] += bB[i]; }
      const pairs = new Map();
      const add = (i, j) => {
        const a = comp[i], b = comp[j]; if (a === b) return;
        const key = a < b ? a * 65536 + b : b * 65536 + a, w = Math.hypot(bL[i] - bL[j], bA[i] - bA[j], bB[i] - bB[j]);
        const p = pairs.get(key); if (p) { p.c++; p.w += w; } else pairs.set(key, { a: Math.min(a, b), b: Math.max(a, b), c: 1, w });
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x < W - 1) add(i, i + 1); if (y < H - 1) add(i, i + W); }
      const cand = [];
      for (const p of pairs.values()) {
        const mw = p.w / p.c;
        const dE = Math.hypot(sL[p.a] / area[p.a] - sL[p.b] / area[p.b], sA[p.a] / area[p.a] - sA[p.b] / area[p.b], sB[p.a] / area[p.a] - sB[p.b] / area[p.b]);
        const tiny = Math.min(area[p.a], area[p.b]) < n * 0.004;
        if ((mw < 0.8 && dE < 16) || (tiny && mw < 2.0 && dE < 10)) cand.push([mw, p.a, p.b]);
      }
      if (!cand.length) break;
      cand.sort((x, y) => x[0] - y[0]);
      const par = new Int32Array(count + 1); for (let i = 0; i <= count; i++) par[i] = i;
      const used = new Uint8Array(count + 1); let merged = 0;
      for (const [, a, b] of cand) { if (used[a] || used[b]) continue; par[b] = a; used[a] = used[b] = 1; merged++; }   // (one merge per piece per pass keeps chains from running away)
      if (!merged) break;
      const remap = new Int32Array(count + 1), seen = new Map();
      for (let i = 1; i <= count; i++) { const r = par[i]; let id = seen.get(r); if (id === undefined) { id = seen.size + 1; seen.set(r, id); } remap[i] = id; }
      for (let i = 0; i < n; i++) comp[i] = remap[comp[i]];
      count = seen.size;
    }
    return count;
  }
  function pieceStats(comp, count) {
    const n = W * H, R = [];
    for (let c = 0; c <= count; c++) R.push({ id: c, area: 0, minX: W, maxX: 0, minY: H, maxY: 0, sx: 0, sy: 0, sL: 0, sA: 0, sB: 0, sT: 0 });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, r = R[comp[i]];
      r.area++; r.sx += x; r.sy += y; if (x < r.minX) r.minX = x; if (x > r.maxX) r.maxX = x; if (y < r.minY) r.minY = y; if (y > r.maxY) r.maxY = y;
      r.sL += bL[i]; r.sA += bA[i]; r.sB += bB[i]; r.sT += Math.abs(Lf[i] - bL[i]);
    }
    return R.slice(1).filter((r) => r.area > 0).map((r) => {
      const bw = (r.maxX - r.minX + 1), bh = (r.maxY - r.minY + 1), longSide = Math.max(bw, bh);
      return { id: r.id, area: r.area, f: r.area / n, L: r.sL / r.area, a: r.sA / r.area, b: r.sB / r.area, tex: r.sT / r.area,
        cx: r.sx / r.area / W, cy: r.sy / r.area / H, bw: bw / W, bh: bh / H, rect: r.area / (bw * bh), thin: r.area / (longSide * longSide),
        aspect: bh / bw, top: r.minY < H * 0.02, bottom: r.maxY > H * 0.98, minX: r.minX, maxX: r.maxX, minY: r.minY, maxY: r.maxY };
    });
  }
  // 3. Name the surfaces from where they sit and what shape they are, and group them.
  function detect() {
    const n = W * H;
    const { comp, count } = segment(22, Math.round(n * 0.0025));
    const cnt = mergePieces(comp, count);
    label = comp;
    const regions = pieceStats(comp, cnt).filter((r) => r.f >= 0.0015);
    const kinds = new Map();
    for (const r of regions) {
      const big = r.f >= 0.012;
      if (r.a < -6 && r.b > 3 && big) kinds.set(r.id, "greenery");                           // trees, lawn, shrubs: not painted
      else if (r.cy < 0.55 && r.b < -7 && r.L > 45 && big) kinds.set(r.id, "sky");
      else if (big && r.bottom && r.cy > 0.6 && !r.top) kinds.set(r.id, "floor");
      else if (big && r.top && r.cy < 0.36 && r.bw > 0.45 && r.bh < 0.45) kinds.set(r.id, "Ceiling");
      else if (big && r.rect > 0.62 && r.aspect * (H / W) > 1.2 && r.aspect * (H / W) < 4.5 && r.f < 0.3 && !r.top && r.tex < 6) kinds.set(r.id, "Door");
      else if (r.thin < 0.07 && r.L > 58 && r.f < 0.06) kinds.set(r.id, "Trim");            // thin, light strips: frames and baseboards
      else if (big) kinds.set(r.id, "wall");
    }
    const smooth = (r) => r.area * (1 - clamp(r.tex / 5, 0, 0.85));                          // a plain painted wall beats a busy patch of the same size
    const wallsCand = regions.filter((r) => kinds.get(r.id) === "wall" && r.L > 14 && r.L < 98).sort((p, q) => smooth(q) - smooth(p));   // (a painted wall is never pitch black)
    const main = wallsCand[0] && wallsCand[0].f >= 0.045 ? wallsCand[0] : null;             // not sure what the wall is? don't guess: ask for a tap
    if (main) for (const r of wallsCand) {
      const family = Math.hypot(r.a - main.a, r.b - main.b) < 8 && Math.abs(r.L - main.L) < 40;   // the lit and shaded sides of a corner are the same paint
      kinds.set(r.id, r === main || (family && r.f > 0.015) ? "Walls" : "skip");
    }
    const groups = new Map();
    for (const r of regions) {
      const k = kinds.get(r.id);
      if (!k || k === "floor" || k === "sky" || k === "greenery" || k === "wall" || k === "skip") continue;
      if (k === "Trim" && main && r.L < main.L - 2) continue;                                // trim is lighter than the wall it frames
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    for (const k of ["Walls", "Ceiling", "Door", "Trim"]) {
      const rs = groups.get(k); if (!rs) continue;
      if (k !== "Walls" && !main) continue;
      if (k === "Door") { rs.sort((p, q) => q.area - p.area); rs.length = Math.min(rs.length, 2); }
      const a = newArea(k, { auto: true, on: k === "Walls" });
      const ids = new Set(rs.map((r) => r.id));
      for (let i = 0; i < n; i++) if (ids.has(comp[i])) a.bin[i] = 1;
      smoothBin(a.bin, 1); feather(a); measure(a);
      if (!a.has) continue;
      if (k === "Walls") {                                    // start with a colour that is clearly different from the wall as it is
        const here = [a.lmean, rs[0].a, rs[0].b];
        a.colour = ["#8fa38a", "#1f3557", "#9fb7cf", "#b5654a"].find((hex) => { const t = hexLab(hex); return Math.hypot(t[0] - here[0], t[1] - here[1], t[2] - here[2]) > 32; }) || "#1f3557";
      }
      a.colourName = colourName(a.colour);
      areas.push(a);
      for (const r of rs) regionArea[r.id] = areas.length - 1;
    }
    if (typeof window !== "undefined" && window.__roomDebug) console.debug("room: main wall", main && JSON.stringify({ f: +main.f.toFixed(3), tex: +main.tex.toFixed(2), L: +main.L.toFixed(1), a: +main.a.toFixed(1), b: +main.b.toFixed(1), thin: +main.thin.toFixed(2), rect: +main.rect.toFixed(2), cy: +main.cy.toFixed(2) }), "candidates", wallsCand.slice(0, 4).map((r) => JSON.stringify({ f: +r.f.toFixed(3), tex: +r.tex.toFixed(2), L: +r.L.toFixed(0) })).join(" "));
    pieces = new Map(regions.map((r) => [r.id, r]));
    active = Math.max(0, areas.findIndex((a) => a.name === "Walls"));
  }
  /* a tap on something we didn't name: that piece, plus neighbours that look like the same paint (the slider decides how alike) */
  function growFrom(id, tol) {
    const n = W * H, comp = label, adj = new Map();
    const edge = (i, j) => {
      const a = comp[i], b = comp[j]; if (a === b) return;
      const key = a * 65536 + b, w = Math.hypot(bL[i] - bL[j], bA[i] - bA[j], bB[i] - bB[j]);
      const p = adj.get(key); if (p) { p.c++; p.w += w; } else adj.set(key, { a, b, c: 1, w });
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x < W - 1) { edge(i, i + 1); edge(i + 1, i); } if (y < H - 1) { edge(i, i + W); edge(i + W, i); } }
    const nb = new Map();
    for (const p of adj.values()) { if (!nb.has(p.a)) nb.set(p.a, []); nb.get(p.a).push(p); }
    const have = new Set([id]), queue = [id], seed = pieces.get(id);
    while (queue.length) {
      const cur = queue.pop();
      for (const p of nb.get(cur) || []) {
        if (have.has(p.b)) continue;
        const r = pieces.get(p.b); if (!r || !seed) continue;
        const mw = p.w / p.c, dE = Math.hypot(r.L - seed.L, r.a - seed.a, r.b - seed.b);
        if (mw <= 1 + tol * 0.08 && dE <= 5 + tol * 0.4) { have.add(p.b); queue.push(p.b); }
      }
    }
    return have;
  }

  /* ---------- painting the result ---------- */
  const px = new Float32Array(3);
  function render() {
    if (!orig) return;
    const data = outImg.data, live = [];
    if (!showOriginal) for (const a of areas) if (a.on && a.has) { const t = hexLab(a.colour); live.push({ a, Lt: t[0], at: t[1], bt: t[2], k: 0.35 + 0.65 * (t[0] / 100) }); }
    const n = W * H;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      let r = orig[p], g = orig[p + 1], b = orig[p + 2];
      for (const v of live) {
        const w = v.a.alpha[i]; if (!w) continue;
        // new lightness = the target's, plus the photo's own light and shadow around the surface's average
        labToRgb(clamp(v.Lt + (Lf[i] - v.a.lmean) * v.k, 1, 99), v.at, v.bt, px, 0);
        const m = w / 255; r = orig[p] + (px[0] - orig[p]) * m; g = orig[p + 1] + (px[1] - orig[p + 1]) * m; b = orig[p + 2] + (px[2] - orig[p + 2]) * m;
      }
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
    }
    ctx.putImageData(outImg, 0, 0);
  }

  /* ---------- the panel's state ---------- */
  const cur = () => areas[active];
  function syncUI() {
    const a = cur();
    P("[data-areas]").innerHTML = areas.map((v, i) => `<button type="button" class="area${v.on ? "" : " is-off"}" data-area="${i}" aria-pressed="${i === active}" aria-label="${v.name}${v.on ? ", painted " + v.colourName : ", not painted. Press to paint it"}"><i style="${v.on ? `background:${v.colour}` : ""}"></i>${v.on ? "" : "+ "}${v.name}</button>`).join("");
    const kindWrap = P("[data-kind-wrap]"), tolWrap = P("[data-tol-wrap]");
    if (!a) { P("[data-colour-legend]").textContent = "Colour"; swatches.querySelectorAll("input").forEach((i) => { i.checked = false; }); kindWrap.hidden = tolWrap.hidden = true; }
    else {
      P("[data-colour-legend]").innerHTML = `${a.name} colour <span>${a.on ? a.colourName : "not painted yet"}</span>`;
      swatches.querySelectorAll("input").forEach((i) => { i.checked = a.on && i.value === a.colour; });
      P("[data-custom]").value = a.colour;
      kindWrap.hidden = a.auto; tolWrap.hidden = a.auto;
      if (!a.auto) { P("[data-kind]").value = a.name; P("[data-tol]").value = a.tol; }
    }
    const painted = areas.filter((v) => v.on && v.has);
    const text = painted.map((v) => `${v.name.toLowerCase()} in ${v.colourName.toLowerCase()}`).join(", ");
    P("[data-room-summary]").textContent = text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : "";
    onSummary(text);
  }
  function setActive(i, paintIt) {
    active = i;
    const a = cur();
    if (a && paintIt && !a.on) { a.on = true; render(); }
    syncUI();
  }

  /* ---------- tapping the photo ---------- */
  const toImage = (e) => { const r = canvas.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) * W / r.width), 0, W - 1), clamp(Math.floor((e.clientY - r.top) * H / r.height), 0, H - 1)]; };
  function tapAt(x, y) {
    if (busy || !orig) return;
    const idx = regionArea[label[y * W + x]];
    if (label[y * W + x] && idx >= 0) {                      // a surface we found: paint it
      setActive(idx, true);
      say(`${cur().name}: pick a colour below.`);
      return;
    }
    // not one of the surfaces we named: paint that piece, and neighbours that look like the same paint
    if (areas.length >= MAX_AREAS) { say("That\u2019s the most areas we can paint at once. Tap one of the surfaces above to change it."); return; }
    const id = label[y * W + x];
    if (!id) { say("Tap a larger part of the photo."); return; }
    const a = newArea("Other", { seed: id });
    rebuildCustom(a);
    if (!a.has) { say("That spot is too small. Tap a larger part of the photo."); return; }
    areas.push(a); active = areas.length - 1;
    render(); syncUI();
    say("Painted that part. Pick a colour below, say what it is, or drag \u201cHow much to select\u201d.");
  }
  function rebuildCustom(a) {
    const ids = growFrom(a.seed, a.tol);
    a.bin.fill(0);
    for (let i = 0; i < a.bin.length; i++) if (ids.has(label[i])) a.bin[i] = 1;
    smoothBin(a.bin, 1); feather(a); measure(a);
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { if (e.button > 0) return; const [ix, iy] = toImage(e); down = { x: e.clientX, y: e.clientY, t: performance.now(), ix, iy }; });
  canvas.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 600) tapAt(down.ix, down.iy);   // a swipe is a scroll, not a tap
    down = null;
  });
  canvas.addEventListener("pointercancel", () => { down = null; });
  canvas.style.touchAction = "pan-y pinch-zoom";
  canvas.style.cursor = "pointer";

  // keyboard: arrow keys move a pointer, Enter or Space selects
  let kx = 0.5, ky = 0.5;
  const placeCursor = () => { cursorEl.style.left = `${kx * 100}%`; cursorEl.style.top = `${ky * 100}%`; };
  canvas.addEventListener("focus", () => { if (canvas.matches(":focus-visible")) { cursorEl.hidden = false; placeCursor(); } });   // keyboard users only
  canvas.addEventListener("blur", () => { cursorEl.hidden = true; });
  canvas.addEventListener("keydown", (e) => {
    const d = e.shiftKey ? 0.1 : 0.03;
    if (e.key === "ArrowLeft") kx = clamp(kx - d, 0, 1); else if (e.key === "ArrowRight") kx = clamp(kx + d, 0, 1);
    else if (e.key === "ArrowUp") ky = clamp(ky - d, 0, 1); else if (e.key === "ArrowDown") ky = clamp(ky + d, 0, 1);
    else if (e.key === "Enter" || e.key === " ") tapAt(clamp(Math.round(kx * (W - 1)), 0, W - 1), clamp(Math.round(ky * (H - 1)), 0, H - 1));
    else return;
    e.preventDefault(); placeCursor();
  });

  /* ---------- panel controls ---------- */
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.area !== undefined) {
      const i = +t.dataset.area, a = areas[i];
      if (i === active && a.on) {                          // pressing the chip you're on turns that surface off again
        if (a.auto) { a.on = false; render(); syncUI(); say(`${a.name}: back to how it was. Press it again to paint it.`); }
        else { areas.splice(i, 1); active = Math.max(0, i - 1); render(); syncUI(); }
        return;
      }
      setActive(i, true); say(`${a.name}: pick a colour below.`);
    }
    else if (t.hasAttribute("data-new")) reset();
    else if (t.hasAttribute("data-save")) save();
  });
  const setCompare = (on) => { showOriginal = on; cmp.setAttribute("aria-pressed", String(on)); badge.hidden = !on; render(); };
  cmp.addEventListener("pointerdown", (e) => { e.preventDefault(); setCompare(true); });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) cmp.addEventListener(ev, () => { if (showOriginal && !cmp.matches(":focus-visible")) setCompare(false); });
  cmp.addEventListener("click", (e) => { if (e.detail === 0) setCompare(!showOriginal); });          // keyboard: toggles
  panel.addEventListener("change", (e) => {
    const a = cur(); if (!a) return;
    const paint = (hex, name) => { a.colour = hex; a.colourName = name; a.userColour = true; a.on = true; render(); syncUI(); };
    if (e.target.matches('input[name="room-colour"]')) paint(e.target.value, e.target.dataset.name);
    else if (e.target.matches("[data-custom]")) paint(e.target.value, "Custom colour");
    else if (e.target.matches("[data-kind]")) {
      a.name = e.target.value;
      if (!a.userColour) { a.colour = KINDS[a.name]; a.colourName = colourName(a.colour); }
      render(); syncUI();
    }
  });
  panel.addEventListener("input", (e) => {
    const a = cur(); if (!a) return;
    if (e.target.matches("[data-custom]")) { a.colour = e.target.value; a.colourName = "Custom colour"; a.userColour = true; a.on = true; render(); }
    else if (e.target.matches("[data-tol]")) { a.tol = +e.target.value; if (!a._t) a._t = requestAnimationFrame(() => { a._t = 0; rebuildCustom(a); render(); }); }
  });

  /* ---------- save / start over ---------- */
  function save() {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.drawImage(canvas, 0, 0);
    const text = "ForestHill Student Painters · colour idea", fs = Math.max(13, Math.round(W / 55));
    g.font = `600 ${fs}px system-ui, sans-serif`;
    const tw = g.measureText(text).width, pad = fs * 0.6;
    g.fillStyle = "rgba(17,17,17,0.6)"; g.fillRect(pad, H - fs * 2 - pad / 2, tw + pad * 2, fs * 1.6 + pad / 2);
    g.fillStyle = "#fff"; g.fillText(text, pad * 2, H - fs * 1.1 - pad / 2 + fs * 0.2);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "my-room-colour-idea.jpg", { type: "image/jpeg" });
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My colour idea" }); return; } } catch { return; }   // (cancelled share)
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/jpeg", 0.92);
  }
  function reset() {
    areas.length = 0; active = -1; orig = outImg = label = null; regionArea = [];
    work.hidden = true; empty.hidden = false; body.hidden = true; stage.classList.remove("is-photo");
    say("Add a photo to begin."); onSummary("");
  }
  return { reset };
}
