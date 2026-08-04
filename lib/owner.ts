import ownerJson from "@/data/owner.json";

/**
 * Betreiberdaten aus data/owner.json.
 *
 * Impressum, Datenschutzerklärung und die Über-uns-Seite lesen ausschließlich
 * von hier – die persönlichen Angaben stehen also an genau einer Stelle.
 */
export interface Owner {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  vatId: string;
  companyForm: string;
  kleinunternehmer: boolean;
  hosting: {
    provider: string;
    address: string;
    privacyUrl: string;
  };
}

export const owner = ownerJson as unknown as Owner;

/** Felder, ohne die kein rechtssicheres Impressum möglich ist. */
const REQUIRED_FIELDS = [
  "name",
  "street",
  "zip",
  "city",
  "email",
] as const satisfies readonly (keyof Owner)[];

function isPlaceholder(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || value.includes("[");
}

/** Namen aller Felder, die noch den Platzhalter enthalten. */
export function getMissingOwnerFields(): string[] {
  return REQUIRED_FIELDS.filter((field) => isPlaceholder(owner[field]));
}

/** True, sobald alle Pflichtangaben ausgefüllt sind. */
export function isOwnerConfigured(): boolean {
  return getMissingOwnerFields().length === 0;
}

/** Anschrift als Zeilen – für die Ausgabe im Impressum. */
export function getAddressLines(): string[] {
  return [
    owner.companyForm ? `${owner.name} ${owner.companyForm}` : owner.name,
    owner.street,
    `${owner.zip} ${owner.city}`,
    owner.country,
  ].filter(Boolean);
}
