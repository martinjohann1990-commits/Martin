#!/usr/bin/env bash
# Baut die auslieferbaren ZIP-Pakete für Etsy (und spätere Kanäle).
#
#   ./bauen.sh                    beide Produkte und das Bundle, Version 1.0.0
#   ./bauen.sh 1.1.0              dasselbe mit eigener Versionsnummer
#   ./bauen.sh belegpaket         nur das Belegpaket
#   ./bauen.sh bundle 1.2.0       nur das Bundle in Version 1.2.0
#
# Auswählbar: rechnungsgenerator | belegpaket | bundle | alles
set -euo pipefail

WAS="alles"
VERSION="1.0.0"
for ARG in "${@:-}"; do
  [ -z "${ARG}" ] && continue
  if [[ "${ARG}" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then VERSION="${ARG}"; else WAS="${ARG}"; fi
done

WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUSGABE="${WURZEL}/dist"
mkdir -p "${AUSGABE}"

# Das Offline-Versprechen wird im Build geprüft, nicht nur behauptet.
pruefe_offline(){
  local datei="$1"
  echo -n "  Prüfe ${datei##*/} auf externe Ressourcen … "
  if grep -Eqi '(src|href)=["'"'"']https?://|@import|fonts\.googleapis|cdn\.' "${datei}"; then
    echo "FEHLGESCHLAGEN"
    echo "  Die HTML-Datei enthält externe Verweise. Das Produkt muss offline laufen."
    exit 1
  fi
  echo "in Ordnung"
}

packen(){
  local name="$1"
  cd "${AUSGABE}"
  rm -f "${name}.zip"
  zip -rq "${name}.zip" "${name}"
  rm -rf "${name}"
  echo "  Fertig: dist/${name}.zip  ($(du -h "${name}.zip" | cut -f1))"
  cd "${WURZEL}"
}

# ---------------------------------------------------------------- Produkt 1
baue_rechnungsgenerator(){
  local name="rechnungsgenerator-kleinunternehmer-v${VERSION}"
  local bau="${AUSGABE}/${name}"
  echo "Baue ${name} …"
  rm -rf "${bau}"; mkdir -p "${bau}"

  cp "${WURZEL}/produkt/rechnungsgenerator.html" "${bau}/"
  cp "${WURZEL}/produkt/ANLEITUNG.md"            "${bau}/"
  cp "${WURZEL}/produkt/LIZENZ.txt"              "${bau}/"
  cp "${WURZEL}/produkt/beispiel-beleg.json"     "${bau}/"

  cat > "${bau}/START HIER.txt" <<'TEXT'
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

  pruefe_offline "${bau}/rechnungsgenerator.html"
  packen "${name}"
}

# ---------------------------------------------------------------- Produkt 2
baue_belegpaket(){
  local name="belegpaket-mahnung-lieferschein-v${VERSION}"
  local bau="${AUSGABE}/${name}"
  echo "Baue ${name} …"
  rm -rf "${bau}"; mkdir -p "${bau}"

  cp "${WURZEL}/produkt/belegpaket.html"            "${bau}/"
  cp "${WURZEL}/produkt/ANLEITUNG-BELEGPAKET.md"    "${bau}/ANLEITUNG.md"
  cp "${WURZEL}/produkt/LIZENZ-BELEGPAKET.txt"      "${bau}/LIZENZ.txt"
  cp "${WURZEL}/produkt/beispiel-mahnung.json"      "${bau}/"

  cat > "${bau}/START HIER.txt" <<'TEXT'
BELEGPAKET
Mahnung · Auftragsbestätigung · Lieferschein · Stundenzettel
============================================================

So geht es los:

  1. Doppelklick auf  belegpaket.html
     Die Datei öffnet sich im Browser. Mehr ist nicht nötig.

  2. Im Abschnitt "Absender & Stammdaten" einmalig deine Daten eintragen.

  3. Oben die Belegart wählen. Das Formular passt sich an.

  4. Auf "PDF / Drucken" klicken und im Druckdialog
     "Als PDF speichern" wählen.

Ausführliche Anleitung:  ANLEITUNG.md
Nutzungsbedingungen:     LIZENZ.txt
Beispiel zum Ausprobieren: beispiel-mahnung.json (über "Laden" öffnen)

Wichtig beim PDF-Export: "Hintergrundgrafiken" im Druckdialog aktivieren,
sonst fehlt der Rahmen um die Zahlungshinweise.

Wichtig beim Mahnen: Der voreingestellte Basiszinssatz (1,52 %) gilt ab dem
1. Juli 2026. Er ändert sich zum 1. Januar und 1. Juli jedes Jahres. Bitte
vor dem Versand prüfen - das Feld dafür steht im Werkzeug.

Deine Daten bleiben ausschließlich auf diesem Rechner. Es gibt keinen Server
und keine Datenübertragung. Sichere sie regelmäßig über "Sichern (.json)".

Dies ist eine Arbeitshilfe, keine Rechts- oder Steuerberatung.
TEXT

  pruefe_offline "${bau}/belegpaket.html"
  packen "${name}"
}

# ------------------------------------------------------------------- Bundle
baue_bundle(){
  local name="papierkramerei-bundle-v${VERSION}"
  local bau="${AUSGABE}/${name}"
  echo "Baue ${name} …"
  rm -rf "${bau}"
  mkdir -p "${bau}/Rechnungsgenerator" "${bau}/Belegpaket"

  cp "${WURZEL}/produkt/rechnungsgenerator.html" "${bau}/Rechnungsgenerator/"
  cp "${WURZEL}/produkt/ANLEITUNG.md"            "${bau}/Rechnungsgenerator/"
  cp "${WURZEL}/produkt/LIZENZ.txt"              "${bau}/Rechnungsgenerator/"
  cp "${WURZEL}/produkt/beispiel-beleg.json"     "${bau}/Rechnungsgenerator/"

  cp "${WURZEL}/produkt/belegpaket.html"         "${bau}/Belegpaket/"
  cp "${WURZEL}/produkt/ANLEITUNG-BELEGPAKET.md" "${bau}/Belegpaket/ANLEITUNG.md"
  cp "${WURZEL}/produkt/LIZENZ-BELEGPAKET.txt"   "${bau}/Belegpaket/LIZENZ.txt"
  cp "${WURZEL}/produkt/beispiel-mahnung.json"   "${bau}/Belegpaket/"

  cat > "${bau}/START HIER.txt" <<'TEXT'
PAPIERKRAMEREI - KOMPLETTPAKET
==============================

Zwei Werkzeuge, die zusammenarbeiten:

  Rechnungsgenerator/rechnungsgenerator.html
      Rechnung, Angebot und Stornorechnung

  Belegpaket/belegpaket.html
      Zahlungserinnerung, 1. und 2. Mahnung, Auftragsbestätigung,
      Lieferschein, Stundenzettel

Beide öffnen sich per Doppelklick im Browser. Keine Installation, kein Konto,
keine Internetverbindung.

DER TRICK MIT DEN DATEN
Trage deine Stammdaten einmal im Rechnungsgenerator ein und sichere sie dort
über "Sichern (.json)". Im Belegpaket auf "Rechnung übernehmen" klicken und
diese Datei wählen: Stammdaten, Kundenliste und - beim Mahnen -
Rechnungsnummer, Fälligkeit und Betrag stehen sofort da.

Aus einer Rechnung wird so in zwei Klicks eine Mahnung.

Anleitungen und Lizenzbedingungen liegen in beiden Ordnern.

Wichtig beim PDF-Export: "Hintergrundgrafiken" im Druckdialog aktivieren.

Dies sind Arbeitshilfen, keine Steuer- oder Rechtsberatung.
TEXT

  pruefe_offline "${bau}/Rechnungsgenerator/rechnungsgenerator.html"
  pruefe_offline "${bau}/Belegpaket/belegpaket.html"
  packen "${name}"
}

case "${WAS}" in
  rechnungsgenerator|rechnung) baue_rechnungsgenerator ;;
  belegpaket|beleg)            baue_belegpaket ;;
  bundle|paket)                baue_bundle ;;
  alles)                       baue_rechnungsgenerator; echo; baue_belegpaket; echo; baue_bundle ;;
  *) echo "Unbekannt: ${WAS}"; echo "Möglich: rechnungsgenerator | belegpaket | bundle | alles"; exit 1 ;;
esac

echo
echo "Inhalt der Pakete:"
for zip in "${AUSGABE}"/*.zip; do
  echo "  ${zip##*/}"
  unzip -Z1 "${zip}" | sed 's/^/      /'
done
echo
echo "Nächster Schritt: ZIP in einem frischen Browserprofil testen, dann hochladen."
