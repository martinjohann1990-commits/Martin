"use client";

import { track } from "@vercel/analytics";
import type { Product } from "@/lib/types";

/**
 * Schlanke Tracking-Schicht.
 * Alle Events laufen durch `sendEvent`, damit später ein zusätzliches Ziel
 * (GA4, Plausible, eigenes Backend) an genau einer Stelle ergänzt werden kann.
 */
type EventPayload = Record<string, string | number | boolean>;

function sendEvent(name: string, payload: EventPayload): void {
  // 1) Vercel Analytics (Custom Events)
  track(name, payload);

  // 2) dataLayer für Google Tag Manager – falls vorhanden.
  if (typeof window !== "undefined") {
    const w = window as typeof window & { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: name, ...payload });
    }
  }

  // 3) In der Entwicklung sichtbar machen, damit Events prüfbar sind.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${name}`, payload);
  }
}

/** Klick auf einen Affiliate-Link – das umsatzrelevanteste Event der Seite. */
export function trackAffiliateClick(
  product: Product,
  context: { placement: string; position?: number }
): void {
  sendEvent("affiliate_click", {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    network: product.network,
    price: product.price,
    placement: context.placement,
    position: context.position ?? 0,
  });
}

/** Der Nutzer startet den Finder. */
export function trackFinderStart(): void {
  sendEvent("finder_start", { step: 1 });
}

/** Beantwortete Frage im Finder – zeigt, wo Nutzer abspringen. */
export function trackFinderStep(step: number, question: string, answer: string): void {
  sendEvent("finder_step", { step, question, answer });
}

/** Der Finder hat ein Ergebnis ausgeliefert. */
export function trackFinderComplete(
  categorySlug: string,
  targetSlug: string,
  budgetId: string,
  resultCount: number
): void {
  sendEvent("finder_complete", {
    category: categorySlug,
    target: targetSlug,
    budget: budgetId,
    results: resultCount,
  });
}
