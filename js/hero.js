// Homepage hero: the film plays on its own, muted, and loops.
//  - The words follow the film (times in the #hero-data block in index.html).
//  - It holds on the last shot (the stained deck) for "hold" seconds before starting again.
//  - Pause / play button (also needed for accessibility: moving video must be stoppable).
//  - With reduced motion it doesn't play: it shows the finished house and a play button.
//  - The header logo and Book a quote stay hidden until you scroll past the hero.
const hero = document.querySelector("[data-hero]");
if (hero) {
  const root = document.documentElement;
  const video = hero.querySelector("[data-hero-video]");
  const lead = hero.querySelector("[data-hero-lead]");
  const place = hero.querySelector("[data-hero-place]");
  const caption = hero.querySelector("[data-hero-caption]");
  const button = hero.querySelector("[data-hero-pause]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let data = { hold: 1.5, chapters: [] };
  try { data = { ...data, ...JSON.parse(document.getElementById("hero-data").textContent) }; } catch {}
  const chapters = data.chapters;

  // ---- words ----
  let current = -1;
  const show = (i, animate = true) => {
    if (i === current || !chapters[i]) return;
    current = i;
    const c = chapters[i];
    lead.textContent = c.lead || "\u00a0"; // keep the line so nothing below jumps
    place.textContent = c.place;
    if (animate && !reduce && caption.animate) {
      caption.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
    }
  };
  const chapterAt = (t) => {
    let i = 0;
    while (i + 1 < chapters.length && t >= chapters[i + 1].t) i++;
    return i;
  };
  const sync = () => show(chapterAt(video.currentTime));

  // follow the film frame by frame where the browser allows it, otherwise every animation frame
  const follow = () => {
    sync();
    if (video.paused) return;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(follow);
    else requestAnimationFrame(follow);
  };
  video.addEventListener("playing", follow);
  video.addEventListener("seeked", sync);

  // ---- hold on the last shot, then start again ----
  let wanted = !reduce; // should the film be playing (not paused by the visitor)
  let onScreen = true;
  let holdTimer = 0;
  video.loop = false;
  video.addEventListener("ended", () => {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdTimer = 0;
      video.currentTime = 0;
      if (wanted && onScreen) play();
    }, data.hold * 1000);
  });

  // ---- play / pause ----
  const setButton = () => {
    const playing = wanted;
    button.classList.toggle("is-paused", !playing);
    button.setAttribute("aria-label", playing ? "Pause the video" : "Play the video");
  };
  const play = () => {
    const p = video.play();
    if (p && p.catch) p.catch(() => { wanted = false; setButton(); }); // autoplay blocked (e.g. Low Power Mode)
  };
  button.hidden = false;
  button.addEventListener("click", () => {
    wanted = !wanted;
    clearTimeout(holdTimer);
    holdTimer = 0;
    if (wanted) {
      if (video.preload === "none") video.preload = "auto";
      if (video.ended) video.currentTime = 0;
      play();
    } else video.pause();
    setButton();
  });

  if (reduce) {
    video.pause();
    show(chapterAt(7.3), false); // the poster is the painted front of the house
  } else {
    show(0, false);
    if (video.paused) play();
  }
  setButton();

  // ---- header: hidden while the hero fills the screen; pause the film when it's off screen ----
  const update = () => {
    const r = hero.getBoundingClientRect();
    root.classList.toggle("on-logo", r.bottom > innerHeight * 0.5);
  };
  update();
  addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  addEventListener("resize", update);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (!onScreen) video.pause();
      else if (wanted && video.paused && !holdTimer) play();
    }).observe(hero);
  }
}
