// Homepage "Book a quote": three steps, sent through FormSubmit (free) by AJAX.
//  - Call me: name + phone + best time.  Subject: "Free call request from NAME - PHONE"
//    (your iPhone text-back automation reads this exact subject: don't change its wording)
//  - Email me: name + email.             Subject: "Free email request from NAME - EMAIL"
//  - Always cc'd to gr8sk8er@icloud.com. No prices anywhere.
// Without JavaScript the form still posts to FormSubmit and lands on thanks.html.
const TO = "paintwithfrook@gmail.com";
const CC = "gr8sk8er@icloud.com";

const form = document.getElementById("book-form");
if (form) {
  const done = document.getElementById("book-done");
  const doneText = document.getElementById("book-done-text");
  const status = document.getElementById("form-status");
  const phone = document.getElementById("b-phone");
  const email = document.getElementById("b-email");
  const next = form.querySelector('input[name="_next"]');
  if (next && location.protocol.startsWith("http")) next.value = new URL("thanks.html", location.href).href;

  // Call me / Email me: show the right fields and make them required
  const method = () => form.querySelector('input[name="contact_method"]:checked').value;
  const sync = () => {
    const call = method() === "Call me";
    form.querySelectorAll('[data-when="call"]').forEach((el) => (el.hidden = !call));
    form.querySelectorAll('[data-when="email"]').forEach((el) => (el.hidden = call));
    phone.required = call;
    email.required = !call;
  };
  form.querySelectorAll('input[name="contact_method"]').forEach((r) => r.addEventListener("change", sync));
  sync();

  // At least one thing to paint or stain
  const group = form.querySelector("[data-require-one]");
  const boxes = [...group.querySelectorAll('input[type="checkbox"]')];
  const groupOk = () => {
    const ok = boxes.some((b) => b.checked);
    boxes[0].setCustomValidity(ok ? "" : group.dataset.requireOne);
    return ok;
  };
  group.addEventListener("change", groupOk);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    groupOk();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const v = (n) => (form.elements[n]?.value || "").trim();
    const call = method() === "Call me";
    const name = v("name").replace(/\s+/g, " ").slice(0, 80);
    const data = {
      name,
      contact_method: method(),
      project: boxes.filter((b) => b.checked).map((b) => b.value).join(", "),
      timeline: form.querySelector('input[name="timeline"]:checked')?.value || "",
      _subject: call ? `Free call request from ${name} - ${v("phone")}` : `Free email request from ${name} - ${v("email")}`,
      _cc: CC,
      _template: "table",
      _honey: v("_honey"),
    };
    if (call) { data.phone = v("phone"); data.best_time = form.querySelector('input[name="best_time"]:checked')?.value || ""; }
    else data.email = v("email");

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Sending…";
    status.textContent = "Sending your request.";
    try {
      const r = await fetch(`https://formsubmit.co/ajax/${TO}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(r.status);
      doneText.textContent = call
        ? `Thanks, ${name}. We'll call you at ${data.phone}${data.best_time && data.best_time !== "Any time" ? `, ${data.best_time.toLowerCase()}` : ""}.`
        : `Thanks, ${name}. We'll email you at ${data.email}.`;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch {
      status.textContent = "That didn't send. Please try again, or call or text 647-388-8488.";
      button.disabled = false;
      button.textContent = "Book my free quote";
    }
  });
}

// Sticky "Book a quote" on phones: hidden while the booking section is on screen
const sticky = document.querySelector("[data-sticky-cta]");
const book = document.getElementById("book");
if (sticky && book && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => sticky.classList.toggle("is-hidden", e.isIntersecting), { rootMargin: "0px 0px -20% 0px" }).observe(book);
}
