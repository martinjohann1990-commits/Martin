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
  laptops: [
    {
      title: "Akkulaufzeit vor Rechenleistung",
      text: "Ein Gerät, das den Tag ohne Netzteil übersteht, ist im Alltag mehr wert als 10 % mehr Benchmark-Punkte. Achte auf realistische Angaben von 8 Stunden aufwärts.",
    },
    {
      title: "Display: matt und hell",
      text: "300 Nits sind das Minimum, 400 Nits machen den Unterschied bei Tageslicht. Ein mattes Panel spart dir dauerhaft Kopfschmerzen durch Spiegelungen.",
    },
    {
      title: "Aufrüstbarkeit prüfen",
      text: "Verlöteter RAM bedeutet: Was du heute kaufst, hast du in fünf Jahren noch. Lieber einmal eine Stufe mehr Arbeitsspeicher nehmen.",
    },
  ],
  headphones: [
    {
      title: "Tragekomfort schlägt Datenblatt",
      text: "Anpressdruck und Gewicht entscheiden, ob du das Gerät nach zwei Stunden abnimmst. Frequenzgang-Diagramme sagen darüber nichts aus.",
    },
    {
      title: "ANC nur, wenn du es brauchst",
      text: "Aktive Geräuschunterdrückung kostet Geld und Akku. Im ruhigen Homeoffice bringt ein gut abgedichteter Kopfhörer ohne ANC oft mehr Klang fürs Budget.",
    },
    {
      title: "Mikrofonqualität testen",
      text: "Für Calls zählt das Mikrofon mehr als der Klang. Achte auf Beamforming-Mikrofone oder einen abnehmbaren Bügel-Arm.",
    },
  ],
  monitors: [
    {
      title: "Auflösung passend zur Größe",
      text: "27 Zoll verlangen QHD, ab 32 Zoll solltest du zu 4K greifen. Sonst siehst du einzelne Pixel und ermüdest beim Lesen schneller.",
    },
    {
      title: "Ergonomie nicht vergessen",
      text: "Höhenverstellung und Pivot kosten wenig Aufpreis, verhindern aber Nacken- und Rückenprobleme im Dauereinsatz.",
    },
    {
      title: "Ein Kabel für alles",
      text: "USB-C mit Power Delivery lädt das Notebook und überträgt gleichzeitig Bild, Ton und Peripherie. Das räumt den Schreibtisch spürbar auf.",
    },
  ],
  keyboards: [
    {
      title: "Switch-Typ ist Geschmackssache",
      text: "Lineare Switches sind leise und schnell, taktile geben Feedback beim Schreiben. Hot-Swap-Boards erlauben den Wechsel ohne Löten.",
    },
    {
      title: "Layout bewusst wählen",
      text: "Ohne Nummernblock (TKL oder 75 %) liegt die Maus näher an der Tastatur – besser für Schulter und Handgelenk.",
    },
    {
      title: "Verbindung nach Einsatz",
      text: "Kabel für minimale Latenz beim Gaming, Bluetooth mit Mehrgeräte-Umschaltung fürs mobile Arbeiten.",
    },
  ],
  smartwatches: [
    {
      title: "Akkulaufzeit realistisch einschätzen",
      text: "Herstellerangaben gelten ohne Always-on-Display und ohne Dauer-GPS. Rechne im Alltag mit etwa der Hälfte.",
    },
    {
      title: "Kompatibilität prüfen",
      text: "Nicht jede Uhr funktioniert mit jedem Smartphone-Betriebssystem – vor dem Kauf gegenprüfen, sonst fehlen halbe Funktionen.",
    },
    {
      title: "Keine Abo-Fallen",
      text: "Manche Hersteller sperren Auswertungen hinter ein Monatsabo. Achte darauf, dass die Kernfunktionen ohne Zusatzkosten nutzbar sind.",
    },
  ],
  tablets: [
    {
      title: "Displayqualität ist alles",
      text: "Das Tablet ist im Wesentlichen ein Bildschirm. Bei 120 Hz wirkt jede Bewegung flüssiger, laminierte Displays wirken beim Schreiben direkter.",
    },
    {
      title: "Zubehör einkalkulieren",
      text: "Stift und Tastatur kosten oft 150 bis 350 Euro extra. Rechne sie von Anfang an in dein Budget ein.",
    },
    {
      title: "Speicher nicht knapp kalkulieren",
      text: "Ohne microSD-Slot lässt sich Speicher später nicht erweitern. Für Notizen reichen 128 GB, für Videoschnitt eher 256 GB aufwärts.",
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
      answer: `Unsere Top-Empfehlung ist aktuell ${top.name} für rund ${formatPrice(top.price)}. ${top.summary} Bewertet mit ${top.rating.toFixed(1)} von 5 Punkten.`,
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
