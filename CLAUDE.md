# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                # Scrape → dev server (auto-open) → test watcher
npm run dev              # Vite dev server at localhost:5173
npm run build            # tsc -b && vite build (type-check then bundle)
npm run lint             # ESLint (flat config, v9)

# Testing (vitest, happy-dom environment, globals enabled)
npm test                 # Watch mode
npm run test:run         # Single run (CI mode)
npm run test:coverage    # With v8 coverage (thresholds per group, see vitest.config.ts)
npx vitest run src/utils/filterDeals.test.ts   # Run a single test file

# Scrapers (require Playwright + Chromium)
npm run scrape:all       # All stores sequentially
npm run scrape:costco    # Costco only (uses rebrowser-pw)
npm run scrape:sprouts   # Sprouts only
npm run scrape:safeway   # Safeway only
npm run scrape:hmart     # H Mart only
npm run scrape:ranch99   # Ranch 99 only (uses OCR)

# Smoke test
npm run tryout           # Scrape → test → build → dev server
```

## Architecture

Bilingual (EN/ZH) React SPA + automated Playwright scraper framework. Two independent subsystems sharing `src/data/deals.json` as the integration point.

### Frontend (`src/`)

- **React 19 + Vite 7 + Tailwind CSS 4** — no external state library
- **State**: `AppContext.tsx` provides context via `useReducer`. Reducer logic and persistence live in `reducer.ts`. Transient fields (searchQuery, userLocation) are excluded from persistence.
- **Hooks layer**: `useDeals`, `useFilters`, `useLanguage`, `useMap`, `useDealClusters` wrap context dispatch
- **i18n**: i18next with `HttpBackend` loading from `/locales/{en,zh}/translation.json`. Fallback language is `zh`.
- **Maps**: Leaflet via react-leaflet, lazy-loaded with `Suspense`. Desktop layout is 45% deal grid / 55% sticky map.
- **Data is static imports**: `deals.json`, `stores.json`, `categories.json` are imported at build time — no API server.
- **Filtering pipeline** (`filterDeals.ts`): location → store → category → text search → sort (hot deals first, then by expiry)

### Scraper Framework (`scripts/`)

- **Template pattern**: `BaseScraper` abstract class defines the pipeline; store adapters implement `scrape()`, `storeId`, and `locations`.
- **Pipeline**: `scrape() → validate() → translateBatch() → assignCategory() → merge into deals.json`
- **Translation**: Calls `claude -p` CLI for batch EN→ZH translation. File cache at `scripts/.cache/translations.json`. Skipped in CI (`CI=true` env var) — English used as fallback.
- **Adding a scraper**: Create `scripts/scrapers/FooScraper.ts` extending `BaseScraper`, implement `scrape()` returning `ScrapedDeal[]`, register in `scrape-all.ts` and `scrape-single.ts`.
- **Costco anti-bot**: CostcoScraper uses `rebrowser-pw` (aliased `npm:rebrowser-playwright@1.52.0`) instead of regular `playwright` to bypass Akamai Bot Manager TLS fingerprinting. Other scrapers use standard `playwright`. Both packages have their own Chromium installs.
- **OCR**: `scripts/utils/ocr.ts` uses Claude Vision (via `claude -p` CLI) to extract deals from image-based flyers. Cache at `scripts/.cache/ocr.json`. Skipped in CI. Used by Ranch99Scraper (and available for HMart Phase 7).
- **Categorization**: Keyword matching across title + description → 19 categories, default fallback is `"other"`.
- **Merge logic** (`merge.ts`): Replaces all deals for the scraped store, removes expired deals across all stores, reassigns sequential IDs (`{storeId}-001`).

### Data Model

- **9 stores**, **19 categories**, **41 Bay Area cities** (4 regions)
- All user-facing text has bilingual fields: `title`/`titleZh`, `description`/`descriptionZh`, `unit`/`unitZh`
- `isHot` flag: savings >= $5
- `locations[]`: array of city IDs where the deal is valid

### CI/CD (`.github/workflows/`)

- **test.yml**: lint → coverage → build on push/PR to main
- **scrape-deals.yml**: Monday 2AM PT cron + manual trigger; installs Chromium, runs scrapers, auto-commits `deals.json`

## Conventions

- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- ESLint v9 flat config with react-hooks and react-refresh plugins
- Test files colocated next to source (`*.test.ts` / `*.test.tsx`)
- Scraper anti-bot: custom User-Agent, random delays, scroll-triggered lazy loading
- Deal IDs are sequential per store: `costco-001`, `sprouts-002`, etc. — reassigned on every merge
