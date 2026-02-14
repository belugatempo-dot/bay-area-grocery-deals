# Progress — Bay Area Grocery Deals

> Last Updated: February 14, 2026

## Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | MVP Frontend (React SPA) | Done |
| Phase 2 | Interactive Map | Done |
| Phase 3 | Costco Scraper (standalone) | Done |
| Phase 4 | Scraper Framework + Multi-Store | Done |
| Phase 4.5 | Scope Expansion (categories, cities, images, zip search) | Done |
| Phase 5 | Safeway & H Mart Scrapers | Done |
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
- [x] Sample data: 25 deals across 9 stores
- [x] Cities and categories (expanded in Phase 4.5)
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

## Phase 4.5 — Scope Expansion

**Status: Done**

- [x] Categories expanded from 10 → 19 (added electronics, clothing, health, bakery, personal care, outdoor, auto, office, other)
- [x] Scope changed from grocery-only to all supermarket deals
- [x] Default category fallback changed from "pantry" to "other"
- [x] Cities expanded from 22 → 41 Bay Area cities (added Los Altos, Campbell, Saratoga, Los Gatos, Morgan Hill, Gilroy, Menlo Park, Foster City, Burlingame, San Bruno, San Carlos, Belmont, Half Moon Bay, Newark, San Leandro, Alameda, Walnut Creek, Concord, Pleasanton, Dublin, Livermore, San Ramon, Danville, South SF)
- [x] Store city coverage expanded across all 9 stores
- [x] Address search now supports zip codes (via Nominatim `postalcode` param)
- [x] Product image support: `imageUrl` field on Deal type, DealCard shows thumbnail
- [x] SproutsScraper captures product images by walking DOM tree from h3 elements
- [x] Updated translation files (app title, tagline, search placeholder)

---

## Phase 5 — Safeway & H Mart Scrapers

**Status: Done**

### SafewayScraper (`scripts/scrapers/SafewayScraper.ts`)
- [x] Playwright scraper for `safeway.com/weeklyad/` with anti-bot measures
- [x] Multiple CSS selector fallback strategy + `page.evaluate()` fallback
- [x] Price parsing: "2 for $5", "CLUB PRICE $X.XX", "$X.XX ea", "Save $X", "Was/Now", "Buy N Get M Free"
- [x] Date parsing: "Valid MM/DD - MM/DD", "MM/DD/YY - MM/DD/YY", year boundary handling
- [x] Wed-to-Tue weekly cycle date calculation (`getSafewayWeekDates`)
- [x] 38 Bay Area city locations (highest coverage store)
- [x] 39 tests covering all date, price, and deal conversion logic
- [x] npm script: `scrape:safeway`

### HMartScraper (`scripts/scrapers/HMartScraper.ts`)
- [x] Playwright scraper for `hmart.com/weekly-ads/northern-california`
- [x] Content type detection: structured HTML vs. image-based flyers
- [x] Graceful fallback: image-based ads return empty array with warning (OCR deferred to Phase 7)
- [x] Price parsing: "$X.XX/lb", "X for $Y", "$X.XX ea", "$X.XX", "XX% off"
- [x] Fri-to-Thu weekly cycle date calculation (`getHMartWeekDates`)
- [x] 6 Bay Area city locations
- [x] 31 tests covering date, content detection, price, and deal conversion logic
- [x] npm script: `scrape:hmart`

### Registration & Integration
- [x] `scrape-all.ts` updated: runs Costco, Sprouts, Safeway, H Mart sequentially
- [x] `scrape-single.ts` updated: `--store=safeway` and `--store=hmart` supported
- [x] **552 tests** across 34 files, all passing (70 new tests)
- [x] All coverage thresholds met
- [x] No new lint errors
- [x] Production build succeeds

---

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
