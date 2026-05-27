#!/bin/bash
# Produces nonlinear-browser.zip ready for Chrome Web Store upload.
# Run from the repo root: bash build-zip.sh

set -e

OUT="nonlinear-browser.zip"
rm -f "$OUT"

zip -r "$OUT" . \
  --exclude "*.git*" \
  --exclude ".git/*" \
  --exclude ".claude/*" \
  --exclude "node_modules/*" \
  --exclude "tests/*" \
  --exclude "*.test.js" \
  --exclude "jest.config*" \
  --exclude "package*.json" \
  --exclude "todos.md" \
  --exclude "prototypes/*" \
  --exclude "build-zip.sh" \
  --exclude "nonlinear-browser.zip" \
  --exclude "CLAUDE.md" \
  --exclude "PLAN-v2.md" \
  --exclude "README.md" \
  --exclude "navbar.css" \
  --exclude "styles.css" \
  --exclude "context_menu.css" \
  --exclude "lib/*" \
  --exclude "res/logo/*" \
  --exclude "res/icon.svg"

echo "Built: $OUT ($(du -sh "$OUT" | cut -f1))"
