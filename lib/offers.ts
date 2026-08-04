import type { AffiliateNetwork, Product, ProductOffer } from "@/lib/types";
import { slugify } from "@/lib/utils";

/**
 * Angebots-Logik für mehrere Händler pro Produkt.
 *
 * Ziel: den Umsatz pro Klick maximieren, ohne den Nutzer zu einem
 * schlechteren Preis zu schicken. Deshalb zwei getrennte Sortierungen:
 *
 *  - `resolveOffers()` liefert alle Angebote **nach Preis** sortiert
 *    (das sieht der Nutzer im Preisvergleich).
 *  - `selectPrimaryOffer()` wählt daraus für den großen CTA das Angebot mit
 *    der **höchsten erwarteten Provision** – aber nur unter denen, die
 *    preislich nicht mehr als MAX_PRICE_DELTA über dem Bestpreis liegen.
 *
 * Ohne diese Preisschranke würde die Seite Nutzer systematisch zum teureren
 * Händler schicken. Das kostet Vertrauen und damit langfristig mehr, als die
 * höhere Provision einbringt.
 */

/** Wie weit darf der CTA-Händler maximal über dem Bestpreis liegen? */
export const MAX_PRICE_DELTA = 0.03; // 3 %

/**
 * Provisions-Annahmen je Netzwerk in Prozent, wenn am Angebot nichts
 * Konkretes hinterlegt ist. Bitte an die eigenen Verträge anpassen –
 * das sind bewusst konservative Werte.
 */
export const DEFAULT_COMMISSION_RATE: Record<AffiliateNetwork, number> = {
  amazon: 1,
  awin: 4,
  impact: 5,
  digistore24: 30,
};

export interface ResolvedOffer extends ProductOffer {
  /** Stabiler Schlüssel für React-Listen und Tracking. */
  id: string;
  /** Erwartete Provision in EUR (Preis × Rate, ggf. gedeckelt). */
  payout: number;
  /** Angewandter Provisionssatz in Prozent. */
  rate: number;
}

/** Baut das Haupt-Angebot aus den Basisfeldern des Produkts. */
function primaryOfferFromProduct(product: Product): ProductOffer {
  return {
    merchant: defaultMerchantName(product.network),
    network: product.network,
    url: product.affiliateUrl,
    price: product.price,
  };
}

function defaultMerchantName(network: AffiliateNetwork): string {
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

export function calculatePayout(offer: ProductOffer): {
  payout: number;
  rate: number;
} {
  const rate = offer.commissionRate ?? DEFAULT_COMMISSION_RATE[offer.network];
  const raw = (offer.price * rate) / 100;
  const payout =
    typeof offer.commissionCap === "number"
      ? Math.min(raw, offer.commissionCap)
      : raw;
  return { payout: Math.round(payout * 100) / 100, rate };
}

/**
 * Alle Angebote eines Produkts, nach Preis aufsteigend sortiert.
 * Enthält immer mindestens das Haupt-Angebot.
 */
export function resolveOffers(product: Product): ResolvedOffer[] {
  const raw = [primaryOfferFromProduct(product), ...(product.offers ?? [])];

  return raw
    .map((offer, index) => {
      const { payout, rate } = calculatePayout(offer);
      return {
        ...offer,
        id: `${product.id}-${slugify(offer.merchant) || `offer${index}`}`,
        payout,
        rate,
      };
    })
    .sort((a, b) => a.price - b.price);
}

/**
 * Das Angebot für den Haupt-CTA: beste Provision innerhalb der Preisschranke.
 * Bei gleicher Provision gewinnt der günstigere Händler.
 */
export function selectPrimaryOffer(offers: ResolvedOffer[]): ResolvedOffer {
  const cheapest = offers[0];
  const priceLimit = cheapest.price * (1 + MAX_PRICE_DELTA);

  return offers
    .filter((offer) => offer.price <= priceLimit)
    .reduce((best, offer) => {
      if (offer.payout !== best.payout) {
        return offer.payout > best.payout ? offer : best;
      }
      return offer.price < best.price ? offer : best;
    }, cheapest);
}

/** Günstigster Preis über alle Händler – Basis für Budget-Filter und Vergleich. */
export function getBestPrice(product: Product): number {
  return resolveOffers(product)[0].price;
}

/** Bequemer Sammel-Zugriff für Komponenten. */
export function getOfferView(product: Product): {
  offers: ResolvedOffer[];
  primary: ResolvedOffer;
  bestPrice: number;
  /** Alle Angebote außer dem CTA-Angebot, weiterhin nach Preis sortiert. */
  alternatives: ResolvedOffer[];
} {
  const offers = resolveOffers(product);
  const primary = selectPrimaryOffer(offers);

  return {
    offers,
    primary,
    bestPrice: offers[0].price,
    alternatives: offers.filter((offer) => offer.id !== primary.id),
  };
}
