import {
  getCategories,
  getProductsByCategoryAndTarget,
  getTargets,
  getCategory,
  getTarget,
} from "@/lib/products";
import type { LandingPage } from "@/lib/types";

/**
 * Programmatic SEO.
 * Aus Kategorien × Zielgruppen werden automatisch Landingpages nach dem
 * Muster `/best-[category]-for-[target]` erzeugt – z. B.
 * `/best-laptops-for-students`.
 *
 * Eine Seite wird nur generiert, wenn genügend passende Produkte existieren.
 * Dünne Seiten ohne echten Mehrwert schaden dem Ranking mehr, als sie bringen.
 */
const MIN_PRODUCTS_PER_PAGE = 2;

export function buildLandingSlug(
  categorySlug: string,
  targetSlug: string
): string {
  return `best-${categorySlug}-for-${targetSlug}`;
}

/**
 * Zerlegt einen Slug wieder in Kategorie und Zielgruppe.
 * Da beide Teile selbst Bindestriche enthalten können (z. B. "home-office"),
 * werden alle möglichen Trennpositionen gegen die Taxonomie geprüft.
 */
export function parseLandingSlug(
  slug: string
): { categorySlug: string; targetSlug: string } | null {
  if (!slug.startsWith("best-")) return null;

  const rest = slug.slice("best-".length);
  const separator = "-for-";
  let searchFrom = 0;

  while (true) {
    const index = rest.indexOf(separator, searchFrom);
    if (index === -1) return null;

    const categorySlug = rest.slice(0, index);
    const targetSlug = rest.slice(index + separator.length);

    if (getCategory(categorySlug) && getTarget(targetSlug)) {
      return { categorySlug, targetSlug };
    }
    searchFrom = index + 1;
  }
}

/** Alle generierbaren Landingpages – Basis für Routing, Sitemap und Interlinking. */
export function getAllLandingPages(): LandingPage[] {
  const pages: LandingPage[] = [];

  for (const category of getCategories()) {
    for (const target of getTargets()) {
      const products = getProductsByCategoryAndTarget(
        category.slug,
        target.slug
      );
      if (products.length < MIN_PRODUCTS_PER_PAGE) continue;

      pages.push({
        slug: buildLandingSlug(category.slug, target.slug),
        category,
        target,
        products,
      });
    }
  }

  return pages;
}

export function getLandingPage(slug: string): LandingPage | null {
  const parsed = parseLandingSlug(slug);
  if (!parsed) return null;

  const category = getCategory(parsed.categorySlug);
  const target = getTarget(parsed.targetSlug);
  if (!category || !target) return null;

  const products = getProductsByCategoryAndTarget(category.slug, target.slug);
  if (products.length < MIN_PRODUCTS_PER_PAGE) return null;

  return { slug, category, target, products };
}

/** Verwandte Seiten für interne Verlinkung (gleiche Kategorie oder gleiche Zielgruppe). */
export function getRelatedLandingPages(
  page: LandingPage,
  limit = 6
): LandingPage[] {
  return getAllLandingPages()
    .filter((candidate) => candidate.slug !== page.slug)
    .filter(
      (candidate) =>
        candidate.category.slug === page.category.slug ||
        candidate.target.slug === page.target.slug
    )
    .slice(0, limit);
}

/** H1 / Title-Tag: "Die besten Laptops für Studenten" */
export function getLandingHeadline(page: LandingPage): string {
  return `Die besten ${page.category.label} für ${page.target.label}`;
}
