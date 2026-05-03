# pinit-daily — Daily Close-Out System

## What This Is
A mobile-first PWA for Mai (shop operator at Pinit Charoen Yon auto parts shop in Thailand) to close out the cash register each night. She photographs a handwritten cash drawer ledger → Claude Vision extracts the data → the app reconciles it against today's Airtable activity → shows a colorful stats dashboard → writes the result back to Airtable.

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling (dark theme, Thai font: Sarabun)
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for Claude Vision extraction
- **Airtable REST API** for data (read today's sales/purchases/expenses + write reconciliation records)
- **Vercel** for deployment

## Key Architecture Decisions
- **No database** — all data lives in Airtable. The app reads/writes via REST API.
- **Reconciliation math runs client-side** in `lib/reconciliation.ts` for instant recalculation when Mai edits extracted values. Server-side validation before write.
- **PIN-based auth** — simple 4-digit PIN, stored as SHA-256 hash in env var. Cookie-based session (7 days).
- **Mobile-first** — all UI designed for Android Chrome. `max-w-md` container.
- **Thai language primary** — all UI labels are Thai with small English subtitles.

## Project Structure
```
app/
  page.tsx               — Screen 1: Upload (camera + checklist)
  dashboard/page.tsx     — Screen 2: Activity grid + reconciliation + extracted data
  confirmation/page.tsx  — Screen 3: Success + streak celebration
  pin/page.tsx           — PIN entry screen
  api/
    extract/route.ts     — POST: Claude Vision extraction
    activity/route.ts    — GET: Fetch today's Airtable activity
    reconcile/route.ts   — POST: Write reconciliation to Airtable
    streak/route.ts      — GET: Calculate streak from Airtable
    auth/route.ts        — POST: PIN verification
components/
  activity-card.tsx      — Single animated stat card
  activity-grid.tsx      — 6-card grid layout
  reconciliation.tsx     — Cash in/out breakdown display
  variance-badge.tsx     — Color-coded variance indicator
  extracted-data.tsx     — Collapsible extracted data viewer/editor
  confetti.tsx           — CSS-only celebration effect
lib/
  airtable.ts            — Airtable API client (read + write)
  constants.ts           — Table names, field names, thresholds
  extraction-schema.ts   — Zod schema + system prompt for Claude Vision
  reconciliation.ts      — Pure reconciliation computation functions
  types.ts               — All TypeScript types
  utils.ts               — cn(), formatBaht(), date helpers
middleware.ts            — PIN auth guard
```

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-xxx
AIRTABLE_API_KEY=patXXX
AIRTABLE_BASE_ID=appXXX
PIN_HASH=<sha256 of PIN>
VARIANCE_THRESHOLD=50
```

## Airtable Tables
The app reads from: Sales, Purchases, Purchase Line Items, Repair Jobs, Expenses, Products
The app writes to: Daily Cash Reconciliation, Daily Person Draws (these must be created first — see spec §5.2)

## Common Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Lint
```

## Important Notes
- Currency fields from Airtable API come as numbers, not strings. The CSV exports show ฿ prefix but that's display-only.
- Payment method values are Thai with English in parens: `เงินสด (Cash)`, `โอน (Transfer)`, `เครดิต (Credit)`
- The extraction schema uses a dynamic array of PersonDraws — not hardcoded person fields.
- Section B delivery fees = total cash paid to driver (COD + shipping combined). Paper ledger is source of truth for this, not Airtable.
- Refunds = ฿0 for v1 (no refund workflow yet).
