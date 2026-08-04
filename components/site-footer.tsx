import Link from "next/link";
import { getAllLandingPages, getLandingHeadline } from "@/lib/landing-pages";
import { lastReviewedAt, siteConfig } from "@/lib/site";

export function SiteFooter() {
  // Interne Verlinkung aller Landingpages -> Crawling-Tiefe bleibt bei 1 Klick.
  const pages = getAllLandingPages().slice(0, 12);

  return (
    <footer className="mt-20 border-t bg-muted/40">
      <div className="container grid gap-10 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="text-sm text-muted-foreground">
            {siteConfig.description}
          </p>
          <p className="text-xs text-muted-foreground">
            Letzte redaktionelle Prüfung:{" "}
            {new Date(lastReviewedAt).toLocaleDateString("de-DE")}
          </p>
        </div>

        <div className="md:col-span-2">
          <p className="mb-3 text-sm font-semibold">Beliebte Kaufberatungen</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${page.slug}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {getLandingHeadline(page)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container flex flex-col gap-3 py-6 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <Link href="/ueber-uns" className="transition-colors hover:text-foreground">
              Über uns
            </Link>
            <Link href="/impressum" className="transition-colors hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-foreground">
              Datenschutz
            </Link>
          </nav>
          <p>{siteConfig.affiliateDisclosure}</p>
          <p>
            © {new Date().getFullYear()} {siteConfig.name} · Alle Preise inkl.
            MwSt. zum Zeitpunkt der letzten Aktualisierung. Maßgeblich ist immer
            der Preis im Shop.
          </p>
        </div>
      </div>
    </footer>
  );
}
