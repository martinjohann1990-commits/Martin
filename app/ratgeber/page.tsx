import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllLandingPages, getLandingHeadline } from "@/lib/landing-pages";
import { getCategories } from "@/lib/products";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Alle Kaufberatungen im Überblick",
  description:
    "Alle Kaufberatungen von " +
    siteConfig.name +
    ": geprüfte Produktempfehlungen nach Einsatzzweck und Budget – von Laptops für Studenten bis Monitoren fürs Home-Office.",
  alternates: { canonical: "/ratgeber" },
};

export default function RatgeberPage() {
  const pages = getAllLandingPages();
  const categories = getCategories();

  return (
    <div className="container py-10 lg:py-14">
      <header className="max-w-2xl space-y-4">
        <Badge variant="secondary">{pages.length} Kaufberatungen</Badge>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Alle Kaufberatungen im Überblick
        </h1>
        <p className="text-lg text-muted-foreground">
          Jede Seite bündelt die besten Geräte einer Kategorie für einen
          konkreten Einsatzzweck – inklusive Vor- und Nachteilen, Richtpreisen
          und direktem Link zum besten Angebot.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {categories.map((category) => {
          const categoryPages = pages.filter(
            (page) => page.category.slug === category.slug
          );
          if (categoryPages.length === 0) return null;

          return (
            <section key={category.slug}>
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {category.description}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryPages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-sm"
                  >
                    <div>
                      <p className="font-semibold leading-tight">
                        {getLandingHeadline(page)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {page.products.length} Empfehlungen ·{" "}
                        {page.target.label}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
