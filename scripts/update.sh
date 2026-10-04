#!/usr/bin/env bash
# One command to bring the outdoo.in Repl up to date:  npm run update  → then press Republish
set -e
cd "$(dirname "$0")/.."
echo "→ Getting the latest code from GitHub (main)…"
git fetch origin
git checkout -q main 2>/dev/null || git checkout -q -b main origin/main
git reset --hard origin/main
echo "→ Building product pages, sitemap and Google feed from the live catalog…"
node scripts/build-pages.mjs
node scripts/build-seo.mjs
echo ""
echo "✅ Up to date: $(git log -1 --format='%h %s')"
echo "   Now press Republish."
