#!/usr/bin/env node
/**
 * Livegang-Prüfung.
 *
 *   npm run check:launch
 *
 * Prüft mechanisch alles, was vor dem Livegang stimmen muss: keine
 * Platzhalter-Daten, vollständige Betreiberangaben, saubere Produktdaten und
 * ausreichend gefüllte Landingpages.
 *
 * Exit-Code 1, sobald ein Fehler gefunden wurde – damit lässt sich die Prüfung
 * auch in eine CI-Pipeline hängen.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));

const products = read("data/products.json");
const taxonomy = read("data/taxonomy.json");
const owner = read("data/owner.json");
const siteSource = readFileSync(join(root, "lib/site.ts"), "utf8");

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

/* ---------------------------------------------------------------- Betreiber */
const REQUIRED_OWNER_FIELDS = ["name", "street", "zip", "city", "email"];
for (const field of REQUIRED_OWNER_FIELDS) {
  const value = owner[field];
  if (typeof value !== "string" || value.trim() === "" || value.includes("[")) {
    fail(`data/owner.json: Feld "${field}" ist nicht ausgefüllt (Impressumspflicht).`);
  }
}
if (typeof owner.email === "string" && !owner.email.includes("[") && !owner.email.includes("@")) {
  fail('data/owner.json: "email" ist keine gültige E-Mail-Adresse.');
}

/* ----------------------------------------------------------------- Produkte */
const categorySlugs = new Set(taxonomy.categories.map((c) => c.slug));
const targetSlugs = new Set(taxonomy.targets.map((t) => t.slug));
const seenIds = new Map();
const seenSlugs = new Map();

const checkUrl = (url, label) => {
  if (typeof url !== "string" || url.trim() === "") {
    fail(`${label}: URL fehlt.`);
    return;
  }
  if (url.includes("PLACEHOLD")) {
    fail(`${label}: enthält noch eine Platzhalter-URL (${url}).`);
    return;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      warn(`${label}: URL ist nicht https (${url}).`);
    }
    if (parsed.hostname.includes("amazon.") && !/\/dp\/[A-Z0-9]{10}/i.test(parsed.pathname)) {
      warn(`${label}: Amazon-Link sollte auf /dp/<ASIN> gekürzt sein (${url}).`);
    }
  } catch {
    fail(`${label}: URL ist ungültig (${url}).`);
  }
};

for (const product of products) {
  const label = `Produkt ${product.id ?? "?"} (${product.name ?? "ohne Namen"})`;

  if (seenIds.has(product.id)) fail(`${label}: doppelte id – bereits vergeben.`);
  seenIds.set(product.id, true);
  if (seenSlugs.has(product.slug)) fail(`${label}: doppelter slug "${product.slug}".`);
  seenSlugs.set(product.slug, true);

  if (!categorySlugs.has(product.category)) {
    fail(`${label}: Kategorie "${product.category}" steht nicht in data/taxonomy.json.`);
  }
  for (const tag of product.bestForTags ?? []) {
    if (!targetSlugs.has(tag)) {
      fail(`${label}: Zielgruppe "${tag}" steht nicht in data/taxonomy.json.`);
    }
  }
  if (!product.bestForTags?.length) {
    fail(`${label}: keine bestForTags – das Produkt taucht auf keiner Landingpage auf.`);
  }

  if (!(product.price > 0)) fail(`${label}: Preis fehlt oder ist 0.`);
  if (!(product.rating >= 0 && product.rating <= 5)) {
    fail(`${label}: rating muss zwischen 0 und 5 liegen.`);
  }
  if (!(product.reviewCount >= 0)) warn(`${label}: reviewCount fehlt.`);
  if (!product.summary?.trim()) fail(`${label}: summary fehlt.`);
  if ((product.pros?.length ?? 0) < 2) fail(`${label}: mindestens 2 Vorteile angeben.`);
  if ((product.cons?.length ?? 0) < 1) {
    fail(`${label}: kein Nachteil angegeben – Nachteile sind der Trust-Faktor der Seite.`);
  }

  checkUrl(product.affiliateUrl, `${label} → affiliateUrl`);
  for (const offer of product.offers ?? []) {
    checkUrl(offer.url, `${label} → Angebot ${offer.merchant}`);
    if (!(offer.price > 0)) fail(`${label} → Angebot ${offer.merchant}: Preis fehlt.`);
    if (offer.commissionRate === undefined) {
      warn(`${label} → Angebot ${offer.merchant}: kein commissionRate gesetzt, Standardwert wird verwendet.`);
    }
  }
}

/* ------------------------------------------------------------ Landingpages */
let pageCount = 0;
for (const category of taxonomy.categories) {
  for (const target of taxonomy.targets) {
    const matching = products.filter(
      (p) => p.category === category.slug && p.bestForTags?.includes(target.slug)
    );
    if (matching.length < 2) continue;
    pageCount += 1;
    if (matching.length < 4) {
      warn(
        `Landingpage /best-${category.slug}-for-${target.slug}: nur ${matching.length} Produkte – ` +
          `für ein Ranking sollten es mindestens 4 sein.`
      );
    }
  }
}
if (pageCount === 0) fail("Es entsteht keine einzige Landingpage – bestForTags prüfen.");

/* -------------------------------------------------------------- Umgebung */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!siteUrl || siteUrl.includes("deine-domain")) {
  warn("NEXT_PUBLIC_SITE_URL ist nicht auf die echte Domain gesetzt (in Vercel setzen, danach Redeploy).");
}
if (!process.env.NEXT_PUBLIC_AMAZON_TAG) {
  warn("NEXT_PUBLIC_AMAZON_TAG ist nicht gesetzt – Amazon-Links tragen dann keine Partner-ID.");
}

/* ------------------------------------------------------------ Redaktion */
const reviewedMatch = siteSource.match(/lastReviewedAt = "([\d-]+)"/);
if (reviewedMatch) {
  const days = Math.floor((Date.now() - new Date(reviewedMatch[1]).getTime()) / 86400000);
  if (days > 90) {
    warn(`lib/site.ts: letzte redaktionelle Prüfung war vor ${days} Tagen – Datum aktualisieren.`);
  }
} else {
  warn("lib/site.ts: lastReviewedAt konnte nicht gelesen werden.");
}

try {
  const about = readFileSync(join(root, "app/ueber-uns/page.tsx"), "utf8");
  if (about.includes("Ergänze hier zwei bis drei Sätze")) {
    warn("app/ueber-uns/page.tsx: Der Absatz zum eigenen Hintergrund ist noch der Platzhaltertext.");
  }
} catch {
  warn("app/ueber-uns/page.tsx fehlt – die Seite ist ein wichtiges Vertrauenssignal.");
}

/* --------------------------------------------------------------- Ausgabe */
const bold = (text) => `[1m${text}[0m`;
const red = (text) => `[31m${text}[0m`;
const yellow = (text) => `[33m${text}[0m`;
const green = (text) => `[32m${text}[0m`;

console.log(bold("\nLivegang-Prüfung\n"));
console.log(`  Produkte:      ${products.length}`);
console.log(`  Kategorien:    ${taxonomy.categories.length}`);
console.log(`  Landingpages:  ${pageCount}\n`);

if (errors.length) {
  console.log(bold(red(`${errors.length} Fehler – so darf die Seite nicht live gehen:`)));
  errors.forEach((message) => console.log(red("  ✗ ") + message));
  console.log("");
}
if (warnings.length) {
  console.log(bold(yellow(`${warnings.length} Hinweise:`)));
  warnings.forEach((message) => console.log(yellow("  ! ") + message));
  console.log("");
}
if (!errors.length && !warnings.length) {
  console.log(green(bold("Alles in Ordnung. Die Seite kann live gehen.\n")));
} else if (!errors.length) {
  console.log(green(bold("Keine Fehler. Die Hinweise oben solltest du vor dem Livegang abarbeiten.\n")));
}

process.exit(errors.length ? 1 : 0);
