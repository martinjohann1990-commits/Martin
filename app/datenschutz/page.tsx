import type { Metadata } from "next";
import { OwnerWarning } from "@/components/owner-warning";
import { getAddressLines, owner } from "@/lib/owner";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: `Informationen zur Verarbeitung personenbezogener Daten auf ${siteConfig.name} nach Art. 13 DSGVO.`,
  alternates: { canonical: "/datenschutz" },
};

export default function DatenschutzPage() {
  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <OwnerWarning />

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Datenschutzerklärung
      </h1>
      <p className="mt-3 text-muted-foreground">
        Diese Website verarbeitet so wenig personenbezogene Daten wie technisch
        möglich. Es gibt kein Nutzerkonto, kein Kontaktformular, keinen
        Newsletter und keine Werbe-Cookies.
      </p>

      <div className="mt-8 space-y-8 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Verantwortlicher</h2>
          <p className="text-muted-foreground">
            Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne
            der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <address className="not-italic text-muted-foreground">
            {getAddressLines().map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block">E-Mail: {owner.email}</span>
          </address>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. Hosting und Server-Logfiles</h2>
          <p className="text-muted-foreground">
            Diese Website wird bei {owner.hosting.provider},{" "}
            {owner.hosting.address}, gehostet. Beim Aufruf der Website werden
            automatisch Informationen an den Server übertragen und
            vorübergehend in sogenannten Logfiles gespeichert: aufgerufene
            Seite, Datum und Uhrzeit, übertragene Datenmenge, Meldung über
            erfolgreichen Abruf, Browsertyp und -version, Betriebssystem,
            Referrer-URL und die IP-Adresse in gekürzter Form.
          </p>
          <p className="text-muted-foreground">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte
            Interesse liegt im technisch fehlerfreien Betrieb und in der
            Sicherheit der Website. Die Daten werden nicht mit anderen
            Datenquellen zusammengeführt.
          </p>
          <p className="text-muted-foreground">
            Da der Anbieter seinen Sitz in den USA hat, kann eine Übermittlung
            von Daten in ein Drittland stattfinden. Die Datenschutzhinweise des
            Anbieters findest du unter{" "}
            <a
              href={owner.hosting.privacyUrl}
              className="font-medium text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {owner.hosting.privacyUrl}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. Reichweitenmessung</h2>
          <p className="text-muted-foreground">
            Zur Reichweitenmessung setzen wir Vercel Analytics ein. Der Dienst
            arbeitet ohne Cookies und ohne Speicherung von Informationen auf
            deinem Endgerät. Es wird kein geräteübergreifendes Nutzerprofil
            gebildet und keine IP-Adresse dauerhaft gespeichert. Erfasst werden
            aggregierte Angaben wie aufgerufene Seiten, Herkunftsland,
            Gerätetyp und die Interaktion mit dem Produktfinder.
          </p>
          <p className="text-muted-foreground">
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte
            Interesse besteht in der statistischen Auswertung zur Verbesserung
            des Angebots. Da keine Informationen auf deinem Endgerät gespeichert
            oder ausgelesen werden, ist keine Einwilligung nach § 25 TDDDG
            erforderlich.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Werbe- und Affiliate-Links</h2>
          <p className="text-muted-foreground">{siteConfig.affiliateDisclosure}</p>
          <p className="text-muted-foreground">
            Klickst du auf einen solchen Link, wirst du auf die Website des
            jeweiligen Händlers weitergeleitet. An den Link werden dabei eine
            Partnerkennung sowie eine anonyme Kennung der Unterseite angehängt,
            über die der Klick erfolgt ist. Diese Kennungen enthalten keine
            personenbezogenen Daten und lassen keinen Rückschluss auf dich zu.
          </p>
          <p className="text-muted-foreground">
            Erst auf der Website des Händlers werden in der Regel Cookies
            gesetzt, damit ein Kauf dem Partnerprogramm zugeordnet werden kann.
            Für diese Verarbeitung ist der jeweilige Händler bzw. das
            Partnernetzwerk verantwortlich. Bitte beachte dort die
            Datenschutzhinweise des Anbieters. Wir erhalten von den Netzwerken
            ausschließlich aggregierte Abrechnungsdaten ohne Personenbezug.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">5. Der Produktfinder</h2>
          <p className="text-muted-foreground">
            Die Antworten, die du im Produktfinder gibst, werden ausschließlich
            in deinem Browser verarbeitet und nicht an unseren Server
            übertragen. Sie werden weder gespeichert noch mit deiner Person
            verknüpft und sind nach dem Schließen der Seite verloren.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">6. Verschlüsselung</h2>
          <p className="text-muted-foreground">
            Diese Website nutzt aus Sicherheitsgründen durchgehend eine
            SSL-/TLS-Verschlüsselung. Du erkennst sie an dem „https://" in der
            Adresszeile deines Browsers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">7. Deine Rechte</h2>
          <p className="text-muted-foreground">Du hast jederzeit das Recht auf:</p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Auskunft über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>
              Widerspruch gegen die Verarbeitung auf Grundlage berechtigter
              Interessen (Art. 21 DSGVO)
            </li>
          </ul>
          <p className="text-muted-foreground">
            Wende dich dafür formlos an {owner.email}. Außerdem steht dir ein
            Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, in der
            Regel bei der Behörde deines gewöhnlichen Aufenthaltsortes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">8. Änderungen</h2>
          <p className="text-muted-foreground">
            Wir passen diese Datenschutzerklärung an, sobald sich die
            Datenverarbeitung auf dieser Website ändert – etwa durch neue
            Funktionen oder Dienste. Es gilt jeweils die hier abrufbare
            Fassung.
          </p>
        </section>
      </div>
    </div>
  );
}
