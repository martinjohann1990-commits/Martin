#!/usr/bin/env bash
#
# FlowStock build
# ---------------
# Concatenates the sources in src/ into one self-contained index.html
# that runs from file:// with no server, no bundler and no dependencies,
# then packages the Etsy delivery ZIP into dist/.
#
# Usage:  ./build.sh          build index.html
#         ./build.sh --zip    build index.html and the Etsy package
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT/src"
OUT="$ROOT/index.html"
VERSION="$(grep -o 'APP_VERSION = "[^"]*"' "$SRC/20-i18n.js" | head -1 | cut -d'"' -f2)"

echo "FlowStock $VERSION — building $OUT"

{
  cat "$SRC/00-head.html"
  cat "$SRC/10-body.html"
  printf '\n<script>\n'
  for f in 20-i18n.js 30-csv.js 40-analytics.js 50-charts.js 60-app.js; do
    printf '\n/* ----- src/%s ----- */\n' "$f"
    cat "$SRC/$f"
  done
  printf '\n</'
  printf 'script>\n'
  cat "$SRC/99-foot.html"
} > "$OUT"

# Guard: a stray closing script tag inside the JS would truncate the page.
if awk '/^<script>$/{f=1;next} /^<\/script>$/{f=0} f' "$OUT" | grep -qi '</script'; then
  echo "ERROR: a source file contains a literal closing script tag" >&2
  exit 1
fi

BYTES="$(wc -c < "$OUT" | tr -d ' ')"
echo "  index.html: $BYTES bytes"

if [ "${1:-}" = "--zip" ]; then
  PKG="$ROOT/dist/FlowStock-$VERSION"
  rm -rf "$PKG" "$ROOT/dist/FlowStock-$VERSION.zip"
  mkdir -p "$PKG/samples"
  cp "$OUT" "$PKG/FlowStock.html"
  cp "$ROOT/samples/"*.csv "$PKG/samples/" 2>/dev/null || true
  cp "$ROOT/etsy/quickstart-de.md" "$PKG/ANLEITUNG-Deutsch.md"
  cp "$ROOT/etsy/quickstart-en.md" "$PKG/README-English.md"
  cp "$ROOT/etsy/license.md" "$PKG/LICENSE.md"
  ( cd "$ROOT/dist" && zip -qr "FlowStock-$VERSION.zip" "FlowStock-$VERSION" )
  rm -rf "$PKG"
  echo "  dist/FlowStock-$VERSION.zip"
fi
