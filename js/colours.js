// "See your house in a new colour": the finished house drawing, repainted live.
// Free and local: it loads images/scenes/steps/99-finished.svg once, then changes the fill of the
// shapes tagged data-k (siding, trim, door, garage) and shades them the same way tools/build-scenes.py does.
// Colour names only: no paint brands, no prices. Without JavaScript the page keeps the still picture.
const root = document.querySelector("[data-viz]");
if (root) {
  const stage = root.querySelector("[data-viz-stage]");
  const panel = root.querySelector("[data-viz-panel]");
  const SRC = "images/scenes/steps/99-finished.svg";

  const PARTS = [
    { key: "siding", label: "Walls", colours: [
      ["Deep navy", "#1f3557"], ["Slate blue", "#5f7a94"], ["Stone grey", "#a8a49b"], ["Warm cream", "#e6dcc3"],
      ["Sage green", "#8fa38a"], ["Forest green", "#34523f"], ["Charcoal", "#3a3f44"], ["Brick red", "#9b3a2f"]] },
    { key: "trim", label: "Trim", colours: [
      ["Bright white", "#f7f7f5"], ["Warm white", "#efe9dc"], ["Light grey", "#cfcfcc"], ["Charcoal", "#3a3f44"], ["Black", "#1f2021"]] },
    { key: "door", label: "Front door", colours: [
      ["Sunflower yellow", "#efb11d"], ["Red", "#b11f24"], ["Navy", "#1f3557"], ["Black", "#1f2021"], ["Teal", "#2f7f86"], ["White", "#f7f7f5"]] },
    { key: "garage", label: "Garage door", colours: [
      ["Black", "#1f2021"], ["Charcoal", "#3a3f44"], ["Navy", "#1f3557"], ["Warm white", "#efe9dc"], ["Grey", "#8b9096"], ["Brick red", "#9b3a2f"]] },
  ];
  const LOOKS = [
    { name: "Classic navy",   pick: { siding: "#1f3557", trim: "#f7f7f5", door: "#efb11d", garage: "#1f2021" } },
    { name: "Stone and navy", pick: { siding: "#a8a49b", trim: "#f7f7f5", door: "#1f3557", garage: "#3a3f44" } },
    { name: "Warm cream",     pick: { siding: "#e6dcc3", trim: "#f7f7f5", door: "#b11f24", garage: "#3a3f44" } },
    { name: "Forest green",   pick: { siding: "#34523f", trim: "#efe9dc", door: "#1f2021", garage: "#1f2021" } },
    { name: "Modern charcoal", pick: { siding: "#3a3f44", trim: "#f7f7f5", door: "#b11f24", garage: "#3a3f44" } },
    { name: "Brick red",      pick: { siding: "#9b3a2f", trim: "#f7f7f5", door: "#1f2021", garage: "#1f2021" } },
  ];
  const nameOf = (key, hex) => PARTS.find((p) => p.key === key).colours.find((c) => c[1] === hex)?.[0] || "";
  const state = { ...LOOKS[0].pick };

  // same shading as tools/build-scenes.py: "z" faces (tops) lighter, "x" faces (sides) darker
  const shade = (hex, n) => {
    let c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    if (n === "z") c = c.map((v) => Math.floor(v + (255 - v) * 0.16));
    else if (n === "x") c = c.map((v) => Math.floor(v * 0.86));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  };

  /* ---------- the controls ---------- */
  const dots = (pick) => ["siding", "door", "garage"].map((k) => `<i style="background:${pick[k]}"></i>`).join("");
  panel.innerHTML = `
    <div class="viz__looks" role="group" aria-label="Quick looks">
      ${LOOKS.map((l, i) => `<button type="button" class="look" data-look="${i}"><span class="look__dots" aria-hidden="true">${dots(l.pick)}</span>${l.name}</button>`).join("")}
    </div>
    ${PARTS.map((p) => `
      <fieldset class="viz__part">
        <legend>${p.label} <span data-name="${p.key}"></span></legend>
        <div class="swatches">
          ${p.colours.map(([name, hex]) => `<label class="sw"><input type="radio" name="viz-${p.key}" value="${hex}" data-key="${p.key}"><span class="sw__dot" style="--c:${hex}"></span><span class="visually-hidden">${name}</span></label>`).join("")}
        </div>
      </fieldset>`).join("")}
    <p class="viz__summary" data-viz-summary aria-live="polite"></p>
    <a class="button button--cta button--big viz__cta" href="#book">Get a free quote for this look <span aria-hidden="true">→</span></a>
    <p class="viz__note">Colours on screen are only approximate.</p>`;
  panel.hidden = false;
  root.querySelector(".viz__static")?.setAttribute("hidden", "");

  const summary = panel.querySelector("[data-viz-summary]");
  let svg = null;
  const shapes = {};   // key -> [elements]

  function apply() {
    for (const key of Object.keys(state)) {
      const hex = state[key];
      for (const el of shapes[key] || []) el.style.fill = shade(hex, el.dataset.n);
      panel.querySelector(`[data-name="${key}"]`).textContent = nameOf(key, hex);
      const input = panel.querySelector(`input[data-key="${key}"][value="${hex}"]`);
      if (input) input.checked = true;
    }
    panel.querySelectorAll(".look").forEach((b, i) => b.setAttribute("aria-pressed", String(PARTS.every((p) => LOOKS[i].pick[p.key] === state[p.key]))));
    const text = `${nameOf("siding", state.siding)} walls, ${nameOf("trim", state.trim).toLowerCase()} trim, a ${nameOf("door", state.door).toLowerCase()} front door and a ${nameOf("garage", state.garage).toLowerCase()} garage door.`;
    summary.textContent = text;
    stage.setAttribute("aria-label", "Drawing of a house with " + text.replace(/\.$/, ""));
  }

  panel.addEventListener("change", (e) => {
    const i = e.target.closest("input[data-key]");
    if (!i) return;
    state[i.dataset.key] = i.value;
    apply();
  });
  panel.addEventListener("click", (e) => {
    const b = e.target.closest(".look");
    if (!b) return;
    Object.assign(state, LOOKS[+b.dataset.look].pick);
    apply();
  });
  apply();

  /* ---------- sample house / your own room ---------- */
  const grid = root.querySelector(".viz__grid");
  const roomStage = document.createElement("div");
  roomStage.className = "viz__stage viz__stage--room";
  roomStage.hidden = true;
  const roomPanel = document.createElement("div");
  roomPanel.className = "viz__panel viz__panel--room";
  roomPanel.hidden = true;
  grid.append(roomStage, roomPanel);
  const modes = document.createElement("div");
  modes.className = "viz__modes";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "What to try colours on");
  modes.innerHTML = `<button type="button" data-mode="house" aria-pressed="true">Sample house</button><button type="button" data-mode="room" aria-pressed="false">Your own room</button>`;
  grid.before(modes);
  let roomMounted = false;
  modes.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-mode]");
    if (!b) return;
    const room = b.dataset.mode === "room";
    modes.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    stage.hidden = room; panel.hidden = room;
    roomStage.hidden = !room; roomPanel.hidden = !room;
    if (room && !roomMounted) {                       // the photo tool is only fetched if someone wants it
      roomMounted = true;
      roomStage.textContent = "Loading\u2026";
      try { (await import("./room.js")).mountRoom(roomStage, roomPanel); }
      catch { roomMounted = false; roomStage.textContent = "Sorry, that didn\u2019t load. Please try again."; }
    }
  });

  /* ---------- the drawing: fetched when the section is near the screen ---------- */
  async function load() {
    try {
      const text = await (await fetch(SRC)).text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      svg = document.importNode(doc.documentElement, true);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("class", "viz__svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      for (const k of Object.keys(state)) shapes[k] = [...svg.querySelectorAll(`.p[data-k="${k}"][data-n]`)];
      stage.setAttribute("role", "img");
      stage.replaceChildren(svg);
      apply();
    } catch { /* the still picture stays */ }
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "800px 0px" });
    io.observe(root);
  } else load();
}
