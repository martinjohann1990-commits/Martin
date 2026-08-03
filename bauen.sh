#!/usr/bin/env bash
# Baut das auslieferbare ZIP-Paket für Gumroad / Lemon Squeezy / Etsy.
set -euo pipefail

VERSION="${1:-1.0.0}"
NAME="rechnungsgenerator-kleinunternehmer-v${VERSION}"
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUSGABE="${WURZEL}/dist"
BAU="${AUSGABE}/${NAME}"

echo "Baue ${NAME} …"

rm -rf "${BAU}"
mkdir -p "${BAU}"

cp "${WURZEL}/produkt/rechnungsgenerator.html" "${BAU}/"
cp "${WURZEL}/produkt/ANLEITUNG.md"            "${BAU}/"
cp "${WURZEL}/produkt/LIZENZ.txt"              "${BAU}/"
cp "${WURZEL}/produkt/beispiel-beleg.json"     "${BAU}/"

# Kurzanleitung, die im entpackten Ordner sofort ins Auge fällt
cat > "${BAU}/START HIER.txt" <<'TEXT'
RECHNUNGSGENERATOR FÜR KLEINUNTERNEHMER
=======================================

So geht es los:

  1. Doppelklick auf  rechnungsgenerator.html
     Die Datei öffnet sich im Browser. Mehr ist nicht nötig.

  2. Im Abschnitt "Absender & Stammdaten" einmalig deine Daten eintragen.

  3. Rechnung schreiben und auf "PDF / Drucken" klicken.
     Im Druckdialog "Als PDF speichern" wählen.

Ausführliche Anleitung:  ANLEITUNG.md
Nutzungsbedingungen:     LIZENZ.txt

Wichtig beim PDF-Export: "Hintergrundgrafiken" im Druckdialog aktivieren,
sonst fehlt der Rahmen um die Zahlungshinweise.

Deine Daten bleiben ausschließlich auf diesem Rechner. Es gibt keinen Server
und keine Datenübertragung. Sichere sie regelmäßig über "Sichern (.json)".

Dies ist eine Arbeitshilfe, keine Steuerberatung.
TEXT

# Prüfen, dass die HTML-Datei wirklich keine externen Ressourcen lädt
echo -n "Prüfe auf externe Ressourcen … "
if grep -Eqi '(src|href)=["'"'"']https?://|@import|fonts\.googleapis|cdn\.' "${BAU}/rechnungsgenerator.html"; then
  echo "FEHLGESCHLAGEN"
  echo "Die HTML-Datei enthält externe Verweise. Das Produkt muss offline laufen."
  exit 1
fi
echo "in Ordnung"

cd "${AUSGABE}"
rm -f "${NAME}.zip"
zip -rq "${NAME}.zip" "${NAME}"

GROESSE=$(du -h "${NAME}.zip" | cut -f1)
echo
echo "Fertig:  dist/${NAME}.zip  (${GROESSE})"
echo
echo "Inhalt:"
unzip -l "${NAME}.zip" | tail -n +4 | head -n -2 | awk '{$1=$2=$3=""; print "  " $0}' | sed 's/^  *//;s/^/  /'
echo
echo "Nächster Schritt: ZIP in einem frischen Browserprofil testen, dann hochladen."
