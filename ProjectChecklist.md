# Project Checklist — IDHL Intel Reporting Suite

Use this checklist to track progress against the implementation plan in `ProjectPlan.md`.

---

## Phase 0 — Scaffold

- [x] Client-scoped navigation exists (client selector → client context)
- [x] Tabs exist per client: **Data**, **Custom Analysis**, **Report**
- [x] All routes render with mock client data

## Phase 1 — Data Layer + Comparisons (Mock)

- [x] Define analytics domain model (metrics, dimensions, series, breakdowns, comparisons)
- [x] Implement provider interface (source-agnostic)
- [x] Implement `MockAnalyticsProvider` with deterministic seeded data
- [x] Date range picker (presets + custom) wired to provider
- [x] MoM + YoY comparison modes produce correct deltas (abs + %)
- [x] Granularity (daily/weekly) behavior is defined and consistent

## Phase 2 — Card System + Charts

- [x] Base `Card` component (title, source badge, primary KPI, delta)
- [x] Chart wrapper component (chosen charting library)
- [x] Table component for top-N breakdowns
- [x] Responsive grid layout behaves correctly on small laptop screens
- [x] Consistent formatting for currency/percent/counts

## Phase 3 — Data Tab: Core Dashboard Content (Mock)

- [x] Sessions (GA4) card (series + deltas)
- [x] Engaged sessions (GA4) card (series + deltas)
- [x] Bounce rate (GA4) card (series + deltas)
- [x] Clicks (GSC) card (series + deltas)
- [x] Impressions (GSC) card (series + deltas)
- [x] CTR (GSC) card (series + deltas)
- [x] Purchases/Conversions (GA4 events) card (series + deltas)
- [x] Revenue (GA4) card (series + deltas)
- [x] Brand vs non-brand split card (stacked chart)
- [x] Top pages card (table + optional sparklines)
- [x] Top queries/phrases card (table)
- [x] Referral sources card (bar/table)
- [x] All cards respect date range + MoM/YoY toggles

## Phase 4 — Per-Card AI (Robot Icon)

- [x] Robot icon shown in every card header
- [x] Clicking robot opens scoped popover/drawer
- [x] Define `CardContext` payload contract for AI
- [x] Implement `/api/ai/card` endpoint (mock response first)
- [x] AI answers are grounded in provided numbers (no hallucinated metrics)
- [x] Structured response UI (summary bullets, key findings, next checks)

## Phase 5 — Global Chatbot + “Generate Graph”

- [x] Bottom-right chatbot launcher + chat window UI
- [x] Chat understands current dashboard context (client + filters)
- [x] Define `GraphSpec` contract (metric, dimension, range, chart type, filters)
- [x] Implement `/api/ai/chat` endpoint (mock response first)
- [x] AI can propose a `GraphSpec` and UI can render it as a new card
- [x] Ambiguous requests trigger clarifying questions
- [x] Generated cards appear in **Custom Analysis**

## Phase 6 — Report Builder

- [x] Report grid canvas renders empty slots with “+”
- [x] Add-card modal (choose data source + card type)
- [x] Report supports adding standard cards + custom graph cards
- [x] Drag/drop reordering works reliably
- [x] Report preview mode looks client-ready
- [x] Placeholder “Export PDF” button exists (mock phase)

## Phase 7 — Persistence (PocketBase)

- [ ] Save/load report layouts per client
- [ ] Save/load custom graphs (`GraphSpec`) per client
- [ ] Save user preferences (default comparison mode, presets)
- [ ] Store connector config placeholders (GSC/GA4 property mapping)

## Phase 8 — Real Integrations (GSC/GA4) — Live Query (Option A)

- [ ] OAuth flow implemented and tokens stored securely (PocketBase)
- [ ] Implement GA4 provider using live queries
- [ ] Implement GSC provider using live queries
- [ ] Existing cards work without UI changes (provider swap)
- [ ] Basic quota/rate-limit handling and error states

## Phase 9 — Sync/Caching + Scheduled Reporting (Option B)

- [ ] Define which aggregates/breakdowns are persisted
- [ ] Background sync jobs store snapshots in PocketBase
- [ ] Retention policy + backfill strategy defined
- [ ] Scheduled report generation pipeline defined (for recurring PDFs/emails)

## Phase 10 — PDF Export

- [ ] Choose PDF generation approach (server-side recommended)
- [ ] PDF export endpoint implemented (Playwright/Puppeteer)
- [ ] Export renders report layout accurately (charts + tables)
- [ ] Basic branding and page layout templates
