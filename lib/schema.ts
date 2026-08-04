import { siteConfig } from "@/lib/site";
import type { LandingPage, Product } from "@/lib/types";

/**
 * Schema.org-Markup (JSON-LD).
 * Product + AggregateRating + Offer sorgen für Rich Results in der Google-Suche
 * (Sterne im Snippet = deutlich höhere Klickrate auf Money-Keywords).
 */

export function productSchema(product: Product, url: string) {
  return {
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.summary,
    url,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      bestRating: 5,
      ratingCount: product.reviewCount,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      // Bewusst die eigene Seite, nicht der Affiliate-Link: Google erwartet in
      // Offer.url die Seite, auf der das Angebot beschrieben wird.
      url,
    },
  };
}

export function landingPageSchema(page: LandingPage, headline: string) {
  const pageUrl = `${siteConfig.url}/${page.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: headline,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: page.products.length,
        itemListElement: page.products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: productSchema(product, pageUrl),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Start",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Ratgeber",
            item: `${siteConfig.url}/ratgeber`,
          },
          { "@type": "ListItem", position: 3, name: headline, item: pageUrl },
        ],
      },
    ],
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "de-DE",
  };
}
