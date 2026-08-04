import type { Metadata } from "next";
import { OwnerWarning } from "@/components/owner-warning";
import { getAddressLines, owner } from "@/lib/owner";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  description: `Impressum und Anbieterkennzeichnung von ${siteConfig.name}.`,
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <OwnerWarning />

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Impressum
      </h1>

      <div className="mt-8 space-y-8 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Angaben gemäß § 5 DDG</h2>
          <address className="not-italic text-muted-foreground">
            {getAddressLines().map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Kontakt</h2>
          <p className="text-muted-foreground">
            E-Mail: {owner.email}
            {owner.phone && (
              <>
                <br />
                Telefon: {owner.phone}
              </>
            )}
          </p>
        </section>

        {owner.vatId && (
          <section className="space-y-2">
            <h2 className="text-xl font-bold">Umsatzsteuer-Identifikationsnummer</h2>
            <p className="text-muted-foreground">
              Gemäß § 27 a Umsatzsteuergesetz: {owner.vatId}
            </p>
          </section>
        )}

        {owner.kleinunternehmer && !owner.vatId && (
          <section className="space-y-2">
            <h2 className="text-xl font-bold">Umsatzsteuer</h2>
            <p className="text-muted-foreground">
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und daher auch
              nicht ausgewiesen (Kleinunternehmerregelung).
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-xl font-bold">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <address className="not-italic text-muted-foreground">
            {getAddressLines().map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Hinweis auf Werbe-Links</h2>
          <p className="text-muted-foreground">{siteConfig.affiliateDisclosure}</p>
          <p className="text-muted-foreground">
            Als Teilnehmer an Partnerprogrammen verdienen wir an qualifizierten
            Verkäufen. Die redaktionelle Auswahl der Produkte erfolgt unabhängig
            von der Höhe der Provision.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Haftung für Inhalte</h2>
          <p className="text-muted-foreground">
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung
            oder Sperrung der Nutzung von Informationen nach den allgemeinen
            Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
            jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden entsprechender
            Rechtsverletzungen entfernen wir diese Inhalte umgehend.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Haftung für Links</h2>
          <p className="text-muted-foreground">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
            der Seiten verantwortlich. Die verlinkten Seiten wurden zum
            Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft;
            rechtswidrige Inhalte waren nicht erkennbar. Eine permanente
            inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete
            Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
            Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links
            umgehend.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Preisangaben</h2>
          <p className="text-muted-foreground">
            Alle auf dieser Website genannten Preise sind Richtwerte zum
            Zeitpunkt der letzten redaktionellen Prüfung und können sich
            jederzeit ändern. Maßgeblich ist ausschließlich der Preis, der im
            Shop des jeweiligen Händlers zum Zeitpunkt des Kaufs angezeigt wird.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Urheberrecht</h2>
          <p className="text-muted-foreground">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht. Die
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Verbraucherstreitbeilegung</h2>
          <p className="text-muted-foreground">
            Wir sind nicht bereit und nicht verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
}
