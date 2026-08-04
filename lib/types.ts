/**
 * Zentrale Typdefinitionen für die Produkt-Datenbank.
 * Die JSON-Dateien in /data werden gegen diese Typen validiert (siehe lib/products.ts).
 */

export type AffiliateNetwork = "amazon" | "awin" | "impact" | "digistore24";

/**
 * Ein Angebot eines Händlers für ein Produkt.
 * Dasselbe Gerät kann bei mehreren Händlern liegen – unterschiedlicher Preis,
 * unterschiedliches Netzwerk, unterschiedliche Provision.
 */
export interface ProductOffer {
  /** Anzeigename des Händlers, z. B. "Cyberport" */
  merchant: string;
  network: AffiliateNetwork;
  /** Roh-URL ohne Tracking-Parameter – die werden zur Laufzeit ergänzt. */
  url: string;
  /** Preis bei diesem Händler in EUR */
  price: number;
  /** Provision in Prozent. Überschreibt den Netzwerk-Standard aus lib/offers.ts. */
  commissionRate?: number;
  /** Deckelung der Provision pro Verkauf in EUR (z. B. Kategorie-Cap bei Amazon). */
  commissionCap?: number;
  /** Optionaler Zusatz auf der Karte, z. B. "Versandkostenfrei". */
  note?: string;
}

export interface Product {
  /** Stabile, eindeutige ID (wird für Tracking-Events verwendet) */
  id: string;
  name: string;
  /** URL-sicherer Bezeichner, z. B. "thinkbook-14-air" */
  slug: string;
  /** Referenziert Category.slug aus data/taxonomy.json */
  category: string;
  brand: string;
  /**
   * Preis des Haupt-Angebots in EUR (nur Orientierung, nie als Festpreis anzeigen!).
   * Für Vergleiche und Budget-Filter wird immer der günstigste Preis aus allen
   * Angeboten verwendet – siehe getBestPrice() in lib/offers.ts.
   */
  price: number;
  /** Redaktionelle Bewertung 0–5 – die Einschätzung der Redaktion, keine Kundenbewertung. */
  rating: number;
  /**
   * Anzahl der Kundenbewertungen beim Händler. Optional und **nur** ausfüllen,
   * wenn der Wert tatsächlich nachgeschlagen wurde: Nur dann wird
   * AggregateRating-Markup ausgegeben. Erfundene Werte sind ein Verstoß gegen
   * Googles Richtlinien für strukturierte Daten.
   */
  reviewCount?: number;
  /** Ziel-URL des Haupt-Händlers – wird zur Laufzeit mit Tracking-Parametern angereichert */
  affiliateUrl: string;
  network: AffiliateNetwork;
  /** Weitere Händler mit demselben Produkt. Optional. */
  offers?: ProductOffer[];
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
