import { ImageResponse } from "next/og";
import { getAllLandingPages } from "@/lib/landing-pages";
import { getAllProducts } from "@/lib/products";
import { siteConfig } from "@/lib/site";

/**
 * OpenGraph-Bild der Startseite.
 * Wird zur Build-Zeit als PNG erzeugt – kein externes Bild, keine Design-Datei.
 */
export const alt = `${siteConfig.name} – ${siteConfig.claim}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const products = getAllProducts().length;
  const pages = getAllLandingPages().length;

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
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#f8fafc">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
            </svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2 }}>
            Drei Fragen zum
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
              color: "#60a5fa",
            }}
          >
            richtigen Produkt.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 26 }}>
          <div
            style={{
              display: "flex",
              background: "#16a34a",
              color: "#f8fafc",
              padding: "10px 22px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Ohne Anmeldung
          </div>
          <div style={{ display: "flex", color: "#94a3b8" }}>
            {products} geprüfte Produkte · {pages} Kaufberatungen
          </div>
        </div>
      </div>
    ),
    size
  );
}
