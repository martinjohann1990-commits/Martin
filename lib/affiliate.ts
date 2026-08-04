import type { AffiliateNetwork, ProductOffer } from "@/lib/types";

/**
 * Netzwerk-Konfiguration.
 * Die Werte kommen aus den Umgebungsvariablen (siehe .env.example),
 * damit die Partner-IDs nicht im Code liegen und pro Deployment tauschbar sind.
 */
const partnerIds = {
  amazon: process.env.NEXT_PUBLIC_AMAZON_TAG ?? "",
  awin: process.env.NEXT_PUBLIC_AWIN_ID ?? "",
  impact: process.env.NEXT_PUBLIC_PARTNER_ID ?? "",
  digistore24: process.env.NEXT_PUBLIC_PARTNER_ID ?? "",
} satisfies Record<AffiliateNetwork, string>;

/** Query-Parameter, unter dem das Netzwerk die Partner-ID erwartet. */
const partnerParam: Record<AffiliateNetwork, string> = {
  amazon: "tag",
  awin: "awinaffid",
  impact: "irpid",
  digistore24: "aff",
};

/** Query-Parameter für die netzwerkseitige Sub-ID (= welche Unterseite hat konvertiert). */
const subIdParam: Record<AffiliateNetwork, string> = {
  amazon: "ascsubtag",
  awin: "clickref",
  impact: "subId1",
  digistore24: "cid",
};

const utmSource = process.env.NEXT_PUBLIC_UTM_SOURCE ?? "deal-finder";

export interface AffiliateLinkContext {
  /** Wo wurde geklickt? z. B. "finder-result", "landing-best-laptops-for-students" */
  placement: string;
  /** Produkt-ID – landet in der Sub-ID des Netzwerks. */
  productId: string;
  /** Produkt-Slug – landet in utm_content. */
  productSlug: string;
  /** Position in der Liste (1-basiert) – zeigt später, welche Slots konvertieren. */
  position?: number;
}

/**
 * Baut aus der Roh-URL eines Angebots einen vollständigen Affiliate-Link:
 * Partner-ID + Sub-ID + UTM-Parameter. Bestehende Query-Parameter der
 * Ziel-URL bleiben erhalten, gesetzte Werte werden nicht überschrieben.
 */
export function buildAffiliateUrl(
  offer: ProductOffer,
  context: AffiliateLinkContext
): string {
  let url: URL;
  try {
    url = new URL(offer.url);
  } catch {
    // Ungültige URL in den Daten: lieber der Rohwert als ein kaputter Link.
    return offer.url;
  }

  const partnerId = partnerIds[offer.network];
  if (partnerId && !url.searchParams.has(partnerParam[offer.network])) {
    url.searchParams.set(partnerParam[offer.network], partnerId);
  }

  const subId = buildSubId(offer, context);
  if (!url.searchParams.has(subIdParam[offer.network])) {
    url.searchParams.set(subIdParam[offer.network], subId);
  }

  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", context.placement);
  url.searchParams.set("utm_content", context.productSlug);

  return url.toString();
}

/**
 * Sub-IDs dürfen bei den meisten Netzwerken nur alphanumerisch + Bindestrich sein
 * und sind längenbegrenzt (Amazon: 100 Zeichen).
 * Format: placement-produktid-haendler-posN
 */
function buildSubId(offer: ProductOffer, context: AffiliateLinkContext): string {
  const parts = [context.placement, context.productId, offer.merchant];
  if (context.position) parts.push(`pos${context.position}`);
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 100);
}

/** Einheitliche Rel-Attribute für alle bezahlten Links (Google-konform). */
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer";
