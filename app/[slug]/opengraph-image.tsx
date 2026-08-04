import { ImageResponse } from "next/og";
import {
  getAllLandingPages,
  getLandingHeadline,
  getLandingPage,
} from "@/lib/landing-pages";
import { getOfferView } from "@/lib/offers";
import { siteConfig } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

/**
 * OpenGraph-Bild je Landingpage.
 * Zeigt Überschrift, Anzahl der Empfehlungen und den günstigsten Preis –
 * damit ein geteilter Link schon in der Vorschau die Kernaussage transportiert.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kaufberatung";

export function generateStaticParams() {
  return getAllLandingPages().map((page) => ({ slug: page.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  const year = new Date().getFullYear();

  const headline = page ? `${getLandingHeadline(page)} ${year}` : siteConfig.name;
  const cheapest = page
    ? Math.min(...page.products.map((product) => getOfferView(product).bestPrice))
    : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          color: "#f8fafc",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#f8fafc">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{siteConfig.name}</div>
          <div
            style={{
              display: "flex",
              marginLeft: 12,
              padding: "6px 16px",
              borderRadius: 999,
              background: "#16a34a",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Verifizierte Empfehlung
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: headline.length > 46 ? 60 : 72,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {headline}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 26 }}>
          {page && (
            <div style={{ display: "flex", color: "#94a3b8" }}>
              {page.products.length} Empfehlungen im Vergleich · ab{" "}
              {formatPrice(cheapest)}
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
