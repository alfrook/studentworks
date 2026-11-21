// Client reviews: reads data/reviews.json and shows the section only when it holds real, permitted reviews.
// Nothing is invented here: every word on screen comes from the file. Text is inserted as plain text (never as HTML).
const section = document.getElementById("reviews");
if (section) {
  const list = section.querySelector("[data-reviews]");
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  fetch("data/reviews.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      // only entries that have a name, the words, and the client's permission
      const reviews = (Array.isArray(data.reviews) ? data.reviews : []).filter((r) => r && r.permission === true && text(r.name) && text(r.text));
      if (!reviews.length) return;
      for (const r of reviews) {
        const li = document.createElement("li");
        li.className = "rev-card reveal";
        const stars = Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5 ? r.stars : 0;
        if (stars) {
          const s = document.createElement("span");
          s.className = "rev-card__stars";
          s.setAttribute("role", "img");
          s.setAttribute("aria-label", `${stars} out of 5 stars`);
          s.innerHTML = star.repeat(stars);
          li.append(s);
        }
        const q = document.createElement("blockquote");
        const p = document.createElement("p");
        p.textContent = text(r.text);
        q.append(p);
        const f = document.createElement("footer");
        const n = document.createElement("strong");
        n.textContent = text(r.name);
        f.append(n);
        const meta = [r.area, r.project, r.date].map(text).filter(Boolean).join(" · ");
        if (meta) { const m = document.createElement("span"); m.textContent = meta; f.append(m); }
        li.append(q, f);
        list.append(li);
      }
      list.dataset.count = String(reviews.length);
      section.hidden = false;
      // the reveal-on-scroll helper has already run: show these cards once they are near the screen
      if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
        list.querySelectorAll(".reveal").forEach((el) => io.observe(el));
      } else list.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
    })
    .catch(() => { /* no file or an error: the section simply stays hidden */ });
}
