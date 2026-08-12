# Mental & Routinen

Persönliche Web-App (Single User, lokal, ohne Cloud) für mentales Training,
Zielarbeit und positive Routinen — mit Gamification über XP, Level und einem
Konsistenz-Score.

Aktueller Stand: **Phase 1 (MVP)** — Routinen anlegen, Tagesansicht mit
Ein-Tap-Abhaken, XP/Level/Streak, lokale Speicherung, JSON-Export/Import.
Ziele, Mental-Sessions, Audioaufnahme/TTS, Dashboard-Charts und die
installierbare PWA folgen in den Phasen 2–4.

## Setup

```bash
npm install
npm run dev       # Entwicklungsserver
npm run build     # Produktions-Build (tsc -b && vite build)
npm test          # Vitest im Watch-Modus
npm test -- run   # Vitest einmalig (CI)
npm run lint       # oxlint
```

## Stack

- React + Vite + TypeScript + Tailwind CSS (v4, CSS-first)
- State über React-Hooks/Context, kein Redux
- Persistenz: IndexedDB via [Dexie](https://dexie.org/) (`src/lib/db.ts`)
- Tests: [Vitest](https://vitest.dev/) für die gesamte Scoring-Logik
- Deployment: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`)

> **Hinweis Pages-Deployment:** Der Workflow baut und deployed automatisch bei
> jedem Push auf den Branch `claude/mental-routines-gamification-hx3t2t`.
> Damit GitHub die Seite tatsächlich veröffentlicht, muss einmalig unter
> *Settings → Pages → Build and deployment → Source* auf **GitHub Actions**
> umgestellt werden — das kann nur ein Repo-Admin über die GitHub-Oberfläche
> machen, nicht per Code.

## Datenmodell

Alle Tabellen leben in IndexedDB (Dexie-Datenbank `martin-app`,
`src/lib/db.ts`). Aktuell (Phase 1) umgesetzt:

| Tabelle              | Beschreibung                                                        |
| --------------------- | -------------------------------------------------------------------- |
| `routines`             | Titel, Kategorie, Frequenz, Tageszeitfenster, Schwierigkeit           |
| `routineCompletions`   | Erledigung einer Routine an einem App-Tag (`routineId` + `dateKey`)  |
| `xpEvents`             | Jede einzelne XP-Vergabe mit Quelle, Betrag, Zeitstempel, App-Tag     |

Ziele/Meilensteine, Mental-Sessions, Session-Logs und Wochenreviews folgen
in Phase 2/3 mit demselben Muster.

**Wichtig:** Es gibt keine gespeicherte Gesamt-XP- oder Level-Zahl. Level,
Gesamt-XP, Streak und Konsistenz-Score werden bei jedem Laden **vollständig
aus den `xpEvents` und `routineCompletions` abgeleitet** (`src/lib/scoring.ts`
→ `computeFullState`). Der Punktestand ist dadurch jederzeit nachvollziehbar
und reparierbar — im Zweifel einfach aus den Rohdaten neu berechnet.

### App-Tag und Tageswechsel

Alle "Tage" in der App sind App-Tage (`YYYY-MM-DD`), berechnet in der
Zeitzone Europe/Berlin mit Tageswechsel um 04:00 Uhr morgens
(`src/lib/date.ts` → `getAppDateKey`). Eine Session um 01:00 Uhr zählt also
noch zum Vortag.

## Scoring-Formel (`src/lib/scoring.ts`)

Alle Formeln sind als reine, ungetestete-UI-unabhängige Funktionen
implementiert und über `src/lib/scoring.test.ts` mit Vitest abgedeckt.

**XP-Vergabe**

- Routine erledigt: `10 × Schwierigkeitsfaktor` (leicht `1,0` / mittel `1,5`
  / hart `2,0`) → 10 / 15 / 20 XP
- Mental-Session (ab Phase 3): `15 + 1 XP je Minute`, gedeckelt bei 40 XP
- Meilenstein erreicht (ab Phase 2): 100 XP
- Wochenreview ausgefüllt (ab Phase 2): 50 XP
- **Tagesdeckel:** die rohe Summe aller XP-Events eines Tages wird bei
  150 XP gekappt, **bevor** der Streak-Bonus angewendet wird

**Streak & Freeze**

- Streak = Anzahl aufeinanderfolgender App-Tage mit mindestens einer
  erledigten, für diesen Tag geplanten Routine
- 2 Freeze-Tage pro Kalendermonat neutralisieren automatisch einen sonst
  drohenden Streak-Abbruch (nur wenn dadurch tatsächlich ein aktiver Streak
  geschützt wird) und werden protokolliert
- Ein gerissener Streak setzt Gesamt-XP und Level nie zurück — nur den
  Streak-Zähler

**Streak-Bonus auf die Tages-XP**

- `+5 % je Streak-Tag`, gedeckelt bei `+50 %`
- Wird auf die **gedeckelte** Tages-XP angewendet: `finalXp = round(cappedXp
  × (1 + bonusRate))` — dadurch kann der Bonus die Tages-XP über 150 heben,
  ohne dass mehr Aktionen an einem Tag mehr "Grinding-Ertrag" bringen als
  der Deckel erlaubt

**Level**

- Kumulativ benötigte Gesamt-XP, um von Level `n` auf `n+1` zu steigen:
  `⌈100 × n^1,5⌉`
- Level sind rein additiv und sinken nie

**Konsistenz-Score (0–100, wichtiger als XP)**

- `erledigte gewichtete Aktionen / geplante gewichtete Aktionen × 100`,
  über die letzten 7 App-Tage
- Gewicht je Routine = Schwierigkeitsfaktor (leicht/mittel/hart)
- Ohne geplante Aktionen an einem Tag gibt es nichts, wogegen man
  inkonsistent sein könnte → Score 100
- Wird im Dashboard neben dem Level angezeigt, inklusive Trendpfeil
  gegenüber dem 7-Tage-Zeitraum davor

Bewusst **nicht** umgesetzt: Minuspunkte, Strafmechaniken, aggressive
Push-Erinnerungen oder "Ziel verfehlt"-Formulierungen.

## Datenhoheit

Unter *Einstellungen* lassen sich alle Daten vollständig als JSON
exportieren und wieder importieren (Import ersetzt den gesamten lokalen
Datenbestand). Es gibt kein Backend, kein Login und keine externen
API-Calls — alles bleibt auf dem Gerät.
