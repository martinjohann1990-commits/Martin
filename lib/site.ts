/**
 * Zentrale Site-Konfiguration.
 * Nur hier anfassen, wenn Name, Domain oder Claim geändert werden sollen.
 */
export const siteConfig = {
  name: "DealFinder AI",
  shortName: "DealFinder",
  claim: "Finde in 30 Sekunden den richtigen Monitor",
  description:
    "Beantworte 3 kurze Fragen und erhalte sofort die 3 besten Monitore für dein Budget und deinen Anwendungsfall – ohne Anmeldung, ohne Newsletter, ohne Zeitverlust.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://deine-domain.de").replace(
    /\/$/,
    ""
  ),
  locale: "de_DE",
  /** Pflichtangabe nach § 5a Abs. 4 UWG – wird im Footer und auf jeder Seite ausgegeben. */
  affiliateDisclosure:
    "Diese Seite enthält Werbe- bzw. Affiliate-Links. Kaufst du über einen dieser Links, erhalten wir eine Provision vom Händler. Für dich ändert sich der Preis dadurch nicht.",
} as const;

/**
 * Datum der letzten redaktionellen Prüfung inklusive Preisrecherche.
 * Bei jeder Aktualisierung von data/products.json mitziehen –
 * `npm run check:launch` warnt, sobald das Datum älter als 90 Tage ist.
 */
export const lastReviewedAt = "2026-08-04";
