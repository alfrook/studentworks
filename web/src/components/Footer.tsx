import { BUSINESS, NAV, SERVICES, asset } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-ink pb-10 pt-20 text-white">
      <div className="container-x">
        <p className="display text-[clamp(2.6rem,9vw,8rem)]">
          Do it once.<br /><span className="text-red">Do it right.</span>
        </p>
        <div className="mt-16 grid gap-12 border-t border-white/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src={asset("/images/logo-red.png")} alt={BUSINESS.name} width={456} height={234} loading="lazy" className="h-14 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">{BUSINESS.name}, {BUSINESS.division}. Residential exterior painting.</p>
          </div>
          <nav aria-label="Footer">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/60">Explore</h2>
            <ul className="mt-5 grid gap-3 font-semibold">
              {NAV.map((n) => <li key={n.href}><a href={n.href} className="hover:text-red">{n.label}</a></li>)}
              <li><a href="join.html" className="hover:text-red">Join the crew</a></li>
            </ul>
          </nav>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/60">Services</h2>
            <ul className="mt-5 grid gap-3 font-semibold text-white/85">
              {SERVICES.map((s) => <li key={s.id}>{s.name}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/60">Contact</h2>
            <ul className="mt-5 grid gap-3 font-semibold">
              <li><a href={BUSINESS.phoneHref} className="text-2xl font-extrabold hover:text-red">{BUSINESS.phone}</a></li>
              <li><a href={`mailto:${BUSINESS.email}`} className="break-all hover:text-red">{BUSINESS.email}</a></li>
              <li className="text-white/70">Serving Toronto</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-xs text-white/60">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. Student Works is a trademark of its owner.</p>
          <p>Dulux is a trademark of its owner.</p>
        </div>
      </div>
    </footer>
  );
}
