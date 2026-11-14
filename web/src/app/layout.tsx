import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { BUSINESS, asset } from "@/lib/site";
import Providers from "@/components/Providers";

const SITE_URL = "https://alfrook.github.io/studentworks/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Student Works Painting | Exterior House Painting, Forest Hill Toronto",
  description:
    "Professional exterior painting that protects your home and makes it stand out. Student Works Painting, Forest Hill, Toronto. Free estimates: 647-388-8488.",
  openGraph: {
    title: "Student Works Painting | We don't just paint. We transform.",
    description: "Exterior house, siding, trim, deck and fence painting in Toronto. Get a free estimate.",
    url: SITE_URL,
    siteName: BUSINESS.name,
    images: [{ url: asset("/og.jpg"), width: 1200, height: 630, alt: "A house repainted by Student Works Painting" }],
    locale: "en_CA",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#151515",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HousePainter",
  name: `${BUSINESS.name} (${BUSINESS.division})`,
  telephone: "+1-647-388-8488",
  url: SITE_URL,
  image: `${SITE_URL}og.jpg`,
  slogan: BUSINESS.tagline,
  areaServed: BUSINESS.areaServed.map((c) => ({ "@type": "City", name: c })),
  address: { "@type": "PostalAddress", addressLocality: "Toronto", addressRegion: "ON", addressCountry: "CA" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preload" as="image" href={asset("/images/hero-mobile.webp")} media="(max-width: 767px)" fetchPriority="high" />
        <link rel="preload" as="image" href={asset("/images/hero-desktop.webp")} media="(min-width: 768px)" fetchPriority="high" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-paper focus:px-4 focus:py-3 focus:font-bold">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
