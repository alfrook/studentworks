"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Mail, MapPin, Phone, X } from "lucide-react";
import { BUSINESS, SERVICE_OPTIONS } from "@/lib/site";
import { useQuoteListener } from "@/lib/quote";
import { MaskHeading, Reveal } from "./ui";

type Fields = { name: string; email: string; phone: string; location: string; service: string; description: string };
type Errors = Partial<Record<keyof Fields | "files", string>>;

const EMPTY: Fields = { name: "", email: "", phone: "", location: "", service: "", description: "" };
const MAX_FILES = 3;
const MAX_TOTAL = 5 * 1024 * 1024; // keep attachments small enough for the form service

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Please enter a valid email, like name@example.com.";
  if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Please enter a 10-digit phone number so we can call you.";
  if (f.location.trim().length < 2) e.location = "Please tell us the street or neighbourhood.";
  if (!f.service) e.service = "Please choose a service, or pick “Not sure yet”.";
  if (f.description.trim().length < 10) e.description = "A sentence or two about the project helps us prepare (at least 10 characters).";
  return e;
}

export default function QuoteForm() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [honey, setHoney] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uid = useId();

  // A "get a quote" button elsewhere can preselect the service.
  useQuoteListener((service) => {
    if (service && SERVICE_OPTIONS.includes(service)) {
      setF((x) => ({ ...x, service }));
      setErrors((e) => ({ ...e, service: undefined }));
    }
  });

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...f, [k]: e.target.value };
    setF(next);
    if (touched[k]) setErrors((old) => ({ ...old, [k]: validate(next)[k] }));
  };
  const blur = (k: keyof Fields) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((old) => ({ ...old, [k]: validate(f)[k] }));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((x) => x.type.startsWith("image/"));
    const next = [...files, ...imgs].slice(0, MAX_FILES);
    const total = next.reduce((s, x) => s + x.size, 0);
    if (Array.from(list).some((x) => !x.type.startsWith("image/"))) setErrors((e) => ({ ...e, files: "Only image files (JPG, PNG, HEIC, WebP) can be attached." }));
    else if (total > MAX_TOTAL) { setErrors((e) => ({ ...e, files: "Photos are over 5 MB in total. Try fewer or smaller photos, or text them to us." })); return; }
    else setErrors((e) => ({ ...e, files: undefined }));
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(f);
    setTouched({ name: true, email: true, phone: true, location: true, service: true, description: true });
    setErrors((old) => ({ ...errs, files: old.files }));
    const firstBad = (Object.keys(errs) as (keyof Fields)[])[0];
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    if (honey) return; // bot

    setState("sending");
    const payload: Record<string, string> = {
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      property_location: f.location.trim(),
      service: f.service,
      project: f.description.trim(),
      // Subject must stay exactly like this: Alex's iPhone text-back automation reads it.
      _subject: `Free call request from ${f.name.trim()} - ${f.phone.trim()}`,
      _cc: BUSINESS.cc,
      _template: "table",
      _replyto: f.email.trim(),
      _honey: "",
    };
    try {
      let res: Response;
      if (files.length) {
        // With photos: multipart body. NOTE: verify once on the live site that attachments arrive.
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        files.forEach((file, i) => fd.append(`photo_${i + 1}`, file, file.name));
        res = await fetch(`https://formsubmit.co/ajax/${BUSINESS.email}`, { method: "POST", headers: { Accept: "application/json" }, body: fd });
      } else {
        res = await fetch(`https://formsubmit.co/ajax/${BUSINESS.email}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const json = (await res.json().catch(() => ({}))) as { success?: string | boolean };
      // Only report success when the form service confirms it.
      if (!res.ok || !(json.success === true || json.success === "true")) throw new Error("not confirmed");
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  const field = (k: keyof Fields, label: string, input: React.ReactNode, hint?: string) => (
    <div className="grid gap-2">
      <label htmlFor={`q-${k}`} className="text-xs font-extrabold uppercase tracking-[0.16em]">
        {label} <span className="text-red" aria-hidden>*</span>
      </label>
      {input}
      {hint && !errors[k] && <p id={`${uid}-${k}-hint`} className="text-sm text-muted">{hint}</p>}
      <AnimatePresence>
        {errors[k] && (
          <motion.p
            id={`${uid}-${k}-err`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 text-sm font-semibold text-red-dark"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {errors[k]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  const inputCls = (k: keyof Fields) =>
    `w-full border-2 bg-white px-4 py-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#7a7d82] focus:border-ink focus:shadow-[0_0_0_4px_rgba(225,37,43,0.18)] ${
      errors[k] ? "border-red" : "border-ink/20"
    }`;
  const aria = (k: keyof Fields, hint = false) => ({
    id: `q-${k}`,
    name: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${uid}-${k}-err` : hint ? `${uid}-${k}-hint` : undefined,
    required: true,
  });

  return (
    <section id="contact" className="bg-mist py-24 md:py-36">
      <div className="container-x grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Reveal><p className="eyebrow mb-6">Free quote</p></Reveal>
          <MaskHeading lines={["Get your", "free estimate."]} accentLast className="text-[clamp(2.6rem,6.4vw,5.6rem)]" />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
              Tell us about the house and what you have in mind. We&apos;ll call you to talk it through and set up a visit. No obligation.
            </p>
            <ul className="mt-10 grid gap-4 text-base font-semibold">
              <li><a href={BUSINESS.phoneHref} className="inline-flex items-center gap-3 hover:text-red"><Phone className="size-5 text-red" aria-hidden /> Call or text {BUSINESS.phone}</a></li>
              <li><a href={`mailto:${BUSINESS.email}`} className="inline-flex items-center gap-3 break-all hover:text-red"><Mail className="size-5 shrink-0 text-red" aria-hidden /> {BUSINESS.email}</a></li>
              <li className="inline-flex items-center gap-3"><MapPin className="size-5 text-red" aria-hidden /> Forest Hill and across Toronto</li>
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="relative border-t-4 border-red bg-white p-6 shadow-[0_30px_80px_rgba(21,21,21,0.08)] sm:p-10">
            <AnimatePresence mode="wait">
              {state === "sent" ? (
                <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center" role="status">
                  <CheckCircle2 className="mx-auto size-14 text-red" aria-hidden />
                  <h3 className="mt-6 text-3xl font-extrabold uppercase tracking-[-0.03em]">Request received.</h3>
                  <p className="mx-auto mt-4 max-w-sm text-muted">
                    Thanks, {f.name.split(" ")[0]}. We&apos;ll call you at {f.phone} soon. Need us sooner? Call or text <a className="font-bold text-ink underline" href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
                  </p>
                  <button
                    type="button"
                    className="mt-8 text-sm font-extrabold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-red"
                    onClick={() => { setF(EMPTY); setFiles([]); setTouched({}); setErrors({}); setState("idle"); }}
                  >
                    Send another request
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" ref={formRef} onSubmit={submit} noValidate className="grid gap-6" initial={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Free quote request">
                  <div className="grid gap-6 sm:grid-cols-2">
                    {field("name", "Full name", <input {...aria("name")} autoComplete="name" value={f.name} onChange={set("name")} onBlur={blur("name")} className={inputCls("name")} placeholder="Jane Smith" />)}
                    {field("phone", "Phone number", <input {...aria("phone")} type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} onBlur={blur("phone")} className={inputCls("phone")} placeholder="416-555-0123" />)}
                  </div>
                  {field("email", "Email", <input {...aria("email")} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} onBlur={blur("email")} className={inputCls("email")} placeholder="you@example.com" />)}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {field("location", "Property location", <input {...aria("location", true)} autoComplete="street-address" value={f.location} onChange={set("location")} onBlur={blur("location")} className={inputCls("location")} placeholder="Street or neighbourhood" />, "Street or neighbourhood is enough.")}
                    {field(
                      "service",
                      "Service requested",
                      <select {...aria("service")} value={f.service} onChange={set("service")} onBlur={blur("service")} className={`${inputCls("service")} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23151515%22 stroke-width=%223%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_16px_center] bg-no-repeat pr-10`}>
                        <option value="" disabled>Choose a service</option>
                        {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>,
                    )}
                  </div>
                  {field("description", "Project description", <textarea {...aria("description")} rows={4} value={f.description} onChange={set("description")} onBlur={blur("description")} className={`${inputCls("description")} resize-y`} placeholder="Two-storey house, siding and trim, some peeling on the south side. Hoping for June." />)}

                  {/* optional photos */}
                  <div className="grid gap-2">
                    <span id={`${uid}-files-label`} className="text-xs font-extrabold uppercase tracking-[0.16em]">Photos of the house <span className="font-semibold normal-case tracking-normal text-muted">(optional, up to {MAX_FILES})</span></span>
                    <label
                      htmlFor="q-files"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                      className="flex min-h-[88px] cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-ink/25 px-4 text-center text-sm font-semibold text-muted transition-colors hover:border-red hover:text-ink focus-within:border-ink"
                    >
                      <ImagePlus className="size-5 text-red" aria-hidden />
                      Tap to add photos, or drag them here
                      <input
                        ref={fileInput}
                        id="q-files"
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        aria-labelledby={`${uid}-files-label`}
                        aria-describedby={errors.files ? `${uid}-files-err` : undefined}
                        onChange={(e) => addFiles(e.target.files)}
                        disabled={files.length >= MAX_FILES}
                      />
                    </label>
                    {errors.files && <p id={`${uid}-files-err`} className="flex items-start gap-2 text-sm font-semibold text-red-dark"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {errors.files}</p>}
                    {files.length > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {files.map((file, i) => (
                          <li key={file.name + i} className="flex items-center gap-2 bg-mist py-1.5 pl-3 pr-1 text-sm">
                            <span className="max-w-[12rem] truncate">{file.name}</span>
                            <span className="text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                            <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} className="grid size-8 place-items-center hover:text-red" aria-label={`Remove ${file.name}`}>
                              <X className="size-4" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* honeypot */}
                  <input type="text" name="_honey" value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

                  {Object.values(errors).some(Boolean) && state === "idle" && (
                    <p className="text-sm font-semibold text-red-dark" role="alert">Please fix the highlighted fields above.</p>
                  )}
                  {state === "failed" && (
                    <p className="flex items-start gap-2 border-l-4 border-red bg-mist p-4 text-sm font-semibold" role="alert">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red" aria-hidden />
                      <span>Sorry, your request didn&apos;t go through, and nothing was sent. Please try again, or call or text <a className="underline" href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={state === "sending"}
                    className="inline-flex min-h-[58px] w-full items-center justify-center gap-3 bg-red px-8 text-sm font-extrabold uppercase tracking-[0.16em] text-white transition-colors hover:bg-ink disabled:opacity-70"
                  >
                    {state === "sending" ? (<><Loader2 className="size-5 animate-spin" aria-hidden /> Sending…</>) : "Get my free estimate"}
                  </button>
                  <p className="text-center text-xs text-muted">We only use your details to contact you about your project.</p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
