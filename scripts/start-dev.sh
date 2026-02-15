#!/bin/bash
set -euo pipefail

echo "=== Scraping deals ==="
npm run scrape:all

echo ""
echo "=== Starting dev server + test watcher ==="
echo "  Dev server: http://localhost:5173 (auto-opening browser)"
echo "  Press Ctrl+C to stop all processes"
echo ""

trap 'kill 0' EXIT

npx vite --open &
npx vitest &
wait
