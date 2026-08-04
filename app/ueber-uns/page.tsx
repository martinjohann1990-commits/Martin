import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Coins, ScanSearch, ShieldOff } from "lucide-react";
import { OwnerWarning } from "@/components/owner-warning";
import { getAllProducts } from "@/lib/products";
import { getAllLandingPages } from "@/lib/landing-pages";
import { owner } from "@/lib/owner";
import { lastReviewedAt, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Über uns und unsere Arbeitsweise",
  description: `Wer hinter ${siteConfig.name} steckt, wie die Empfehlungen entstehen und wie sich die Seite finanziert.`,
  alternates: { canonical: "/ueber-uns" },
};

const principles = [
  {
    icon: ScanSearch,
    title: "So entsteht eine Empfehlung",
    text: "Wir werten Testberichte, Datenblätter und verifizierte Kundenrezensionen aus und vergeben daraus eine eigene redaktionelle Note. Aus dieser Note, der Eignung für den jeweiligen Anwendungsfall und dem Budget berechnet der Finder einen Match-Wert. Wir zeigen nie mehr als drei Treffer – mehr Auswahl macht die Entscheidung nur schwerer.",
  },
  {
    icon: ShieldOff,
    title: "Was wir nicht tun",
    text: "Wir nehmen kein Geld dafür, ein Produkt aufzunehmen oder besser zu platzieren. Die Reihenfolge der Empfehlungen richtet sich nach Eignung, nicht nach Provisionshöhe. Und wir verschweigen keine Nachteile: Zu jedem Produkt stehen die Schwächen genauso da wie die Stärken.",
  },
  {
    icon: Coins,
    title: "Wie sich die Seite finanziert",
    text: "Über Provisionen der Händler. Kaufst du über einen unserer Links, erhalten wir einen kleinen Anteil vom Kaufpreis – für dich ändert sich nichts, der Preis bleibt identisch. Ohne diese Provisionen könnten wir die Recherche nicht kostenlos anbieten.",
  },
  {
    icon: BadgeCheck,
    title: "Wie aktuell die Angaben sind",
    text: "Preise sind Richtwerte vom Tag der letzten Prüfung, nicht garantierte Verkaufspreise – der verbindliche Preis steht immer beim Händler. Wir prüfen die Auswahl regelmäßig und tauschen Produkte aus, sobald ein Nachfolger erscheint oder ein Gerät dauerhaft nicht mehr lieferbar ist.",
  },
];

export default function UeberUnsPage() {
  const products = getAllProducts();
  const pages = getAllLandingPages();

  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <OwnerWarning />

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Über {siteConfig.name}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Ein gutes Gerät zu finden dauert heute länger als der Kauf selbst.
        Testberichte widersprechen sich, Bestenlisten sind ein Jahr alt und in
        jedem Vergleich steht ein anderes Produkt vorn. {siteConfig.name} macht
        daraus drei Fragen und eine klare Empfehlung.
      </p>

      <section className="mt-10 space-y-2 rounded-lg border bg-card p-5">
        <h2 className="text-xl font-bold">Wer dahintersteckt</h2>
        <p className="text-muted-foreground">
          Diese Seite wird betrieben von {owner.name}. Fragen, Kritik oder ein
          Produkt, das hier fehlt? Schreib an{" "}
          <a
            href={`mailto:${owner.email}`}
            className="font-medium text-primary hover:underline"
          >
            {owner.email}
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          {/* Diesen Absatz durch die eigene Geschichte ersetzen: Hintergrund,
              warum ausgerechnet diese Produktkategorie, seit wann. Das ist der
              Teil, den Google unter E-E-A-T bewertet und den Partnerprogramme
              bei der Freischaltung lesen. */}
          Ergänze hier zwei bis drei Sätze zu deinem Hintergrund und dazu, warum
          du dich mit dieser Produktkategorie auskennst.
        </p>
      </section>

      <div className="mt-8 space-y-6">
        {principles.map((principle) => (
          <section key={principle.title} className="flex gap-4">
            <principle.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold">{principle.title}</h2>
              <p className="leading-relaxed text-muted-foreground">
                {principle.text}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-lg border bg-muted/40 p-5">
        <h2 className="text-lg font-bold">Der aktuelle Stand</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Geprüfte Produkte</dt>
            <dd className="text-2xl font-bold">{products.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Kaufberatungen</dt>
            <dd className="text-2xl font-bold">{pages.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Zuletzt geprüft</dt>
            <dd className="text-2xl font-bold">
              {new Date(lastReviewedAt).toLocaleDateString("de-DE")}
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        Details zur Datenverarbeitung stehen in der{" "}
        <Link href="/datenschutz" className="font-medium text-primary hover:underline">
          Datenschutzerklärung
        </Link>
        , die Anbieterkennzeichnung im{" "}
        <Link href="/impressum" className="font-medium text-primary hover:underline">
          Impressum
        </Link>
        .
      </p>
    </div>
  );
}
