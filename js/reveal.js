// Shared, tiny: the header turns into a blurred bar after a short scroll, and
// elements marked .reveal fade and rise once as they come into view.
// With reduced motion, CSS keeps everything still.
const root = document.documentElement;
const onScroll = () => root.classList.toggle("is-scrolled", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const items = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add("is-in"));
}

// the footer year, from the visitor's clock (the page has "2026" written in as a fallback)
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
