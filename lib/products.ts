import productsJson from "@/data/products.json";
import taxonomyJson from "@/data/taxonomy.json";
import type { Category, Product, Target, Taxonomy } from "@/lib/types";

/**
 * Einzige Stelle, an der die JSON-Datenquelle gelesen wird.
 * Wird die Datenquelle später auf eine echte API/DB umgestellt,
 * müssen nur die Funktionen in dieser Datei angepasst werden.
 */
const products = productsJson as Product[];
const taxonomy = taxonomyJson as Taxonomy;

export function getAllProducts(): Product[] {
  return products;
}

export function getCategories(): Category[] {
  return taxonomy.categories;
}

export function getTargets(): Target[] {
  return taxonomy.targets;
}

export function getCategory(slug: string): Category | undefined {
  return taxonomy.categories.find((category) => category.slug === slug);
}

export function getTarget(slug: string): Target | undefined {
  return taxonomy.targets.find((target) => target.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((product) => product.category === categorySlug);
}

export function getProductsByCategoryAndTarget(
  categorySlug: string,
  targetSlug: string
): Product[] {
  return getProductsByCategory(categorySlug).filter((product) =>
    product.bestForTags.includes(targetSlug)
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

/** Preisspanne einer Kategorie – Basis für die dynamischen Budget-Stufen im Finder. */
export function getPriceRange(categorySlug: string): {
  min: number;
  max: number;
} {
  const prices = getProductsByCategory(categorySlug).map((p) => p.price);
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Beste Produkte einer Kategorie – für "Alternativen"-Blöcke auf Landingpages. */
export function getTopRatedInCategory(
  categorySlug: string,
  limit: number,
  excludeIds: string[] = []
): Product[] {
  return getProductsByCategory(categorySlug)
    .filter((product) => !excludeIds.includes(product.id))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}
