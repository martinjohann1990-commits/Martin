/**
 * Zentrale Typdefinitionen für die Produkt-Datenbank.
 * Die JSON-Dateien in /data werden gegen diese Typen validiert (siehe lib/products.ts).
 */

export type AffiliateNetwork = "amazon" | "awin" | "impact" | "digistore24";

export interface Product {
  /** Stabile, eindeutige ID (wird für Tracking-Events verwendet) */
  id: string;
  name: string;
  /** URL-sicherer Bezeichner, z. B. "thinkbook-14-air" */
  slug: string;
  /** Referenziert Category.slug aus data/taxonomy.json */
  category: string;
  brand: string;
  /** Aktueller Straßenpreis in EUR (nur Orientierung, nie als Festpreis anzeigen!) */
  price: number;
  /** Redaktionelle Bewertung 0–5 */
  rating: number;
  reviewCount: number;
  /** Ziel-URL beim Händler – wird zur Laufzeit mit Tracking-Parametern angereichert */
  affiliateUrl: string;
  network: AffiliateNetwork;
  /** Kurzer USP-Satz für Karten und Meta-Descriptions */
  summary: string;
  pros: string[];
  cons: string[];
  /** Referenziert Target.slug aus data/taxonomy.json */
  bestForTags: string[];
  /** Optionales Editorial-Label auf der Karte, z. B. "Preis-Leistungs-Sieger" */
  highlight?: string;
  /** Tailwind-Gradient für das Platzhalter-Visual (keine externen Bilder = maximaler Speed) */
  accent: string;
}

export interface Category {
  slug: string;
  /** Anzeigename im Plural, z. B. "Laptops" */
  label: string;
  /** Anzeigename im Singular, z. B. "Laptop" */
  singular: string;
  icon: string;
  /** Frage im Finder, z. B. "Wofür brauchst du das Gerät?" */
  description: string;
}

export interface Target {
  slug: string;
  /** Dativ-Form für Headlines: "für Studenten" */
  label: string;
  /** Kurzbeschreibung des Use-Cases */
  description: string;
  icon: string;
}

export interface Taxonomy {
  categories: Category[];
  targets: Target[];
}

export interface BudgetBand {
  id: "value" | "balanced" | "premium";
  label: string;
  hint: string;
  min: number;
  max: number;
}

export interface Recommendation {
  product: Product;
  /** 0–100, wird als "Match" auf der Karte angezeigt */
  score: number;
  /** Menschenlesbare Begründungen ("Passt zu deinem Budget") */
  reasons: string[];
}

export interface LandingPage {
  /** Vollständiger Slug: "best-laptops-for-students" */
  slug: string;
  category: Category;
  target: Target;
  products: Product[];
}
