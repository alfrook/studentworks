// Single source of truth for business info and content.
// Rule: only real information here. Anything not yet supplied is marked PLACEHOLDER.

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Prefix a /public path with the GitHub Pages base path. */
export const asset = (p: string) => `${base}${p}`;

export const BUSINESS = {
  name: "Student Works Painting",
  division: "Forest Hill, Toronto",
  phone: "647-388-8488",
  phoneHref: "tel:+16473888488",
  email: "paintwithfrook@gmail.com",
  cc: "gr8sk8er@icloud.com",
  tagline: "Do it once. Do it right.",
  areaServed: ["Toronto", "Guelph"],
  owner: "Alexander Frook",
};

export const NAV = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Our Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export type Service = { id: string; name: string; blurb: string; image: string; alt: string; pos?: string };

// Photos are from real Student Works jobs. Several are interim picks until
// dedicated shots for each service are supplied (see README notes).
export const SERVICES: Service[] = [
  {
    id: "exterior",
    name: "Exterior House Painting",
    blurb: "Full exterior repaints that protect the house and lift the whole street view.",
    image: "/images/hero-desktop.webp",
    alt: "Blue two-storey house after an exterior repaint",
    pos: "50% 40%",
  },
  {
    id: "siding",
    name: "Siding Painting",
    blurb: "Siding repainted evenly, board by board, with a coating matched to the material.",
    image: "/images/hero-mobile.webp",
    alt: "Painter on a ladder rolling white paint onto siding",
    pos: "40% 35%",
  },
  {
    id: "trim",
    name: "Trim & Door Painting",
    blurb: "Crisp cut lines on trim, frames, soffits and front doors. The details people notice.",
    image: "/images/trim.webp",
    alt: "Brush cutting in paint along an exterior edge",
    pos: "70% 50%",
  },
  {
    id: "prep",
    name: "Surface Preparation",
    blurb: "Protecting, scraping, sanding and patching, so the new coat bonds and lasts.",
    image: "/images/prep.webp",
    alt: "Work area protected with drop sheets before painting",
    pos: "50% 50%",
  },
  {
    id: "deck",
    name: "Deck & Fence Painting",
    blurb: "Stain and paint for decks, railings and fences that take the weather every day.",
    image: "/images/deck.webp",
    alt: "Freshly stained wooden deck and railings",
    pos: "50% 60%",
  },
];

export const SERVICE_OPTIONS = [...SERVICES.map((s) => s.name), "Not sure yet"];

// Before / after: MUST be two photos of the same house from the same spot.
// Leave null until real photos exist. The slider shows a labelled placeholder meanwhile.
export const BEFORE_AFTER: { before: string | null; after: string | null; caption: string } = {
  before: null, // e.g. "/images/before.webp"
  after: null, // e.g. "/images/after.webp"
  caption: "PLACEHOLDER: add a before and after photo of the same house, taken from the same spot.",
};

export type Project = { image: string; alt: string; title: string; detail: string; pos?: string; tall?: boolean };

// Only facts we know. Add location and scope as Alex supplies them.
export const PROJECTS: Project[] = [
  { image: "/images/hero-desktop.webp", alt: "Blue two-storey house with white trim after repainting", title: "Owen Sound, Ontario", detail: "Exterior repaint" },
  { image: "/images/hero-mobile.webp", alt: "White siding being repainted, dark shutters", title: "Siding repaint", detail: "Exterior", tall: true, pos: "50% 30%" },
  { image: "/images/log-home.webp", alt: "Log home exterior after finishing", title: "Log home", detail: "Exterior finish" },
  { image: "/images/deck.webp", alt: "Stained deck with railings beside a pool", title: "Deck", detail: "Staining" },
  { image: "/images/trim.webp", alt: "Brush detail work on a painted edge", title: "Detail work", detail: "Trim and edges" },
];

// Process images: interim real job photos. Swap for the same-house progress shots
// (sand / clean / prime / paint) when they are supplied.
export const PROCESS = [
  { n: "01", name: "Preparation", text: "We carefully protect surrounding areas, sand imperfections, and prepare surfaces for a lasting finish.", image: "/images/prep.webp", alt: "Area covered and protected before painting", pos: "50% 50%" },
  { n: "02", name: "Cleaning", text: "We thoroughly clean surfaces to remove dirt, dust, and buildup before painting.", image: "/images/painter-ladder.webp", alt: "Painter on a ladder at the siding", pos: "40% 25%" },
  { n: "03", name: "Priming", text: "We apply quality primers where needed to create a durable, consistent foundation.", image: "/images/trim.webp", alt: "Brush applying coating to a bare surface", pos: "70% 50%" },
  { n: "04", name: "Painting", text: "We deliver smooth, precise finishes with attention to every detail.", image: "/images/hero-mobile.webp", alt: "Painter rolling fresh paint onto white siding", pos: "40% 35%" },
];

export const REASONS = [
  { title: "Attention to detail", text: "Straight cut lines, even coverage and a final walkthrough with you before we call it done." },
  { title: "Professional preparation", text: "Most paint failures start with bad prep. We clean, scrape, sand and prime first, every time." },
  { title: "Quality materials", text: "We work with Dulux, a leading Canadian paint brand, and pick the right product for each surface." },
  { title: "Clear communication", text: "You know the plan, the schedule and who to call. Questions get answered, not dodged." },
  { title: "Respect for your property", text: "Gardens, walkways and windows get covered. We clean up every day and leave nothing behind." },
];

// SAMPLE CONTENT ONLY. Replace with real customer reviews (with permission) before relying on these.
export const TESTIMONIALS = [
  { quote: "Sample review: the crew showed up when they said they would, and the house looks brand new.", name: "Customer name", place: "Neighbourhood" },
  { quote: "Sample review: the prep work was careful and they cleaned up every single day.", name: "Customer name", place: "Neighbourhood" },
  { quote: "Sample review: clear quote, clear schedule, and the trim lines are perfect.", name: "Customer name", place: "Neighbourhood" },
];
