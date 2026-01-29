# Project Plan — IDHL Intel (Digital Marketing Reporting Suite)

This plan describes how we will implement the Intel reporting suite **using mock data initially**, with a clear path to later wiring in **Google Search Console (GSC)** and **Google Analytics (GA4)**.

---

## 1) Product Goals

### 1.1 Core user outcomes

- A client-specific dashboard that surfaces key performance signals across **GSC + GA4** (and later other sources).
- Consistent support for **Month-on-Month (MoM)** and **Year-on-Year (YoY)** comparisons across all metrics and charts.
- A “card” based UI: each insight/graph lives inside a **Card** with consistent controls and a clean visual system.
- AI embedded everywhere:
  - Each card has an “AI” (robot) action that opens a small contextual assistant for that card’s data.
  - A global chatbot that can answer questions and create custom graphs based on user requests.
- A report builder that lets users assemble a PDF-ready report from cards, reorder via drag/drop, and export.

### 1.2 Non-goals (for mock phase)

- No real OAuth, token storage, refresh logic, or actual Google API calls yet.
- No persistent user-defined custom graphs stored in PocketBase yet (we can add later).
- No permission model yet (admin/user/client access can come later).

---

## 2) Information Architecture (Per Client)

### Primary tabs (per client)

1. **Data**
   - Standard set of cards (traffic, clicks, impressions, sessions, engaged sessions, conversions/purchases, revenue, etc.).
   - Filters: date range, MoM/YoY toggles, channel/source filters where relevant.
2. **Custom Analysis**
   - AI-generated and user-requested custom graphs/insights (stored as “custom cards” in mock state; later persisted).
3. **Report**
   - Report builder grid with “+” slots, add card from catalog, reorder via drag/drop, export to PDF.

### Global shell

- Dashboard list / client selector (mock).
- Inside a client, the 3 tabs above are the main navigation.

---

## 3) Data Model (Source-agnostic)

We’ll implement a small “analytics domain model” so cards can be built once and reused across sources.

### 3.1 Concepts

- **Metric**: a numeric value (e.g., clicks, sessions, revenue).
- **Dimension**: a categorical field (e.g., query/phrase, page, source/medium, device, country).
- **Series**: a time series of a Metric over time (daily/weekly).
- **Breakdown**: top-N table based on a Dimension (e.g., top pages by sessions).
- **Comparison**: baseline vs current (MoM, YoY) with absolute + percent deltas.

### 3.2 Minimal TypeScript shape (planned)

- `AnalyticsSource`: `gsc` | `ga4` | `mock`
- `DateRange`: start/end + granularity
- `MetricKey`: `clicks` | `impressions` | `ctr` | `position` | `sessions` | `engagedSessions` | `events` | `purchases` | `revenue` | …
- `DimensionKey`: `page` | `query` | `source` | `medium` | `campaign` | `country` | `device` | `landingPage` | `channelGroup` | …
- `MetricValue`: `{ value: number; unit?: 'count'|'currency'|'percent'; format?: … }`
- `ComparisonResult`: `{ current, compare, deltaAbs, deltaPct }`
- `TimeSeriesPoint`: `{ date: string; value: number }`
- `TimeSeries`: `{ metric: MetricKey; points: TimeSeriesPoint[] }`
- `BreakdownRow`: `{ key: string; value: number; share?: number }`

---

## 4) Mock Data Strategy (Phase 1)

### 4.1 Mock provider layer

Create a “provider” interface that returns the domain model above.

- `MockAnalyticsProvider` returns deterministic data (seeded by client + date range) so the UI looks stable.
- Later: `GscProvider` and `Ga4Provider` implement the same interface.

### 4.2 Mock datasets to include

- Time series for:
  - GSC: clicks, impressions, CTR, position
  - GA4: sessions, engaged sessions, bounce rate, purchases, revenue, events (conversion events)
- Breakdowns:
  - Top pages (sessions, clicks)
  - Top queries/phrases (clicks, impressions)
  - Referral sources / source-medium (sessions, revenue)
  - Brand vs non-brand split (clicks, sessions, revenue)
  - Attribution examples (first/last touch: mock channel distribution)

### 4.3 Deterministic generation rules

- Seeded random per client id + metric + date range.
- Enforce believable constraints:
  - CTR in 0–1, bounce rate 0–1
  - revenue correlates with purchases; purchases correlate with sessions
  - clicks correlate with impressions + CTR
- Include “anomalies” occasionally (drops/spikes) so AI has something to diagnose.

---

## 5) Dashboard UX + Card System

### 5.1 Dashboard-level controls

- Client selector (mock).
- Date range picker:
  - “This month”, “Last month”, “Last 28 days”, “Last 90 days”, custom range.
- Comparison mode:
  - Off / **MoM** / **YoY** (with clear labels like “Compare to previous period” and “Compare to same period last year”).
- Optional: granularity toggle (Daily / Weekly) depending on range.

### 5.2 Card layout

- Responsive grid:
  - Desktop: 3–4 columns
  - Laptop: 2–3 columns
  - Mobile: 1 column
- Each card includes:
  - Title + source badge (GSC/GA4)
  - Primary number (current period)
  - Comparison delta (abs + %)
  - Chart/table content
  - Corner “robot” icon to open AI popup

### 5.3 Card catalog (initial)

**Traffic & Visibility**

- Total Sessions (GA4) — line chart + delta
- Clicks (GSC) — line chart + delta
- Impressions (GSC) — line chart + delta
- Engaged Sessions (GA4) — line chart + delta

**Commercial**

- Purchases (GA4 event) — line chart + delta
- Revenue (GA4) — line chart + delta

**Splits & Breakdowns**

- Brand vs Non-brand (GSC clicks; GA4 sessions) — stacked bar/area
- Top Pages (GA4 sessions + GSC clicks) — table with optional sparkline
- Top Queries/Phrases (GSC clicks/impressions) — table
- Referral Sources (GA4 source/medium) — bar chart + table

**Quality / Behavior**

- Bounce rate (GA4) — line chart + delta

**Attribution (mock initially)**

- First touch channel split — donut
- Last touch channel split — donut

---

## 6) AI: Per-Card Assistant (Robot Icon)

### 6.1 Interaction

- Robot icon opens a small popover/drawer scoped to the card.
- User can ask things like:
  - “Why is this down YoY?”
  - “What changed MoM?”
  - “Which pages drove the decline?”

### 6.2 How the AI answers (planned)

We will implement a “card context package” that is sent to the AI:

- Card metadata: name, source, metric, dimension, time range, comparison mode.
- The card’s data payload:
  - series points (current + comparison)
  - relevant breakdowns (e.g., top pages/queries) where applicable
- A small set of computed summaries:
  - biggest week-over-week drops
  - top contributors to delta (by breakdown)
  - anomalies (z-score or simple threshold)

AI response requirements:

- Must explicitly reference numbers present in the payload (no invented values).
- Provide “likely causes” based on correlations in the available data.
- Provide a short, actionable checklist (“check GSC indexing”, “review top landing pages”, “compare branded query trends”, etc.).

### 6.3 Technical approach

- Implement AI calls behind a SvelteKit `/api/ai/...` route.
- Define a structured request schema:
  - `question`, `cardContext`, `dashboardFilters`
- Define a structured response schema:
  - `summaryBullets[]`, `keyFindings[] { label, value }`, `recommendedNextChecks[]`
- Use Svelte 5 runes patterns in UI (`$state`, `$derived`, `$effect`) to avoid legacy `$:` issues.

---

## 7) AI: Global Chatbot + “Generate a Graph”

### 7.1 Chatbot UX

- Bottom-right floating launcher.
- Chat window supports:
  - Questions about current dashboard (“Why was revenue down YoY?”)
  - Graph requests (“Show brand vs non-brand clicks over Dec 2024 as a line chart”)

### 7.2 “Graph builder” capability (planned)

We will implement an internal **Graph Spec** format so the AI can request a new card/graph without writing code:

- `GraphSpec`:
  - `title`
  - `source` (gsc/ga4/mock)
  - `metric(s)`
  - `dimension` (optional)
  - `dateRange` (or relative)
  - `chartType` (line/bar/stacked/area/donut/table)
  - `filters` (brand/non-brand, channel, page regex, etc.)
  - `notes` (optional)

Workflow:

1. User asks in chat.
2. AI returns `GraphSpec` + explanation.
3. UI renders the graph card using the spec and the provider layer.
4. The created card appears in **Custom Analysis** (and can be added to the Report).

Guardrails:

- If a request is ambiguous, AI must ask a clarifying question (e.g., which metric, which source).
- AI must not “invent” metrics; it can only choose from a known catalog.

---

## 8) Report Builder (Tab: Report)

### 8.1 UX

- Grid canvas with empty slots, each slot shows a “+”.
- Clicking “+” opens a “Card Catalog” modal:
  - Choose data source (GSC/GA4)
  - Choose card type (prebuilt cards + custom graphs)
- Drag and drop to reorder.
- Each card can be resized (optional later; start with fixed sizes).

### 8.2 Data model

- `ReportLayout`:
  - `items[]`: `{ id, graphSpec | prebuiltCardId, order, size }`

### 8.3 PDF export (later phase)

Two viable approaches:

1. Server-side rendering with Playwright/Puppeteer to generate pixel-perfect PDFs.
2. Client-side HTML-to-PDF (faster to prototype, less consistent).

Plan:

- Mock phase: provide a “Preview” mode (print CSS) and a placeholder “Export PDF”.
- Phase 2: implement Playwright/Puppeteer PDF route once hosting constraints are known.

---

## 9) Visuals & Charting

### 9.1 Charting library choice (decision needed)

Candidates:

- ECharts (high quality, flexible)
- ApexCharts (nice defaults)
- Chart.js (simple; less complex dashboards)

Plan:

- Start with one library that supports line/bar/stacked/donut and good tooltips.
- Wrap charts in a `ChartCard` component so swapping libs later is possible.

### 9.2 Card visual system

- Consistent typography + spacing.
- Comparisons displayed clearly:
  - “+1,240 (+12.4%) vs last month”
  - Use color and arrows with accessible contrast.

---

## 10) Implementation Phases (Suggested)

### Phase A — Foundations (Mock)

1. Add client-scoped route structure:
   - `/dashboard/:clientId/data`
   - `/dashboard/:clientId/custom-analysis`
   - `/dashboard/:clientId/report`
2. Implement provider interface + `MockAnalyticsProvider`.
3. Implement dashboard-level filters (date range + compare mode).
4. Implement card grid + initial card catalog with mock charts/tables.

### Phase B — AI UX + Contracts (Mock)

1. Add robot icon per card + popover UI.
2. Add global chatbot UI.
3. Implement `/api/ai/card` and `/api/ai/chat` with mock responses first.
4. Introduce `GraphSpec` generation + rendering into Custom Analysis.

### Phase C — Report Builder (Mock)

1. Implement report grid + “add card” modal.
2. Add drag/drop ordering.
3. Add report preview styling.

### Phase D — Real Integrations (Later)

1. Add Google OAuth + token storage (likely PocketBase).
2. Implement GA4 + GSC providers.
3. Connect cards to real data and caching.
4. Enable PDF export.

---

## 11) Engineering Notes / Constraints

- This Intel app uses SvelteKit + Svelte 5 (“runes mode”) — avoid legacy `$:` where not allowed; use `$state`, `$derived`, `$effect`.
- Keep all “data queries” source-agnostic via provider interface to avoid reworking UI when adding GSC/GA4.
- AI must be constrained to data we actually provide (structured payload + numeric references).

---

## 12) Database (PocketBase)

We will use **PocketBase** as the database for storing any information we need, including (eventually):

- Clients/projects, report layouts, saved custom graphs (`GraphSpec`), user preferences, and access control.
- Connector configuration (which properties/sites are linked), sync settings, and status.
- OAuth tokens/refresh tokens (encrypted at rest where possible) and auditing metadata.

### 12.1 Do we need to “pull data into PocketBase” to integrate GSC/GA4 later?

Not strictly — there are two valid patterns:

**Option A: Live querying (no data stored, except tokens/config)**

- On each dashboard view, query GSC/GA4 directly for the selected date range and comparisons.
- Pros: simplest data model, always freshest data.
- Cons: slower UX, rate limits/quota risk, repeated calls for the same ranges, harder to generate consistent PDFs and AI analysis across pages.

**Option B: Cache/snapshot in PocketBase (recommended for a reporting suite)**

- Periodically sync and store time-series aggregates and key breakdowns (daily/weekly) per client/source.
- UI reads from PocketBase for fast dashboards, stable MoM/YoY comparisons, report generation, and AI analysis.
- Pros: fast UX, resilient to API hiccups, cheaper API usage, better for scheduled reports/PDFs, better AI grounding.
- Cons: requires sync jobs, retention strategy, and backfill logic.

Planned approach:

- Start with **Option A** for early integration (quickest to prove end-to-end).
- Move to **Option B** once the card catalog/reporting stabilizes (so we know exactly which aggregates to persist).

---

## 13) Immediate Next Step (If Approved)

- Implement the client tab routes + the dashboard filter bar + a first set of mock cards (sessions, clicks, revenue) with charts and MoM/YoY toggles, all driven by the mock provider layer.
