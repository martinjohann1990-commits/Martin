import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { AffiliateLink } from "@/components/affiliate-link";
import { getOfferView } from "@/lib/offers";
import {
  getBuyingCriteria,
  getLandingFaqs,
  getLandingIntro,
} from "@/lib/content";
import {
  getAllLandingPages,
  getLandingHeadline,
  getLandingPage,
  getRelatedLandingPages,
} from "@/lib/landing-pages";
import { getAllProducts, getTopRatedInCategory } from "@/lib/products";
import { rankProducts } from "@/lib/recommend";
import { faqSchema, landingPageSchema } from "@/lib/schema";
import { lastReviewedAt, siteConfig } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

/**
 * Programmatische SEO-Landingpage: /best-[category]-for-[target]
 * z. B. /best-laptops-for-students
 *
 * Alle Seiten werden zur Build-Zeit statisch erzeugt (SSG) und vom CDN
 * ausgeliefert – Time to First Byte im zweistelligen Millisekunden-Bereich.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLandingPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};

  const year = new Date().getFullYear();
  const headline = `${getLandingHeadline(page)} ${year}`;
  const description = `${page.products.length} geprüfte ${page.category.label} für ${page.target.label} im Vergleich: Vor- und Nachteile, Preise und klare Empfehlung. Ohne Anmeldung, in 30 Sekunden zum Ergebnis.`;
  const url = `${siteConfig.url}/${page.slug}`;

  return {
    title: headline,
    description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      type: "article",
      url,
      title: headline,
      description,
      locale: siteConfig.locale,
      siteName: siteConfig.name,
    },
    twitter: { card: "summary_large_image", title: headline, description },
  };
}

export default async function LandingPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  const year = new Date().getFullYear();
  const headline = `${getLandingHeadline(page)} ${year}`;
  const faqs = getLandingFaqs(page);
  const criteria = getBuyingCriteria(page.category.slug);
  const related = getRelatedLandingPages(page);

  // Ranking innerhalb der Zielgruppe – identische Engine wie im Finder.
  const ranked = rankProducts({
    products: getAllProducts(),
    categorySlug: page.category.slug,
    target: page.target,
  }).filter((entry) => entry.product.bestForTags.includes(page.target.slug));

  const alternatives = getTopRatedInCategory(
    page.category.slug,
    3,
    page.products.map((product) => product.id)
  );

  return (
    <>
      <JsonLd data={landingPageSchema(page, headline)} />
      <JsonLd data={faqSchema(faqs)} />

      <article className="container py-10 lg:py-14">
        {/* Breadcrumb */}
        <nav
          aria-label="Brotkrumen-Navigation"
          className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            Start
          </Link>
          <span>/</span>
          <Link href="/ratgeber" className="hover:text-foreground">
            Ratgeber
          </Link>
          <span>/</span>
          <span className="text-foreground">{getLandingHeadline(page)}</span>
        </nav>

        <header className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {page.category.icon} {page.category.label}
            </Badge>
            <Badge variant="secondary">
              {page.target.icon} {page.target.label}
            </Badge>
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verifizierte Empfehlung
            </Badge>
          </div>

          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {headline}
          </h1>

          <p className="text-lg text-muted-foreground">
            {getLandingIntro(page)}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4" />
              Zuletzt geprüft:{" "}
              {new Date(lastReviewedAt).toLocaleDateString("de-DE")}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Unabhängige Auswahl · Werbe-Links
            </span>
          </div>
        </header>

        {/* Schnellüberblick: die wichtigste Conversion-Zone above the fold */}
        <section className="mt-8 rounded-xl border bg-muted/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Auf einen Blick
          </h2>
          <ul className="mt-3 divide-y">
            {ranked.slice(0, 3).map((entry, index) => {
              // Bewusst der Preis des verlinkten Angebots: Was hier steht, muss
              // der Nutzer nach dem Klick auch vorfinden.
              const { primary } = getOfferView(entry.product);
              return (
                <li
                  key={entry.product.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">
                        {entry.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.product.highlight ?? entry.product.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">
                      {formatPrice(primary.price)}
                      <span className="ml-1 font-normal text-muted-foreground">
                        bei {primary.merchant}
                      </span>
                    </span>
                    <AffiliateLink
                      product={entry.product}
                      offer={primary}
                      placement={`landing-${page.slug}-quicklist`}
                      position={index + 1}
                      isPrimary
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Preis prüfen →
                    </AffiliateLink>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Ranking */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Unsere Empfehlungen im Detail
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Sortiert nach Eignung für {page.target.label} – nicht nach
            Provisionshöhe.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ranked.map((entry, index) => (
              <ProductCard
                key={entry.product.id}
                product={entry.product}
                position={index + 1}
                score={entry.score}
                reasons={entry.reasons}
                placement={`landing-${page.slug}`}
              />
            ))}
          </div>
        </section>

        {/* Vergleichstabelle */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Direkter Vergleich
          </h2>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">Produkt</th>
                  <th className="p-3 font-semibold">Bewertung</th>
                  <th className="p-3 font-semibold">Preis</th>
                  <th className="p-3 font-semibold">Verfügbar bei</th>
                  <th className="p-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry, index) => {
                  const { primary, offers } = getOfferView(entry.product);
                  return (
                    <tr key={entry.product.id} className="border-t">
                      <td className="p-3">
                        <span className="font-semibold">
                          {entry.product.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.product.brand}
                        </span>
                      </td>
                      <td className="p-3">
                        <StarRating rating={entry.product.rating} />
                      </td>
                      <td className="p-3 font-semibold">
                        {formatPrice(primary.price)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          bei {primary.merchant}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {offers.map((offer) => offer.merchant).join(", ")}
                      </td>
                      <td className="p-3">
                        <AffiliateLink
                          product={entry.product}
                          offer={primary}
                          placement={`landing-${page.slug}-table`}
                          position={index + 1}
                          isPrimary
                          className="whitespace-nowrap font-semibold text-primary hover:underline"
                        >
                          Zum Angebot bei {primary.merchant} →
                        </AffiliateLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {siteConfig.affiliateDisclosure}
          </p>
        </section>

        {/* Kaufberatung */}
        {criteria.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Worauf du beim Kauf achten solltest
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {criteria.map((criterion) => (
                <div
                  key={criterion.title}
                  className="rounded-lg border bg-card p-5"
                >
                  <h3 className="font-semibold">{criterion.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {criterion.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alternativen aus derselben Kategorie */}
        {alternatives.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ebenfalls einen Blick wert
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alternatives.map((product, index) => {
                const { primary } = getOfferView(product);
                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-2 rounded-lg border bg-card p-4"
                  >
                    <p className="font-semibold leading-tight">
                      {product.name}
                    </p>
                    <StarRating rating={product.rating} />
                    <p className="text-sm text-muted-foreground">
                      {product.summary}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-semibold">
                        {formatPrice(primary.price)}
                      </span>
                      <AffiliateLink
                        product={product}
                        offer={primary}
                        placement={`landing-${page.slug}-alternatives`}
                        position={index + 1}
                        isPrimary
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Preis prüfen →
                      </AffiliateLink>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Häufige Fragen zu {page.category.label} für {page.target.label}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Interne Verlinkung */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Passende Kaufberatungen
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedPage) => (
                <Link
                  key={relatedPage.slug}
                  href={`/${relatedPage.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:border-primary"
                >
                  <span className="font-medium leading-tight">
                    {getLandingHeadline(relatedPage)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Abschluss-CTA zum Finder */}
        <section className="mt-12 rounded-xl border bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Unsicher, ob das die richtige Kategorie ist?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Beantworte drei kurze Fragen und erhalte eine Empfehlung, die exakt
            zu deinem Budget und Einsatzzweck passt.
          </p>
          <Link
            href="/#finder"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Finder starten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </article>
    </>
  );
}
