# Architecture — Bay Area Grocery Deals

> Last Updated: February 1, 2026

## Overview

Bay Area Grocery Deals is a bilingual (EN/ZH) React SPA that aggregates weekly grocery discounts from Bay Area supermarkets. It consists of two main subsystems:

1. **Frontend** — React + TypeScript + Vite web app with interactive map
2. **Scraper Framework** — Modular Playwright-based scrapers with automated translation

```
┌──────────────────────────────────────────────────────────┐
│                    GitHub Actions (weekly cron)           │
│                    or local: npm run scrape:all           │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  Scraper Framework                        │
│                                                          │
│  BaseScraper (abstract)                                  │
│    ├── CostcoScraper    (Playwright → warehouse-savings) │
│    └── SproutsScraper   (Playwright → weekly-ad)         │
│                                                          │
│  Pipeline: Scrape → Validate → Translate → Categorize    │
│                                     │                    │
│                              Claude CLI (-p)             │
│                              with file cache             │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
                   src/data/deals.json
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                   │
│                                                          │
│  App.tsx                                                 │
│    ├── Header (LanguageToggle, LocationSelector)         │
│    ├── SearchBar                                         │
│    ├── StoreFilter / CategoryFilter                      │
│    ├── DealGrid → DealCard → DealModal                   │
│    └── DealMap (Leaflet, lazy-loaded)                    │
│                                                          │
│  State: React Context (AppContext)                        │
│  i18n:  i18next (EN/ZH)                                 │
│  Data:  Static JSON imports                              │
└──────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Maps | Leaflet + react-leaflet |
| i18n | i18next + react-i18next |
| State | React Context + useReducer |

### Component Hierarchy

```
App
├── Header
│   ├── LanguageToggle (EN ↔ 中文)
│   └── LocationSelector (22 Bay Area cities, 4 regions)
├── SearchBar (debounced full-text search)
├── StoreFilter (toggle chips by store)
├── CategoryFilter (toggle chips by category)
├── DealGrid
│   └── DealCard × N
│       └── DealModal (detail overlay)
├── DealMap (lazy-loaded Leaflet)
│   ├── AddressSearch
│   ├── MapPopupContent
│   └── MapToggle
└── Footer
```

### State Management

Single `AppContext` with `useReducer`, persisted to `localStorage`:

```
FilterState {
  selectedStores: string[]
  selectedCategories: string[]
  searchQuery: string
  selectedCity: string
  userLocation: LatLng | null
  radiusMiles: number
}
AppState {
  filters: FilterState
  language: 'en' | 'zh'
  selectedDealId: string | null
  mapVisible: boolean
}
```

### Data Flow

1. Static JSON files (`deals.json`, `stores.json`, `categories.json`, `cities.ts`) imported at build time
2. `useDeals` hook filters deals based on `AppState.filters`
3. `useDealClusters` groups filtered deals by city for map markers
4. Components subscribe to context and re-render on state changes

---

## Scraper Framework Architecture

### Design Principles

- **Modular**: One adapter class per store, extending `BaseScraper`
- **Resilient**: Retry with exponential backoff + jitter; single-store failures don't block others
- **Cacheable**: Translation results cached to avoid redundant Claude CLI calls
- **CI-safe**: Gracefully degrades when `claude` CLI is unavailable (skips translation)

### Pipeline Stages

```
scrape() → validate() → translateBatch() → assignCategory() → toDeal() → mergeToDealsJson()
```

| Stage | File | Description |
|-------|------|-------------|
| Scrape | `scrapers/*Scraper.ts` | Playwright browser automation per store |
| Validate | `utils/validate.ts` | Required fields, price logic, date format checks |
| Translate | `utils/translate.ts` | Claude CLI batch EN→ZH; file cache at `scripts/.cache/translations.json` |
| Categorize | `utils/categorize.ts` | Keyword matching → 10 categories (fallback: "pantry") |
| Merge | `utils/merge.ts` | Replace store's deals in `deals.json`, remove expired, reassign IDs |

### BaseScraper Class

```typescript
abstract class BaseScraper {
  abstract readonly storeId: string;
  abstract readonly locations: string[];
  abstract scrape(): Promise<ScrapedDeal[]>;

  async run(): Promise<Deal[]> {
    // scrape → validate → translate → categorize → Deal[]
  }
}
```

Subclasses only need to implement `scrape()` and declare `storeId`/`locations`.

### Translation Strategy

- **Local development**: `claude -p` CLI (Claude Max subscription, zero API cost)
- **CI environment**: Translation skipped (`CI=true`), English text preserved
- **Cache**: File-based at `scripts/.cache/translations.json`; keyed by `title||description||unit||details`
- **Batch**: All deals sent in single prompt to minimize CLI invocations

### Store Adapters

| Adapter | Scraping Method | Anti-Bot Measures |
|---------|----------------|-------------------|
| `CostcoScraper` | Playwright, 7 CSS selector strategies | Custom UA, random delays, scroll-triggered lazy load |
| `SproutsScraper` | Playwright, multiple selector fallbacks | Custom UA, delays |

### Retry Logic (`utils/retry.ts`)

- Exponential backoff: `delay = min(baseDelay * 2^attempt, maxDelay)`
- Random jitter: `delay * (0.5 + random * 0.5)` to prevent thundering herd
- 4xx errors are not retried (client errors)
- Default: 3 retries, 1s base delay, 30s max delay

---

## CI/CD

### GitHub Actions Workflow (`.github/workflows/scrape-deals.yml`)

- **Schedule**: Every Monday at 10:00 UTC (2:00 AM PT)
- **Manual trigger**: `workflow_dispatch` enabled
- **Steps**: checkout → setup node → npm ci → install Playwright → scrape:all → git commit + push
- **Translation in CI**: Skipped (no `claude` CLI); English-only data committed, translate locally if needed

---

## Data Model

### Deal (TypeScript interface)

```typescript
interface Deal {
  id: string;          // "{storeId}-{seq}", e.g. "costco-001"
  storeId: string;
  categoryId: string;  // one of 10 categories
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  originalPrice: number;
  salePrice: number;
  unit?: string;
  unitZh?: string;
  startDate: string;   // YYYY-MM-DD
  expiryDate: string;  // YYYY-MM-DD
  isHot: boolean;      // savings >= $5
  locations: string[]; // city IDs
  details?: string;
  detailsZh?: string;
}
```

### Supporting Data

- **stores.json**: 9 stores with `id`, `name`, `nameZh`, brand `color`, `cities[]`
- **categories.json**: 10 categories with `id`, `name`, `nameZh`, `icon` (emoji)
- **cities.ts**: 22 Bay Area cities in 4 regions with lat/lng coordinates

---

## Future Architecture (Planned)

### Phase 2: More Scrapers
- `SafewayScraper` (mobile API reverse-engineering)
- `HMartScraper` (web scraping)

### Phase 3: Stealth Scraping
- `WholeFoodsScraper` (Playwright + stealth plugin)

### Phase 4: Vision-Based
- `Ranch99Scraper` (image flyer → LLM Vision parsing)

### Beyond
- Backend API + database for real-time data
- User accounts, favorites, price alerts
- Mobile app (React Native)
