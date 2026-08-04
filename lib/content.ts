import { formatPrice } from "@/lib/utils";
import type { LandingPage } from "@/lib/types";

/**
 * Redaktionelle Textbausteine für die programmatisch erzeugten Landingpages.
 * Kombination aus Kategorie-Wissen (Kaufkriterien) und Zielgruppen-Kontext
 * ergibt pro Seite einzigartigen Text – Pflicht, damit Google die Seiten
 * nicht als "thin content" abstuft.
 */

interface Criterion {
  title: string;
  text: string;
}

const criteriaByCategory: Record<string, Criterion[]> = {
  monitors: [
    {
      title: "Auflösung passend zur Größe",
      text: "27 Zoll verlangen QHD (2560 × 1440), ab 32 Zoll solltest du zu 4K greifen. Bleibst du bei Full HD, siehst du auf beiden Größen einzelne Pixel und ermüdest beim Lesen schneller.",
    },
    {
      title: "Panel nach Einsatzzweck",
      text: "IPS ist der sichere Allrounder mit stabilen Blickwinkeln. VA bringt mehr Kontrast, neigt aber in dunklen Szenen zu Schlieren. OLED liefert perfektes Schwarz und die kürzesten Reaktionszeiten – zum Preis von Aufmerksamkeit beim Thema Einbrennen.",
    },
    {
      title: "Ein Kabel für alles",
      text: "USB-C oder Thunderbolt mit Power Delivery überträgt Bild, Ton und Peripherie und lädt gleichzeitig das Notebook. Am Schreibtisch ersetzt das die Dockingstation und spart drei Kabel – der Aufpreis rechnet sich fast immer.",
    },
    {
      title: "Ergonomie nicht unterschätzen",
      text: "Höhenverstellung und Neigung kosten wenig Aufpreis, entscheiden aber darüber, ob du nach acht Stunden Nackenschmerzen hast. Ein Monitor ohne Höhenverstellung braucht zwingend einen Monitorarm – rechne die 40 bis 80 Euro gleich mit ein.",
    },
  ],
};

export function getBuyingCriteria(categorySlug: string): Criterion[] {
  return criteriaByCategory[categorySlug] ?? [];
}

/** Einleitungstext der Landingpage – kombiniert Kategorie, Zielgruppe und Preisspanne. */
export function getLandingIntro(page: LandingPage): string {
  const prices = page.products.map((product) => product.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return (
    `Wir haben ${page.category.label} nach genau den Kriterien sortiert, ` +
    `auf die es für ${page.target.label} ankommt: ${page.target.description} ` +
    `In dieser Auswahl findest du ${page.products.length} Geräte zwischen ` +
    `${formatPrice(min)} und ${formatPrice(max)} – jeweils mit Stärken, ` +
    `Schwächen und dem passenden Einsatzbereich.`
  );
}

/** Seiten-spezifische FAQs für das FAQPage-Markup. */
export function getLandingFaqs(
  page: LandingPage
): { question: string; answer: string }[] {
  const top = page.products[0];
  const cheapest = [...page.products].sort((a, b) => a.price - b.price)[0];

  return [
    {
      question: `Welche ${page.category.label} eignen sich am besten für ${page.target.label}?`,
      answer: `Unsere Top-Empfehlung ist aktuell ${top.name} für rund ${formatPrice(top.price)}. ${top.summary} In unserer redaktionellen Bewertung kommt er auf ${top.rating.toFixed(1)} von 5 Punkten.`,
    },
    {
      question: `Wie viel sollte ich für ${page.category.label} einplanen?`,
      answer: `Ein solider Einstieg gelingt ab ${formatPrice(cheapest.price)} (${cheapest.name}). Nach oben ist die Spanne offen – mehr Budget zahlt vor allem auf Verarbeitung, Displayqualität und Langlebigkeit ein.`,
    },
    {
      question: "Wie oft wird diese Empfehlung aktualisiert?",
      answer:
        "Wir prüfen die Auswahl regelmäßig und tauschen Produkte aus, sobald ein Nachfolger erscheint oder ein Gerät dauerhaft nicht mehr lieferbar ist. Das Datum der letzten Prüfung steht im Fußbereich.",
    },
  ];
}
