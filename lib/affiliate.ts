import type { AffiliateNetwork, Product } from "@/lib/types";

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
  /** Position in der Liste (1-basiert) – zeigt später, welche Slots konvertieren. */
  position?: number;
}

/**
 * Baut aus der Roh-URL des Produkts einen vollständigen Affiliate-Link:
 * Partner-ID + Sub-ID + UTM-Parameter. Bestehende Query-Parameter der
 * Ziel-URL bleiben erhalten, gesetzte Werte werden nicht überschrieben.
 */
export function buildAffiliateUrl(
  product: Product,
  context: AffiliateLinkContext
): string {
  let url: URL;
  try {
    url = new URL(product.affiliateUrl);
  } catch {
    // Ungültige URL in den Daten: lieber der Rohwert als ein kaputter Link.
    return product.affiliateUrl;
  }

  const partnerId = partnerIds[product.network];
  if (partnerId && !url.searchParams.has(partnerParam[product.network])) {
    url.searchParams.set(partnerParam[product.network], partnerId);
  }

  const subId = buildSubId(product, context);
  if (!url.searchParams.has(subIdParam[product.network])) {
    url.searchParams.set(subIdParam[product.network], subId);
  }

  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", context.placement);
  url.searchParams.set("utm_content", product.slug);

  return url.toString();
}

/**
 * Sub-IDs dürfen bei den meisten Netzwerken nur alphanumerisch + Bindestrich sein
 * und sind längenbegrenzt (Amazon: 100 Zeichen).
 */
function buildSubId(product: Product, context: AffiliateLinkContext): string {
  const parts = [context.placement, product.id];
  if (context.position) parts.push(`pos${context.position}`);
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 100);
}

/** Einheitliche Rel-Attribute für alle bezahlten Links (Google-konform). */
export const AFFILIATE_REL = "sponsored nofollow noopener noreferrer";

/** Händlername für den CTA-Text, z. B. "Preis auf Amazon prüfen". */
export function getMerchantLabel(network: AffiliateNetwork): string {
  switch (network) {
    case "amazon":
      return "Amazon";
    case "awin":
      return "Partnershop";
    case "impact":
      return "Hersteller";
    case "digistore24":
      return "Anbieter";
  }
}
