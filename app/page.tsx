import Link from "next/link";
import { ArrowRight, CheckCircle2, Star, Users } from "lucide-react";
import { Finder } from "@/components/finder";
import { JsonLd } from "@/components/json-ld";
import { TrustBar } from "@/components/trust-bar";
import { Badge } from "@/components/ui/badge";
import { getAllLandingPages, getLandingHeadline } from "@/lib/landing-pages";
import { getAllProducts, getCategories, getTargets } from "@/lib/products";
import { faqSchema } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

const faqs = [
  {
    question: "Was kostet die Nutzung des Finders?",
    answer:
      "Nichts. Der Finder ist kostenlos und ohne Anmeldung nutzbar. Finanziert wird die Seite über Provisionen der Händler, wenn du über einen unserer Links kaufst – für dich bleibt der Preis identisch.",
  },
  {
    question: "Wie kommen die Empfehlungen zustande?",
    answer:
      "Wir bewerten jedes Produkt nach drei Faktoren: redaktionelle Testnote, Eignung für deinen Anwendungsfall und Passung zu deinem Budget. Aus diesen Faktoren berechnen wir einen Match-Wert und zeigen dir die drei besten Treffer – nie mehr, damit die Entscheidung leicht bleibt.",
  },
  {
    question: "Sind die angezeigten Preise aktuell?",
    answer:
      "Die Preise sind Richtwerte aus der letzten redaktionellen Prüfung. Der tagesaktuelle Preis steht immer beim Händler – ein Klick auf den Button zeigt ihn dir sofort.",
  },
  {
    question: "Werden meine Antworten gespeichert?",
    answer:
      "Nein. Die Auswertung passiert vollständig in deinem Browser. Es gibt kein Nutzerkonto und kein Profil.",
  },
];

export default function HomePage() {
  const products = getAllProducts();
  const categories = getCategories();
  const targets = getTargets();
  const landingPages = getAllLandingPages();
  const averageRating =
    products.reduce((sum, product) => sum + product.rating, 0) /
    products.length;

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />

      {/* ---------------- Hero ---------------- */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container grid gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {products.length} Produkte redaktionell geprüft ·{" "}
              {landingPages.length} Kaufberatungen
            </Badge>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Schluss mit 40 Tabs.{" "}
              <span className="text-primary">
                Drei Fragen zum richtigen Produkt.
              </span>
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              Testberichte widersprechen sich, Bestenlisten sind von gestern und
              am Ende kaufst du doch das Falsche. Unser Finder filtert in 30
              Sekunden nach deinem Einsatzzweck und deinem Budget – und zeigt
              dir genau drei Geräte, die wirklich passen.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="#finder"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-success px-6 text-base font-semibold text-success-foreground shadow-sm transition hover:brightness-110"
              >
                Jetzt Empfehlung erhalten
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                Ø {averageRating.toFixed(1)} / 5 im Produktcheck
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Keine Anmeldung
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Kein Newsletter
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-success" />
                Unabhängige Auswahl
              </span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              So funktioniert&apos;s
            </p>
            <ol className="mt-4 space-y-4">
              {[
                {
                  title: "Produktart wählen",
                  text: "Laptop, Kopfhörer, Monitor, Tastatur, Smartwatch oder Tablet.",
                },
                {
                  title: "Einsatzzweck angeben",
                  text: "Studium, Gaming, Home-Office, Kreativarbeit, Reisen oder Einstieg.",
                },
                {
                  title: "Budget festlegen",
                  text: "Die Stufen passen sich automatisch an die reale Preisspanne an.",
                },
                {
                  title: "Top 3 vergleichen",
                  text: "Mit Match-Score, Vor- und Nachteilen und Direktlink zum Händler.",
                },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {siteConfig.affiliateDisclosure}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Finder ---------------- */}
      <section className="container py-12 lg:py-16">
        <Finder
          products={products}
          categories={categories}
          targets={targets}
          landingSlugs={landingPages.map((page) => page.slug)}
        />
      </section>

      {/* ---------------- Trust ---------------- */}
      <section className="container pb-12">
        <TrustBar />
      </section>

      {/* ---------------- Interne Verlinkung / SEO-Hub ---------------- */}
      <section className="container pb-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Direkt zur passenden Kaufberatung
            </h2>
            <p className="mt-1 text-muted-foreground">
              Ausführliche Empfehlungen für die häufigsten Kombinationen aus
              Produktart und Einsatzzweck.
            </p>
          </div>
          <Link
            href="/ratgeber"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:block"
          >
            Alle {landingPages.length} Ratgeber →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {landingPages.slice(0, 9).map((page) => (
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
                  {page.products.length} geprüfte Empfehlungen
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="container pb-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Häufige Fragen
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
    </>
  );
}
