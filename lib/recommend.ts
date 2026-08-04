import { getBestPrice } from "@/lib/offers";
import type { BudgetBand, Product, Recommendation, Target } from "@/lib/types";

/**
 * Empfehlungs-Engine.
 * Bewusst als reine Funktion ohne Abhängigkeiten gebaut: läuft identisch
 * auf dem Server (Landingpages) und im Browser (Finder) und ist damit
 * ohne API-Roundtrip sofort verfügbar.
 */

const WEIGHT_RATING = 35;
const WEIGHT_TARGET = 40;
const WEIGHT_BUDGET = 25;

/**
 * Erzeugt drei Budget-Stufen aus der tatsächlichen Preisverteilung der Kategorie.
 * Dadurch passen die Stufen automatisch zu jeder neuen Kategorie – egal ob
 * Tastaturen für 79 € oder Laptops für 2.199 €.
 */
export function getBudgetBands(products: Product[]): BudgetBand[] {
  // Immer der günstigste Händlerpreis – sonst filtert das Budget Produkte weg,
  // die es woanders längst billiger gibt.
  const prices = products.map(getBestPrice).sort((a, b) => a - b);

  if (prices.length === 0) {
    return [
      { id: "value", label: "Preisbewusst", hint: "günstigste Option", min: 0, max: 0 },
    ];
  }

  const min = prices[0];
  const max = prices[prices.length - 1];
  const lowerCut = prices[Math.floor((prices.length - 1) / 3)];
  const upperCut = prices[Math.floor((2 * (prices.length - 1)) / 3)];

  // Sicherstellen, dass die Stufen aufsteigend und unterscheidbar sind.
  const firstMax = Math.max(lowerCut, min);
  const secondMax = Math.max(upperCut, firstMax);

  return [
    {
      id: "value",
      label: "Preisbewusst",
      hint: `bis ca. ${formatEuro(firstMax)}`,
      min: 0,
      max: firstMax,
    },
    {
      id: "balanced",
      label: "Ausgewogen",
      hint: `bis ca. ${formatEuro(secondMax)}`,
      min: 0,
      max: secondMax,
    },
    {
      id: "premium",
      label: "Beste Leistung",
      hint: `bis ca. ${formatEuro(max)}`,
      min: 0,
      max: Number.POSITIVE_INFINITY,
    },
  ];
}

function formatEuro(value: number): string {
  return `${new Intl.NumberFormat("de-DE").format(Math.round(value))} €`;
}

export interface RecommendationInput {
  products: Product[];
  categorySlug: string;
  target?: Target;
  budget?: BudgetBand;
}

/**
 * Bewertet alle Produkte einer Kategorie und liefert sie absteigend sortiert
 * inklusive nachvollziehbarer Begründungen (Trust-Faktor auf der Karte).
 */
export function rankProducts({
  products,
  categorySlug,
  target,
  budget,
}: RecommendationInput): Recommendation[] {
  return products
    .filter((product) => product.category === categorySlug)
    .map((product) => scoreProduct(product, target, budget))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.product.rating !== a.product.rating) {
        return b.product.rating - a.product.rating;
      }
      return getBestPrice(a.product) - getBestPrice(b.product);
    });
}

/** Die Top-3 – mehr Auswahl senkt erwiesenermaßen die Conversion Rate. */
export function recommendTop(
  input: RecommendationInput,
  limit = 3
): Recommendation[] {
  return rankProducts(input).slice(0, limit);
}

function scoreProduct(
  product: Product,
  target?: Target,
  budget?: BudgetBand
): Recommendation {
  const reasons: string[] = [];
  let score = 0;

  // 1) Redaktionelle Bewertung
  score += (product.rating / 5) * WEIGHT_RATING;
  if (product.rating >= 4.6) {
    reasons.push(`Sehr gut bewertet (${product.rating.toFixed(1)} von 5)`);
  }

  // 2) Passung zum Anwendungsfall
  if (target) {
    if (product.bestForTags.includes(target.slug)) {
      score += WEIGHT_TARGET;
      reasons.push(`Speziell geeignet für ${target.label}`);
    } else {
      // Teil-Punkte, wenn das Produkt breit aufgestellt ist.
      score += Math.min(product.bestForTags.length, 3) * 4;
    }
  } else {
    score += WEIGHT_TARGET * 0.6;
  }

  // 3) Budget-Passung – gemessen am günstigsten verfügbaren Angebot
  if (budget) {
    const price = getBestPrice(product);
    if (price <= budget.max) {
      score += WEIGHT_BUDGET;
      reasons.push("Liegt in deinem Budget");
    } else if (price <= budget.max * 1.2) {
      score += WEIGHT_BUDGET * 0.45;
      reasons.push("Knapp über Budget – dafür spürbar mehr Leistung");
    }
  } else {
    score += WEIGHT_BUDGET * 0.6;
  }

  if (product.highlight) {
    reasons.push(product.highlight);
  }

  return {
    product,
    score: Math.min(100, Math.round(score)),
    reasons: reasons.slice(0, 3),
  };
}
