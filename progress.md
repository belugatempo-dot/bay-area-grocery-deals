# Progress — Bay Area Grocery Deals

> Last Updated: February 1, 2026

## Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | MVP Frontend (React SPA) | Done |
| Phase 2 | Interactive Map | Done |
| Phase 3 | Costco Scraper (standalone) | Done |
| Phase 4 | Scraper Framework + Multi-Store | Done |
| Phase 5 | Safeway & H Mart Scrapers | Planned |
| Phase 6 | Whole Foods Scraper | Planned |
| Phase 7 | 99 Ranch (LLM Vision) | Planned |

---

## Phase 1 — MVP Frontend

**Status: Done**

- [x] Project setup (React + TypeScript + Vite + Tailwind CSS)
- [x] i18n setup (i18next, EN/ZH)
- [x] Header with language toggle and location selector
- [x] Search bar with debounced search
- [x] Store filter (toggle chips)
- [x] Category filter (toggle chips)
- [x] Deal card component with expanded details
- [x] Deal grid layout (responsive: 1/2/3 columns)
- [x] Deal modal for detail view
- [x] Footer with disclaimer
- [x] State management (React Context + useReducer + localStorage persistence)
- [x] Sample data: 25 deals across 9 stores, 10 categories
- [x] 22 Bay Area cities in 4 regions
- [x] Type definitions (Deal, Store, Category, FilterState, etc.)

---

## Phase 2 — Interactive Map

**Status: Done**

- [x] Leaflet map integration (react-leaflet)
- [x] Deal clustering by city on map
- [x] Map popup content with deal summaries
- [x] Address search (geocoding)
- [x] Map toggle (show/hide)
- [x] Geo utilities (Haversine distance, radius filtering)
- [x] Split layout: 45% deals / 55% map on desktop
- [x] Responsive: collapsible map on mobile
- [x] Lazy-loaded map component for performance

---

## Phase 3 — Costco Scraper (standalone)

**Status: Done (superseded by Phase 4 framework)**

- [x] Playwright-based scraper for Costco warehouse-savings page
- [x] Multiple CSS selector strategies (7 selectors)
- [x] Anti-bot measures (custom UA, random delays, scroll loading)
- [x] Price parsing ($X off, dual price)
- [x] Date parsing (Costco format → ISO)
- [x] Category auto-assignment (keyword matching)
- [x] Merge with existing deals.json
- [x] npm script: `scrape:costco:legacy`

---

## Phase 4 — Scraper Framework + Multi-Store

**Status: Done**

### Framework (`scripts/`)
- [x] `BaseScraper` abstract class with full pipeline (scrape → validate → translate → categorize)
- [x] `utils/retry.ts` — Exponential backoff with jitter, skip 4xx
- [x] `utils/validate.ts` — Field presence, price logic, date format validation
- [x] `utils/categorize.ts` — Keyword-based categorization (expanded from Costco map)
- [x] `utils/translate.ts` — Claude CLI (`claude -p`) batch translation with file cache
- [x] `utils/merge.ts` — Smart merge into deals.json (replace by store, remove expired, sequential IDs)

### Store Adapters
- [x] `CostcoScraper` — Migrated from standalone script to framework
- [x] `SproutsScraper` — New: Playwright scraper for sprouts.com/weekly-ad
  - Multiple selector strategies with fallbacks
  - Wed-to-Tue weekly cycle date calculation
  - Price extraction (dual price, "save $X" pattern)

### Orchestration
- [x] `scrape-all.ts` — Run all scrapers sequentially, single-store failure doesn't block others
- [x] `scrape-single.ts` — `--store=<name>` CLI argument

### npm Scripts
- [x] `scrape:all` — Run all scrapers
- [x] `scrape:costco` — Costco only (new framework)
- [x] `scrape:sprouts` — Sprouts only
- [x] `scrape:costco:legacy` — Old standalone script (backward compat)

### CI/CD
- [x] GitHub Actions workflow (`.github/workflows/scrape-deals.yml`)
  - Weekly Monday cron (2AM PT)
  - Manual dispatch
  - Auto-commit deals.json changes
  - Translation skipped in CI (no claude CLI)

---

## Planned — Phase 5: Safeway & H Mart

- [ ] `SafewayScraper` — Reverse-engineer mobile API (GitHub has working examples)
- [ ] `HMartScraper` — Scrape hmart.com/weekly-ads page

## Planned — Phase 6: Whole Foods

- [ ] `WholeFoodsScraper` — Playwright + stealth plugin

## Planned — Phase 7: 99 Ranch (LLM Vision)

- [ ] `Ranch99Scraper` — Download image flyers → LLM Vision API to extract deals

## Future

- [ ] Remove Trader Joe's from stores.json (no weekly promotions)
- [ ] Target scraper (Cloudflare-protected — difficult)
- [ ] Walmart scraper (Akamai/PerimeterX — difficult)
- [ ] Backend API + database
- [ ] User accounts, favorites, price alerts
- [ ] Mobile app
