const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ---- Config: single source of truth for the counter ----
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const startDate = new Date(config.startDate + "T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);
const msPerDay = 24 * 60 * 60 * 1000;
const dayCount = Math.round((today - startDate) / msPerDay);

const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33" x 7.5" - best fit for widescreen kiosk monitors

// ---- Palette: industrial safety green on charcoal ----
const BG = "1B2420";      // near-black forest charcoal
const GREEN = "3DDC84";   // safety green accent
const GREEN_DARK = "1F7A4D";
const WHITE = "F5F7F5";
const MUTED = "8FA398";

const slide = pres.addSlide();
slide.background = { color: BG };

// Shield-with-check icon (drawn natively so it stays crisp at any monitor size)
const iconCx = 6.665; // center x of slide (13.33/2)
const iconTop = 0.5;
const iconSize = 0.9;
slide.addShape(pres.ShapeType.roundRect, {
  x: iconCx - iconSize / 2,
  y: iconTop,
  w: iconSize,
  h: iconSize,
  rectRadius: 0.22,
  fill: { color: GREEN_DARK },
  line: { type: "none" },
});
slide.addText("✓", {
  x: iconCx - iconSize / 2,
  y: iconTop,
  w: iconSize,
  h: iconSize,
  align: "center",
  valign: "middle",
  fontFace: "Arial",
  fontSize: 46,
  bold: true,
  color: GREEN,
  isTextBox: true,
  margin: 0,
});

// Eyebrow label
slide.addText("SICHERHEIT DC LOSHEIM", {
  x: 0,
  y: 1.65,
  w: 13.33,
  h: 0.45,
  align: "center",
  fontFace: "Calibri",
  fontSize: 20,
  bold: true,
  color: MUTED,
  charSpacing: 4,
  isTextBox: true,
  margin: 0,
});

// The big counter
slide.addText(String(dayCount), {
  x: 0,
  y: 2.2,
  w: 13.33,
  h: 3.1,
  align: "center",
  valign: "middle",
  fontFace: "Arial",
  fontSize: 250,
  bold: true,
  color: GREEN,
  isTextBox: true,
  margin: 0,
});

// Label under the number
slide.addText("UNFALLFREIE TAGE", {
  x: 0,
  y: 5.5,
  w: 13.33,
  h: 0.75,
  align: "center",
  fontFace: "Calibri",
  fontSize: 40,
  bold: true,
  color: WHITE,
  charSpacing: 2,
  isTextBox: true,
  margin: 0,
});

// Footer: last incident date + generated date, small and muted
slide.addText(
  `Letzter Unfall: ${dateFormatter.format(startDate)}      |      Stand: ${dateFormatter.format(today)}`,
  {
    x: 0,
    y: 6.85,
    w: 13.33,
    h: 0.4,
    align: "center",
    fontFace: "Calibri",
    fontSize: 14,
    color: MUTED,
    isTextBox: true,
    margin: 0,
  }
);

const outFile = path.join(__dirname, "Unfallfreie_Tage_DC_Losheim.pptx");
pres.writeFile({ fileName: outFile }).then(() => {
  console.log(`Wrote ${outFile} with dayCount=${dayCount}`);
});
