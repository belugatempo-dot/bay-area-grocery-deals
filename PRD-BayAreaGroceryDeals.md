# PRD: Bay Area Deals (湾区省钱宝)

> **Version:** 1.2
> **Last Updated:** February 1, 2026
> **Author:** [Your Name]
> **Status:** In Progress

---

## 1. Executive Summary

### 1.1 Product Vision
打造一个专注于 Bay Area 的超市优惠信息聚合平台，帮助当地居民（尤其是华人社区）轻松发现所有超市折扣（不限于食品杂货），省时省钱。

Build a deals aggregation platform focused on Bay Area supermarkets, helping local residents (especially the Chinese community) easily discover all supermarket discounts (not limited to groceries — includes electronics, clothing, health, and more).

### 1.2 Product Name
- **English:** Bay Area Deals
- **中文:** 湾区省钱宝

### 1.3 Target Launch
- **Phase 1 (MVP):** Personal use + Friends & Family beta
- **Phase 2:** Public launch with user growth
- **Phase 3:** Monetization (affiliate links, ads, premium features)

### 1.4 Default Location
**Palo Alto, CA** as the default starting location, with ability to change to other Bay Area cities.

---

## 2. Problem Statement

### 2.1 User Pain Points

| Pain Point | Description |
|------------|-------------|
| **信息分散** | Grocery deals are scattered across multiple store websites, apps, and weekly ads. Users need to check 5-8 different sources. |
| **语言障碍** | Many Chinese residents prefer Chinese interface but most deal sites are English-only. |
| **时效性差** | Hard to track which deals are still valid vs. expired. |
| **地域相关性** | National deal sites don't focus on Bay Area specific stores like 99 Ranch, H Mart. |
| **时间成本高** | Manually comparing prices across stores takes significant time. |

### 2.2 Opportunity
Bay Area has a large, price-conscious population with high smartphone adoption. A bilingual, locally-focused grocery deals platform fills a clear gap in the market.

---

## 3. User Personas

### 3.1 Primary Persona: Emily Chen (陈小美)

| Attribute | Detail |
|-----------|--------|
| **Age** | 32 |
| **Location** | Palo Alto, CA |
| **Occupation** | Software Engineer |
| **Family** | Married, 1 kid (3 years old) |
| **Language** | Bilingual (Mandarin + English) |
| **Shopping Habits** | Weekly grocery runs, shops at 99 Ranch, Costco, Safeway |
| **Tech Savvy** | High - comfortable with apps |
| **Goals** | Save money, save time, feed family healthy food |
| **Frustrations** | No time to clip coupons or check multiple apps |

### 3.2 Secondary Persona: David Wang (王大卫)

| Attribute | Detail |
|-----------|--------|
| **Age** | 28 |
| **Location** | Sunnyvale, CA |
| **Occupation** | Graduate Student |
| **Family** | Single |
| **Language** | Mandarin primary, English secondary |
| **Shopping Habits** | Budget-conscious, looks for best deals |
| **Goals** | Stretch limited budget, find cheap but quality food |
| **Frustrations** | Overwhelmed by English-only deal sites |

### 3.3 Tertiary Persona: Sarah Miller

| Attribute | Detail |
|-----------|--------|
| **Age** | 45 |
| **Location** | Mountain View, CA |
| **Occupation** | Marketing Manager |
| **Family** | Married, 2 kids |
| **Language** | English only |
| **Shopping Habits** | Whole Foods, Trader Joe's, Safeway |
| **Goals** | Find organic deals, meal planning efficiency |

---

## 4. Feature Requirements

### 4.1 MVP Features (Phase 1)

#### 4.1.1 Core Features

| Feature ID | Feature | Priority | Description |
|------------|---------|----------|-------------|
| F-001 | **Deal Listing** | P0 | Display grocery deals in card format with price, discount %, store, validity period |
| F-002 | **Store Filter** | P0 | Filter deals by store (Costco, Safeway, 99 Ranch, H Mart, Whole Foods, Trader Joe's, Target, Sprouts, Walmart) |
| F-003 | **Category Filter** | P0 | Filter by 19 categories (Produce, Meat & Seafood, Dairy, Bakery, Pantry, Snacks, Beverages, Frozen, Household, Personal Care, Electronics, Clothing, Health, Baby, Pet, Outdoor, Auto, Office, Other) |
| F-004 | **Search** | P0 | Full-text search across deal titles and descriptions |
| F-005 | **Bilingual UI** | P0 | Toggle between English and 简体中文 interface |
| F-006 | **Location Setting** | P1 | Set preferred city (default: Palo Alto), show relevant store locations |
| F-007 | **Deal Details** | P1 | Expandable card showing full details, terms, applicable locations |
| F-008 | **Hot Deals Badge** | P1 | Visual indicator for best deals (>30% off or editor's pick) |
| F-009 | **Validity Indicator** | P1 | Show "Ends in X days" or "Expires today!" warnings |
| F-010 | **Last Updated Timestamp** | P2 | Show when data was last refreshed |

#### 4.1.2 Data Requirements (MVP)

| Data Field | Type | Required | Description |
|------------|------|----------|-------------|
| `id` | string | Yes | Unique deal identifier |
| `store_id` | string | Yes | Reference to store |
| `title_en` | string | Yes | Deal title in English |
| `title_zh` | string | Yes | Deal title in Chinese |
| `description_en` | string | Yes | Description in English |
| `description_zh` | string | Yes | Description in Chinese |
| `original_price` | number | No | Original price (null if not applicable) |
| `sale_price` | number | Yes | Current sale price |
| `discount_display` | string | Yes | e.g., "30% OFF", "$5 OFF", "BOGO" |
| `category` | string | Yes | Product category |
| `valid_from` | date | Yes | Deal start date |
| `valid_until` | date | Yes | Deal end date |
| `is_hot` | boolean | Yes | Featured/hot deal flag |
| `details_en` | string | No | Additional details in English |
| `details_zh` | string | No | Additional details in Chinese |
| `locations` | array | Yes | Applicable store locations |
| `source_url` | string | No | Link to original deal source |
| `image_url` | string | No | Product image URL (scraped from store pages when available) |
| `created_at` | datetime | Yes | When deal was added |
| `updated_at` | datetime | Yes | Last update timestamp |

### 4.2 Phase 2 Features

| Feature ID | Feature | Priority | Description |
|------------|---------|----------|-------------|
| F-101 | **User Accounts** | P1 | Sign up/login with email or Google |
| F-102 | **Favorites/Watchlist** | P1 | Save deals for later |
| F-103 | **Price Alerts** | P1 | Notify when specific item goes on sale |
| F-104 | **Shopping List** | P2 | Create and manage shopping lists |
| F-105 | **Deal Notifications** | P2 | Push/email notifications for new hot deals |
| F-106 | **Price History** | P2 | Show historical prices for items |
| F-107 | **Store Hours/Info** | P3 | Display store hours, address, contact |
| F-108 | **Community Submissions** | P3 | Users can submit deals they find |

### 4.3 Phase 3 Features (Monetization)

| Feature ID | Feature | Description |
|------------|---------|-------------|
| F-201 | **Affiliate Links** | Earn commission from Instacart, Amazon Fresh links |
| F-202 | **Sponsored Deals** | Stores pay to feature their deals |
| F-203 | **Premium Tier** | Ad-free experience, early access to deals |
| F-204 | **Weekly Newsletter** | Email digest of best deals |

---

## 5. Technical Specifications

### 5.1 Tech Stack (Recommended)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React + TypeScript | Type safety, component reusability |
| **Styling** | Tailwind CSS | Rapid UI development, responsive design |
| **State Management** | React Context or Zustand | Lightweight, sufficient for MVP |
| **i18n** | react-i18next | Industry standard for React internationalization |
| **Backend (Phase 2)** | Node.js + Express or Next.js API Routes | JavaScript ecosystem consistency |
| **Database (Phase 2)** | PostgreSQL or Supabase | Relational data, good for structured deals |
| **Hosting** | Vercel | Free tier, excellent for React/Next.js |
| **Analytics** | Google Analytics 4 or Plausible | Track user behavior |

### 5.2 Architecture (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  ├── Header (logo, language toggle, location selector)      │
│  ├── SearchBar                                              │
│  ├── FilterBar (stores, categories)                         │
│  ├── DealGrid                                               │
│  │   └── DealCard (individual deal display)                 │
│  ├── DealModal (expanded details)                           │
│  └── Footer                                                 │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  ├── deals[] (all deals data)                               │
│  ├── filters { store, category, search, location }          │
│  ├── language ('en' | 'zh')                                 │
│  └── ui { expandedDealId, isLoading }                       │
├─────────────────────────────────────────────────────────────┤
│  Data (MVP):                                                 │
│  └── Static JSON file (manually updated)                    │
│                                                              │
│  Data (Phase 2+):                                            │
│  └── API calls to backend → Database                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 File Structure

```
bay-area-grocery-deals/
├── public/
│   ├── locales/
│   │   ├── en/translation.json
│   │   └── zh/translation.json
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── LanguageToggle.tsx
│   │   │   └── LocationSelector.tsx
│   │   ├── Search/SearchBar.tsx
│   │   ├── Filters/
│   │   │   ├── StoreFilter.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── Deals/
│   │   │   ├── DealGrid.tsx
│   │   │   ├── DealCard.tsx
│   │   │   └── DealModal.tsx
│   │   ├── Map/
│   │   │   ├── AddressSearch.tsx
│   │   │   ├── DealMap.tsx
│   │   │   ├── MapPopupContent.tsx
│   │   │   └── MapToggle.tsx
│   │   └── Footer/Footer.tsx
│   ├── data/
│   │   ├── deals.json
│   │   ├── stores.json
│   │   ├── categories.json
│   │   └── cities.ts
│   ├── hooks/
│   │   ├── useDeals.ts
│   │   ├── useFilters.ts
│   │   ├── useLanguage.ts
│   │   ├── useMap.ts
│   │   └── useDealClusters.ts
│   ├── context/AppContext.tsx
│   ├── types/index.ts
│   ├── utils/
│   │   ├── filterDeals.ts
│   │   ├── formatPrice.ts
│   │   ├── geo.ts
│   │   └── geocode.ts
│   ├── i18n/config.ts
│   ├── App.tsx
│   └── main.tsx
├── scripts/
│   ├── scrapers/
│   │   ├── BaseScraper.ts       # Abstract base class
│   │   ├── CostcoScraper.ts     # Costco adapter
│   │   └── SproutsScraper.ts    # Sprouts adapter
│   ├── utils/
│   │   ├── translate.ts         # Claude CLI translation
│   │   ├── validate.ts          # Deal data validation
│   │   ├── merge.ts             # Merge into deals.json
│   │   ├── categorize.ts        # Auto-categorization
│   │   └── retry.ts             # Retry + exponential backoff
│   ├── scrape-all.ts            # Orchestrator
│   ├── scrape-single.ts         # Single-store runner
│   └── scrape-costco.ts         # Legacy (backward compat)
├── .github/workflows/
│   └── scrape-deals.yml         # Weekly CI scraping
├── package.json
├── tsconfig.json
└── README.md
```

### 5.4 Internationalization (i18n) Specification

#### 5.4.1 Supported Languages
| Code | Language | Default |
|------|----------|---------|
| `en` | English | No |
| `zh` | 简体中文 | Yes (for MVP target audience) |

#### 5.4.2 Translation Keys Structure

```json
// en/translation.json
{
  "app": {
    "name": "Bay Area Grocery Deals",
    "tagline": "Save money on groceries in the Bay Area"
  },
  "header": {
    "location": "Location",
    "lastUpdated": "Last Updated"
  },
  "search": {
    "placeholder": "Search deals..."
  },
  "filters": {
    "allStores": "All Stores",
    "allCategories": "All Categories"
  },
  "categories": {
    "produce": "Produce",
    "meat": "Meat & Seafood",
    "dairy": "Dairy & Eggs",
    "bakery": "Bakery",
    "pantry": "Pantry",
    "snacks": "Snacks",
    "beverages": "Beverages",
    "frozen": "Frozen",
    "household": "Household",
    "personal_care": "Personal Care",
    "electronics": "Electronics",
    "clothing": "Clothing & Apparel",
    "health": "Health & Wellness",
    "baby": "Baby",
    "pet": "Pet",
    "outdoor": "Outdoor & Garden",
    "auto": "Auto & Garage",
    "office": "Office & School",
    "other": "Other"
  },
  "deal": {
    "hot": "HOT",
    "validUntil": "Valid until {{date}}",
    "expiresIn": "Expires in {{days}} days",
    "expiresToday": "Expires today!",
    "moreDetails": "More details",
    "lessDetails": "Less details",
    "locations": "Available at"
  },
  "empty": {
    "title": "No deals found",
    "message": "Try adjusting your filters or search"
  },
  "footer": {
    "disclaimer": "Prices and availability may vary. Always verify in-store.",
    "madeWith": "Made with ❤️ for Bay Area shoppers"
  }
}
```

```json
// zh/translation.json
{
  "app": {
    "name": "湾区省钱宝",
    "tagline": "轻松发现湾区超市优惠"
  },
  "header": {
    "location": "位置",
    "lastUpdated": "更新时间"
  },
  "search": {
    "placeholder": "搜索优惠..."
  },
  "filters": {
    "allStores": "全部商店",
    "allCategories": "全部分类"
  },
  "categories": {
    "produce": "蔬果",
    "meat": "肉类海鲜",
    "dairy": "乳制品蛋类",
    "bakery": "烘焙",
    "pantry": "食品杂货",
    "snacks": "零食",
    "beverages": "饮料",
    "frozen": "冷冻食品",
    "household": "家居用品",
    "personal_care": "个人护理",
    "electronics": "电子产品",
    "clothing": "服装鞋帽",
    "health": "健康保健",
    "baby": "母婴",
    "pet": "宠物",
    "outdoor": "户外园艺",
    "auto": "汽车用品",
    "office": "办公文具",
    "other": "其他"
  },
  "deal": {
    "hot": "热门",
    "validUntil": "有效期至 {{date}}",
    "expiresIn": "还剩 {{days}} 天",
    "expiresToday": "今天截止！",
    "moreDetails": "查看详情",
    "lessDetails": "收起详情",
    "locations": "适用门店"
  },
  "empty": {
    "title": "未找到优惠",
    "message": "试试调整筛选条件或搜索词"
  },
  "footer": {
    "disclaimer": "价格和库存可能有变动，请以店内实际情况为准。",
    "madeWith": "为湾区居民用心打造 ❤️"
  }
}
```

#### 5.4.3 Language Toggle Behavior
- Toggle button in header: "EN | 中文"
- Persist language preference in localStorage
- Default to Chinese (`zh`) on first visit
- URL parameter support: `?lang=en` or `?lang=zh`

### 5.5 Location Configuration

#### 5.5.1 Supported Locations (Bay Area Cities)

41 Bay Area cities across 4 regions:

| Region | Cities |
|--------|--------|
| **South Bay** (12) | San Jose, Sunnyvale, Santa Clara, Cupertino, Milpitas, Mountain View, Los Altos, Campbell, Saratoga, Los Gatos, Morgan Hill, Gilroy |
| **Peninsula** (12) | Palo Alto (default), Menlo Park, Redwood City, San Mateo, Foster City, Burlingame, San Bruno, South SF, Daly City, San Carlos, Belmont, Half Moon Bay |
| **San Francisco** (1) | San Francisco |
| **East Bay** (16) | Fremont, Newark, Union City, Hayward, San Leandro, Alameda, Oakland, Berkeley, Richmond, Walnut Creek, Concord, Pleasanton, Dublin, Livermore, San Ramon, Danville |

#### 5.5.2 Location Logic
- Store user's selected city in localStorage
- Filter deals to show only those available at stores in/near selected city
- Show distance or "nearby" indicator for store locations

---

## 6. UI/UX Specifications

### 6.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Mobile-First** | Design for mobile screens first, enhance for desktop |
| **Scannable** | Users should find deals quickly with minimal scrolling |
| **Bilingual-Friendly** | UI elements should accommodate both EN and ZH text lengths |
| **Accessible** | WCAG 2.1 AA compliance (color contrast, keyboard nav) |
| **Fast** | Target <2s initial load, instant filter/search response |

### 6.2 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Orange | `#F97316` | CTA buttons, hot deal badges, accents |
| Primary Green | `#22C55E` | Sale prices, success states, savings |
| Dark Gray | `#1F2937` | Primary text |
| Medium Gray | `#6B7280` | Secondary text |
| Light Gray | `#F3F4F6` | Backgrounds, borders |
| White | `#FFFFFF` | Card backgrounds |
| Red | `#EF4444` | Expiring soon warnings |

### 6.3 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| App Title | Inter / Noto Sans SC | 20px | 700 |
| Section Headers | Inter / Noto Sans SC | 14px | 500 |
| Deal Title | Inter / Noto Sans SC | 16px | 600 |
| Deal Description | Inter / Noto Sans SC | 14px | 400 |
| Price (Sale) | Inter | 24px | 700 |
| Price (Original) | Inter | 14px | 400, strikethrough |
| Badges | Inter / Noto Sans SC | 12px | 600 |
| Body Text | Inter / Noto Sans SC | 14px | 400 |

### 6.4 Component Specifications

#### 6.4.1 Deal Card

```
┌─────────────────────────────────────────┐
│ [Store Badge] [HOT Badge]    Ends Feb 5 │
├─────────────────────────────────────────┤
│ Organic Chicken Breast                  │
│ Boneless skinless, per lb               │
│                                         │
│ $6.99        $10.99    [36% OFF]        │
│ (sale)       (orig)                     │
├─────────────────────────────────────────┤
│          [More details ▼]               │
└─────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────┐
│ ... (same as above) ...                 │
├─────────────────────────────────────────┤
│ Wednesday special! USDA Organic.        │
│ 📍 San Jose • Mountain View • Palo Alto │
├─────────────────────────────────────────┤
│          [Less details ▲]               │
└─────────────────────────────────────────┘
```

#### 6.4.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked filters |
| Tablet | 640px - 1024px | 2-column deal grid |
| Desktop | > 1024px | 2-3 column deal grid, sidebar filters |

### 6.5 Interaction Patterns

| Interaction | Behavior |
|-------------|----------|
| Store filter click | Toggle selection, instant filter update |
| Category filter click | Toggle selection, instant filter update |
| Search input | Debounced search (300ms delay) |
| Deal card click | Expand/collapse details in-place |
| Language toggle | Instant UI language switch |
| Location change | Update deal list to show relevant stores |

---

## 7. Data Management

### 7.1 Automated Scraper Framework (Implemented)

A modular scraper framework automatically fetches weekly deals from supermarket websites:

1. **Frequency:** Weekly via GitHub Actions (Monday 2AM PT) + manual trigger
2. **Architecture:** `BaseScraper` abstract class → per-store adapters
3. **Pipeline:** Scrape → Validate → Translate (Claude CLI) → Categorize → Merge
4. **Translation:** Uses `claude -p` CLI for EN→ZH translation (zero API cost with Claude Max); falls back to English in CI or when CLI is unavailable
5. **Supported Stores:**

| Store | Status | Method |
|-------|--------|--------|
| Costco | Active | Playwright scraping warehouse-savings page |
| Sprouts | Active | Playwright scraping weekly-ad page |
| Safeway | Planned (Phase 2) | Mobile API reverse-engineering |
| H Mart | Planned (Phase 2) | Web scraping hmart.com/weekly-ads |
| Whole Foods | Planned (Phase 3) | Playwright + stealth |
| 99 Ranch | Planned (Phase 4) | Image flyer → LLM Vision |
| Target | Future | Heavy Cloudflare protection |
| Walmart | Future | Heavy Akamai/PerimeterX protection |
| Trader Joe's | N/A | No weekly promotions |

6. **npm Scripts:**
   - `npm run scrape:all` — Run all scrapers
   - `npm run scrape:costco` — Costco only
   - `npm run scrape:sprouts` — Sprouts only

### 7.2 Data Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Store     │───▶│  Scraper    │───▶│  Validate   │───▶│  Translate   │
│  Websites   │    │  (Playwright│    │  (price,    │    │  (Claude CLI │
│             │    │   adapters) │    │   dates)    │    │   or cache)  │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬───────┘
                                                                │
                         ┌──────────────────────────────────────┘
                         ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │ Categorize  │───▶│   Merge     │───▶│  Frontend   │
                   │ (keyword    │    │ (deals.json │    │  (React)    │
                   │  matching)  │    │  update)    │    │             │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 8. Success Metrics

### 8.1 Phase 1 (Personal + Friends)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly Active Users | 10-20 (friends/family) | Manual count |
| User Satisfaction | Positive feedback | Qualitative |
| Data Freshness | Updated 2-3x/week | Commit history |
| Bug Reports | <5 open issues | GitHub Issues |

### 8.2 Phase 2 (Public Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Active Users (MAU) | 1,000+ | Google Analytics |
| Session Duration | >2 minutes | Google Analytics |
| Return Visitors | >40% | Google Analytics |
| Deals Viewed per Session | >5 | Custom event tracking |
| Newsletter Signups | 500+ | Email platform |

### 8.3 Phase 3 (Monetization)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Active Users | 10,000+ | Google Analytics |
| Affiliate Click-through Rate | >5% | Affiliate dashboard |
| Monthly Affiliate Revenue | $500+ | Affiliate dashboard |
| Premium Subscribers | 100+ | Payment platform |

---

## 9. Roadmap

### 9.1 Timeline

```
Phase 1 (MVP) - 2 weeks
├── Week 1: Core UI + Static Data
│   ├── Project setup (React + TypeScript + Tailwind)
│   ├── i18n setup
│   ├── Header, Footer, basic layout
│   ├── Deal card component
│   └── Filter components
│
├── Week 2: Features + Polish
│   ├── Search functionality
│   ├── Location selector
│   ├── Deal expansion/details
│   ├── Mobile responsiveness
│   ├── Initial deal data (20-30 deals)
│   └── Deploy to Vercel

Phase 2 (Public) - 4 weeks
├── Week 3-4: User Features
│   ├── User authentication
│   ├── Favorites/Watchlist
│   └── Basic analytics
│
├── Week 5-6: Backend + Automation
│   ├── Database setup
│   ├── API development
│   └── Basic data scraping

Phase 3 (Monetization) - Ongoing
├── Affiliate link integration
├── Sponsored deals
├── Premium features
└── Mobile app (React Native)
```

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data accuracy | High | Medium | Clear disclaimers, user feedback loop |
| Store data scraping blocked | High | Medium | Diversify sources, manual backup |
| Low user adoption | High | Medium | Focus on quality, word-of-mouth, community |
| Legal issues (scraping) | Medium | Low | Use public data, comply with ToS |
| Competitor launches | Medium | Medium | Differentiate with bilingual focus, local community |

---

## 11. Open Questions

- [x] ~~Should we include non-grocery deals?~~ → Yes, scope expanded to all supermarket deals (electronics, clothing, health, etc.)
- [ ] How to handle store-specific loyalty program deals (e.g., Safeway Club Card)?
- [ ] Should deals include clickable links to store websites/apps?
- [ ] Consider integration with Instacart/delivery services?
- [ ] Multi-city expansion beyond Bay Area in future?

---

## 12. Appendix

### A. Store List with Details

| Store | Chinese Name | Typical Deal Sources | Notes |
|-------|-------------|---------------------|-------|
| Costco | 开市客 | Monthly coupon book, in-warehouse signs | Members only |
| Safeway | 西夫韦 | Weekly ad, app coupons, Club Card | Digital coupons stackable |
| Whole Foods | 全食超市 | Weekly sales, Prime member deals | Amazon Prime integration |
| 99 Ranch | 大华超市 | Weekly ad, in-store specials | Strong in Asian groceries |
| H Mart | 韩亚龙 | Weekly ad, in-store specials | Korean focus |
| Trader Joe's | 缺德舅 | No coupons, everyday low prices | Include as "everyday values" |
| Target | 塔吉特 | Weekly ad, Circle offers, RedCard | 5% RedCard discount |
| Sprouts | — | Weekly ad, app coupons | Focus on organic/natural |
| Walmart | 沃尔玛 | Rollbacks, app deals | Price match policy |

### B. Category Taxonomy (19 Categories)

```
├── Produce (蔬果) — Fresh fruits, vegetables, organic produce
├── Meat & Seafood (肉类海鲜) — Beef, pork, chicken, seafood, plant-based
├── Dairy & Eggs (乳制品蛋类) — Milk, cheese, yogurt, eggs
├── Bakery (烘焙) — Bread, pastries, cakes
├── Pantry (食品杂货) — Rice, grains, pasta, oils, sauces, canned goods
├── Snacks (零食) — Chips, crackers, cookies, candy, nuts
├── Beverages (饮料) — Water, juice, soda, coffee, tea, alcohol
├── Frozen (冷冻食品) — Frozen meals, ice cream, frozen produce
├── Household (家居用品) — Cleaning supplies, paper products, laundry
├── Personal Care (个人护理) — Shampoo, soap, skincare, cosmetics
├── Electronics (电子产品) — TVs, computers, phones, appliances, cables
├── Clothing (服装鞋帽) — Apparel, shoes, accessories
├── Health (健康保健) — Vitamins, supplements, medicine, first aid
├── Baby (母婴) — Diapers, baby food, formula, toys
├── Pet (宠物) — Dog food, cat food, pet supplies
├── Outdoor (户外园艺) — Garden, patio, grills, camping
├── Auto (汽车用品) — Motor oil, tires, car accessories
├── Office (办公文具) — Supplies, printer ink, school supplies
└── Other (其他) — Uncategorized items
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 1, 2025 | — | Initial PRD |
| 1.1 | Feb 1, 2026 | — | Updated data pipeline: automated scraper framework, file structure with scripts/, Map components |
| 1.2 | Feb 1, 2026 | — | Scope expanded from grocery-only to all supermarket deals; 10→19 categories; 22→41 cities; zip code search; product image support |

---

**End of Document**
