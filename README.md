# Bay Area Grocery Deals (湾区省钱宝)

A bilingual (English/Chinese) web app that aggregates weekly grocery deals from Bay Area supermarkets, helping local residents discover discounts and save money.

## Features

- **9 stores**: Costco, Safeway, Whole Foods, 99 Ranch, H Mart, Trader Joe's, Target, Sprouts, Walmart
- **10 categories**: Produce, Meat & Seafood, Dairy, Bakery, Snacks, Beverages, Frozen, Pantry, Household, Personal Care
- **Interactive map**: Leaflet map with deal clusters by city, address search, radius filtering
- **Bilingual UI**: Toggle between English and Simplified Chinese
- **22 Bay Area cities** across South Bay, Peninsula, SF, and East Bay
- **Automated scraping**: Playwright-based scrapers fetch real deals weekly

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Maps**: Leaflet + react-leaflet
- **i18n**: i18next
- **Scraping**: Playwright + Claude CLI for translation
- **CI**: GitHub Actions (weekly cron)

## Getting Started

```bash
npm install
npm run dev          # Start dev server at localhost:5173
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run scrape:all` | Run all store scrapers |
| `npm run scrape:costco` | Scrape Costco deals only |
| `npm run scrape:sprouts` | Scrape Sprouts deals only |

## Scraper Framework

The `scripts/` directory contains a modular scraper framework:

```
scripts/
├── scrapers/
│   ├── BaseScraper.ts        # Abstract base class (scrape → validate → translate → categorize)
│   ├── CostcoScraper.ts      # Costco warehouse savings
│   └── SproutsScraper.ts     # Sprouts weekly ad
├── utils/
│   ├── translate.ts          # Claude CLI (claude -p) batch translation with cache
│   ├── validate.ts           # Deal data validation
│   ├── merge.ts              # Smart merge into deals.json
│   ├── categorize.ts         # Keyword-based auto-categorization
│   └── retry.ts              # Retry with exponential backoff
├── scrape-all.ts             # Run all scrapers
└── scrape-single.ts          # Run one: --store=costco
```

### Adding a New Store Scraper

1. Create `scripts/scrapers/MyStoreScraper.ts` extending `BaseScraper`
2. Implement `storeId`, `locations`, and `scrape()` method
3. Register in `scrape-all.ts` and `scrape-single.ts`

### Translation

Translation uses `claude -p` CLI (requires Claude Max subscription, zero API cost). It:
- Batches all deals in a single prompt
- Caches results in `scripts/.cache/translations.json`
- Falls back to English when CLI is unavailable or in CI

## Project Structure

```
src/
├── components/        # React components (Header, Deals, Map, Filters, etc.)
├── context/           # AppContext (state management)
├── data/              # Static data (deals.json, stores.json, categories.json, cities.ts)
├── hooks/             # Custom hooks (useDeals, useFilters, useMap, etc.)
├── i18n/              # i18next configuration
├── types/             # TypeScript type definitions
└── utils/             # Frontend utilities (filtering, formatting, geo)
scripts/               # Scraper framework (see above)
.github/workflows/     # CI: weekly deal scraping
```

## CI/CD

GitHub Actions runs scrapers weekly (Monday 2AM PT) and auto-commits updated `deals.json`. Translation is skipped in CI — run scrapers locally with `claude` CLI installed for Chinese translations.
