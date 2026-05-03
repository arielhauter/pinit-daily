# Mai's Daily Close-Out System — Full Spec

> **Working title:** ระบบปิดร้านประจำวัน (Daily Close-Out System)
> **Replaces:** `cash_reconciliation_system_spec.md` (initial spec, now superseded)
> **User:** Mai (primary), Mint (oversight/admin)
> **Trigger:** End of day, after Mai fills out the printed cash ledger and counts cash in drawer
> **Platform:** Next.js web app (mobile-first PWA) + Vercel AI SDK + Airtable API
> **Status:** Architecture spec — ready to build

---

## 1. The Big Idea

This is not a cash reconciliation tool. It is Mai's **daily close-out ritual** — the single action that ends every workday and gives her full visibility into what happened today.

Mai photographs her handwritten cash drawer ledger. The system reads it with AI, fetches today's activity from Airtable, reconciles the cash, and presents a **Daily Stats Dashboard** showing everything: sales, purchases, repairs, inventory received, expenses, personal draws, and the cash variance.

The design principle is **gamification through transparency**. Mai has never had a dashboard. She's never seen her own daily numbers visualized. Going from zero visibility to a colorful, animated stats screen every night — with streaks, completion indicators, and celebration states — will be genuinely exciting. The daily upload becomes the trigger, and the dashboard is the dopamine hit.

This is also the **trojan horse** for a broader custom web platform. The same Next.js/Vercel app that hosts the close-out system will eventually host optimized sales forms, QR-code product lookup, and other tools that replace the current Fillout.com forms and some Airtable Interfaces.

---

## 2. User Flow

### Screen 1: Upload (ถ่ายรูปเก๊ะ)

The app opens to a dead-simple screen. No data fetching. Instant load.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  🌙 ปิดร้านวันนี้                                │
│     Daily Close-Out                              │
│                                                  │
│  วันที่: 2 พ.ค. 2569                             │
│                                                  │
│  ── ทำครบแล้วหรือยัง? ──                         │
│  (Did you finish everything?)                    │
│                                                  │
│  ☐  บันทึกยอดขายครบ (Sales logged)               │
│  ☐  บันทึกยอดซื้อครบ (Purchases logged)          │
│  ☐  บันทึกค่าใช้จ่ายครบ (Expenses logged)        │
│  ☐  นับเงินสดแล้ว (Cash counted)                 │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │                                           │   │
│  │         📷  ถ่ายรูปเก๊ะ                    │   │
│  │         Take Photo of Ledger              │   │
│  │                                           │   │
│  │     [ กดเพื่อถ่ายรูป / เลือกไฟล์ ]        │   │
│  │     [ Tap to take photo / choose file ]   │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ── ดูสรุปวันก่อนหน้า ──                        │
│  [ ◄ ดูผลวันวาน (View yesterday's result) ]     │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Behavior:**

- **No API calls on load.** The screen is static HTML + a camera input. Loads in under 1 second even on slow Thai mobile data.
- **Checklist is static** — not data-driven. Tapping a checkbox is a self-confirmation gesture, not a system check. Checkboxes are not required to proceed. They are visual reminders that mirror the items on Mai's printed quick reference card at the counter.
- **Camera button** uses `<input type="file" accept="image/*" capture="environment">` which opens the device camera directly on Android. Also accepts file picker for choosing an existing photo.
- **Image preview** appears after capture/selection so Mai can verify it's readable before submitting.
- Once photo is selected, a **large submit button** appears: `อัพโหลดและดูผลวันนี้ (Upload & See Today's Results)`
- **"View yesterday" link** at bottom lets Mai review prior day's dashboard (opens Screen 2 in read-only mode with yesterday's data). Only visible if a previous day's record exists.
- **Date defaults to today.** If Mai is doing this after midnight for the previous day, she can tap the date to change it. Date picker constrained to past 3 days.

### Screen 2: Processing → Daily Dashboard + Reconciliation

After upload, the screen transitions to a loading state while **two things happen in parallel:**

1. **Claude Sonnet** extracts structured data from the ledger photo (via Vercel AI SDK `generateObject()`)
2. **Airtable API** fetches today's activity data across all tables

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  ⏳ กำลังอ่านเก๊ะ...                             │
│     Reading your ledger...                       │
│                                                  │
│  [progress indicator / animated icon]            │
│                                                  │
│  💡 ระหว่างรอ: เก็บเก๊ะกระดาษใส่แฟ้ม            │
│     (While waiting: file the paper ledger)       │
│                                                  │
└─────────────────────────────────────────────────┘
```

Once both API calls complete (typically 3-5 seconds), the screen **transitions to the full Daily Dashboard with a reveal animation** — cards slide up from the bottom, numbers count up from zero. This is the dopamine hit.

#### Section A: Today's Activity Summary (ข้อมูลวันนี้)

This section shows what the *system* recorded today — pulled from Airtable. Each card shows a count and total. Cards with zero activity are dimmed (not hidden — hiding them removes the accountability signal).

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  📊 สรุปวันนี้ — Daily Summary                   │
│  วันที่ 2 พ.ค. 2569                              │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📗 ขาย   │  │ 📘 ซื้อ  │  │ 📙 ซ่อม  │       │
│  │ Sales    │  │ Purchase │  │ Repairs  │       │
│  │          │  │          │  │          │       │
│  │  7 รายการ│  │  3 รายการ│  │  2 งาน   │       │
│  │ ฿12,450  │  │ ฿8,200   │  │ ฿3,800   │       │
│  │    ✅    │  │    ✅    │  │    ✅    │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📦 รับของ │  │ 💸 จ่าย  │  │ 💰 เงินสด│       │
│  │ Received │  │ Expenses │  │ Cash     │       │
│  │          │  │          │  │ Sales    │       │
│  │  12 ชิ้น │  │  2 รายการ│  │          │       │
│  │    ✅    │  │ ฿450     │  │ ฿9,800   │       │
│  │          │  │    ✅    │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
```

**Card logic:**
- **Sales (📗):** Count of records in Sales table where `sale_date` = today. Total = SUM of `total_collected`. If 0: card is dimmed, shows "⚠️ ยังไม่มี" (None yet)
- **Purchases (📘):** Count of records in Purchases table where `purchase_date` = today. Total = SUM of `total`.
- **Repairs (📙):** Count of records in Repair Jobs table where status changed today (any status). Shows count by status: "1 In Progress, 1 Completed"
- **Inventory Received (📦):** Count of purchase line items where `received` = true AND `received_date` = today. Shows item count.
- **Expenses (💸):** Count of records in Expenses table where `date` = today. Total = SUM of `amount`.
- **Cash Sales (💰):** Subset of sales where `payment_method` = Cash. This is the number that matters for reconciliation.

**Zero-activity warning:** If Cash Sales = ฿0 but the paper ledger shows a non-zero starting balance difference, the system flags this prominently — it likely means Mai forgot to log sales. This is the accountability moment.

#### Section B: Cash Reconciliation (กระทบยอดเงินสด)

This section shows the reconciliation result — comparing the AI-extracted ledger data against the system data.

```
│  ── 💵 กระทบยอดเงินสด ──                        │
│  Cash Reconciliation                             │
│                                                  │
│  ยอดเปิดร้าน (Starting):         ฿ 15,000       │
│                                                  │
│  ＋ เงินเข้า (Cash In)                           │
│     ยอดขายเงินสด (Cash Sales):   ฿  9,800       │
│     เงินสดเข้าอื่น (Other In):   ฿      0       │
│                                  ─────────       │
│     รวมเข้า (Total In):         ฿  9,800       │
│                                                  │
│  － เงินออก (Cash Out)                           │
│     เบิกส่วนตัว (Draws):                         │
│       Mai ฿500 · Boot ฿500 ·                     │
│       Pinit ฿400 · Aed ฿300                      │
│     อาหาร (Food):                                │
│       Mai ฿150 · Boot ฿120 ·                     │
│       Pinit ฿80 · Aed ฿60 · Kai ฿100            │
│     อื่นๆส่วนตัว (Other):                        │
│       Boot ฿200                                  │
│     จ่ายค่าส่ง (Delivery Cash Paid):              │
│       เช้า ฿150 · เย็น ฿200                      │
│       (รวม COD + ค่าส่ง ที่จ่ายให้คนขับ)          │
│     เงินคืนลูกค้า (Refunds):     ฿    300       │
│     อื่นๆ (Other Out):          ฿  1,500       │
│                                  ─────────       │
│     รวมออก (Total Out):         ฿  4,360       │
│                                                  │
│  ── ผลลัพธ์ ──                                   │
│                                                  │
│  ยอดที่ควรจะเป็น (Expected):     ฿ 12,240       │
│  ยอดนับจริง (Actual Count):      ฿ 12,190       │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │  ⚠️ ผลต่าง (Variance): ฿ -50              │   │
│  │  ขาดไป 50 บาท (Short ฿50)                 │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
```

**Variance display logic:**
- `variance == 0`: Green card with animation, "✅ ยอดตรง! (Cash matches!)" — confetti effect or checkmark animation
- `|variance|` ≤ 50: Yellow card, "⚠️ ขาด/เกินเล็กน้อย (Minor variance)"
- `|variance|` > 50: Red card, "❌ ขาด/เกินมาก — กรุณาตรวจสอบ (Large variance — please check)"
- Threshold is configurable (env var). ±50 is the initial setting.

#### Section C: Extracted Ledger Details (รายละเอียดจากเก๊ะ)

Collapsible section showing the raw data the AI extracted from the photo. Mai can review and correct any misreadings before submitting.

```
│  ── 📝 ข้อมูลที่อ่านจากเก๊ะ (Extracted Data) ── │
│  ▸ [tap to expand/collapse]                      │
│                                                  │
│  A. เบิกเงิน & อาหาร                             │
│  ┌─────────┬───────┬───────┬───────┐             │
│  │         │ เงิน  │ อาหาร │ อื่นๆ │             │
│  │ Mai     │  500  │  150  │    0  │             │
│  │ Boot    │  500  │  120  │  200  │             │
│  │ Pinit   │  400  │   80  │    0  │             │
│  │ Aed     │  300  │   60  │    0  │             │
│  │ Kai     │    0  │  100  │    0  │             │
│  └─────────┴───────┴───────┴───────┘             │
│                                                  │
│  B. ค่าส่ง                                       │
│  เช้า: ฿150 · เย็น: ฿200                         │
│                                                  │
│  C. อื่นๆ                                        │
│  ┌──────┬───────┬────────────┬──────┬─────┐      │
│  │ ใคร  │ ร้าน  │ รายละเอียด │ ฿    │เข้า/ออก│   │
│  │ Mai  │ 7-11  │ ของใช้บ้าน │ 1500 │ ออก │      │
│  └──────┴───────┴────────────┴──────┴─────┘      │
│                                                  │
│  [✏️ แก้ไขข้อมูล (Edit extracted data)]           │
│                                                  │
```

**Edit capability:** If the AI misread a number (e.g., read ฿500 as ฿800), Mai can tap "Edit" to open an edit mode where each field becomes editable. The reconciliation recalculates live as she edits. This is important because Thai handwriting + phone camera quality will occasionally produce misreadings.

#### Section D: Submit

```
│  ── หมายเหตุ (Notes) ──                         │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │ [text input — optional unless variance]   │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  [ ย้อนกลับ ]           [ ✅ บันทึกและปิดร้าน ]  │
│  [ Go Back  ]           [ Save & Close Out  ]   │
│                                                  │
```

**Submit behavior:**
- If variance == 0: Submit is enabled immediately.
- If variance ≠ 0: Submit requires a note. The button text changes to "บันทึกพร้อมหมายเหตุ (Save with Note)" and is disabled until the note field has text.
- **Go Back:** Returns to Screen 1. Mai can re-photograph or go fix entries in Airtable before trying again.
- On successful submit: writes the full reconciliation record to Airtable, then transitions to Screen 3.

### Screen 3: Confirmation + Streak (บันทึกสำเร็จ!)

The celebration screen. This is the final dopamine reward.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  🎉 บันทึกสำเร็จ!                                │
│     Saved successfully!                          │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │         🔥 ปิดร้านครบ 5 วันติดต่อกัน!       │   │
│  │         5-day close-out streak!            │   │
│  │                                           │   │
│  │   จ  อ  พ  พฤ  ศ  ส  อา                   │   │
│  │   ✅ ✅ ✅ ✅  ✅  ·  ·                    │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  วันที่: 2 พ.ค. 2569                             │
│  ผลต่าง: ฿ 0  ✅                                 │
│  ยอดขาย: ฿ 12,450                                │
│  เบิกส่วนตัว: ฿ 1,700                            │
│                                                  │
│  Mint will be notified.                          │
│                                                  │
│  [ 🏠 กลับหน้าแรก ]                              │
│  [ Back to home    ]                             │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Streak logic:**
- Count consecutive days where a Daily Cash Reconciliation record exists.
- Display as a week-view calendar with checkmarks.
- If streak ≥ 7: show fire emoji + "🔥🔥 สุดยอด! ครบสัปดาห์!" (Amazing! Full week!)
- If streak is broken (gap day): show "เริ่มนับใหม่วันนี้ (Starting fresh today)" — no shame, just a reset.
- The streak counter is stored as a simple query: count consecutive dates backward from today in the Daily Cash Reconciliation table.

**Mint notification:**
- If `|variance|` > threshold (50 baht): Send notification to Mint.
- If streak milestone hit (7, 14, 30 days): Send celebration notification to Mint.
- Notification channel: Initially email (via Vercel serverless). LINE notification as a future enhancement (requires LINE Messaging API setup).

---

## 3. Technical Architecture

### 3.1 Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 14+ (App Router) | Server components, API routes, built-in image optimization, Vercel deployment |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible components. Thai font support via `Sarabun` or `Noto Sans Thai` |
| **AI** | Vercel AI SDK (`ai` package) + Anthropic provider | `generateObject()` with Zod schema for structured extraction from photos |
| **Model** | Claude Sonnet (latest) via Anthropic API | Best price/performance for Thai handwriting OCR. Vision capable. |
| **Data** | Airtable API (REST) | Existing data store for all business operations. Read today's activity + write reconciliation record. |
| **Hosting** | Vercel (free tier) | Zero-config deployment from GitHub. Serverless functions. HTTPS by default (required for PWA camera access). |
| **Auth** | Simple PIN code (initially) | 4-digit PIN stored as env var. No user management needed yet. Upgrade to proper auth when expanding to sales forms. |
| **Future DB** | Convex | When we need a real database (for the future sales form, product catalog caching, etc.). Not needed for v1. |

### 3.2 Project Structure

```
pinit-daily/
├── app/
│   ├── layout.tsx              # Root layout — Thai font, theme
│   ├── page.tsx                # Screen 1: Upload
│   ├── dashboard/
│   │   └── page.tsx            # Screen 2: Dashboard + Reconciliation
│   ├── confirmation/
│   │   └── page.tsx            # Screen 3: Confirmation + Streak
│   └── api/
│       ├── extract/
│       │   └── route.ts        # POST: Send image to Claude, return extracted data
│       ├── activity/
│       │   └── route.ts        # GET: Fetch today's activity from Airtable
│       ├── reconcile/
│       │   └── route.ts        # POST: Write reconciliation record to Airtable
│       └── streak/
│           └── route.ts        # GET: Calculate current streak from Airtable
├── components/
│   ├── upload-zone.tsx         # Camera/file upload component
│   ├── activity-card.tsx       # Single stat card (reusable)
│   ├── activity-grid.tsx       # Grid of 6 stat cards
│   ├── reconciliation.tsx      # Cash reconciliation breakdown
│   ├── variance-badge.tsx      # Color-coded variance display
│   ├── extracted-data.tsx      # Collapsible extracted data viewer/editor
│   ├── streak-display.tsx      # Week calendar + streak counter
│   └── checklist.tsx           # Static pre-upload checklist
├── lib/
│   ├── airtable.ts             # Airtable API client (read + write)
│   ├── extraction-schema.ts   # Zod schema for Claude extraction output
│   ├── reconciliation.ts      # Reconciliation computation logic
│   ├── types.ts                # TypeScript types
│   └── constants.ts            # Table names, field names, thresholds
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # PWA icons
├── .env.local                  # API keys (Anthropic, Airtable)
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 3.3 Data Flow

```
Mai opens app (Screen 1)
    ↓  [no API calls — instant load]
Mai photographs cash drawer ledger
    ↓
Mai taps "Upload & See Results"
    ↓  [navigate to Screen 2 with image in state]
    ↓
    ├─── PARALLEL CALL 1: POST /api/extract ──────────────────┐
    │    Body: { image: base64, date: "2026-05-02" }          │
    │    → Vercel AI SDK generateObject()                     │
    │    → Claude Sonnet processes image                      │
    │    → Returns ExtractionResult (typed JSON)              │
    │                                                         │
    ├─── PARALLEL CALL 2: GET /api/activity?date=2026-05-02 ──┐
    │    → Airtable API: fetch Sales (today)                  │
    │    → Airtable API: fetch Purchases (today)              │
    │    → Airtable API: fetch Repair Jobs (today)            │
    │    → Airtable API: fetch Expenses (today)               │
    │    → Airtable API: fetch Purchase Line Items received   │
    │    → Returns ActivitySummary (typed JSON)               │
    │                                                         │
    ├─── PARALLEL CALL 3: GET /api/streak ────────────────────┐
    │    → Airtable API: query Daily Cash Reconciliation      │
    │    → Count consecutive days backward from today         │
    │    → Returns { streak: number, weekView: boolean[] }    │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
    ↓  [all 3 resolve]
    ↓
Frontend computes reconciliation locally:
    → extraction.starting_balance
    → + activity.total_cash_sales + extraction.other_cash_in
    → - extraction.total_draws - extraction.total_food
      - extraction.total_other_personal - extraction.total_delivery
      - activity.total_cash_refunds
      - extraction.other_cash_out
    → = expected_balance
    → variance = extraction.actual_cash_count - expected_balance
    ↓
Screen 2 renders: Activity Grid + Reconciliation + Extracted Data
    ↓
Mai reviews. Optionally edits extracted data. Adds note if variance.
    ↓
Mai taps "Save & Close Out"
    ↓
POST /api/reconcile
    Body: { date, extraction, activity, variance, note, image_url? }
    → Create record in Daily Cash Reconciliation table
    → If |variance| > threshold: send notification to Mint
    → Returns { success: true, streak: number }
    ↓
Navigate to Screen 3: Confirmation + Streak
```

### 3.4 Key Design Decision: Where Does Reconciliation Compute?

The reconciliation math runs **on the frontend** (in the browser), not in the API route. Reasons:

1. **Instant recalculation** when Mai edits extracted values — no round-trip to server.
2. The formula is simple arithmetic. No reason to put it behind an API.
3. The API routes are stateless data fetchers/writers. Business logic lives in `lib/reconciliation.ts`.

The API route `/api/reconcile` receives the *already-computed* result and writes it to Airtable. It does a **server-side validation** of the math before writing (defense against bugs/tampering).

---

## 4. AI Extraction — Claude Vision Prompt

### 4.1 Zod Schema (`lib/extraction-schema.ts`)

The schema uses a **dynamic array of person draws** instead of hardcoded person fields. This handles any number of people on the form — permanent staff (Mai, Boot, Pinit), family (Kai/Mother), and temporary workers (Aed, or anyone who shows up next month). Claude reads whatever names are written on the form.

```typescript
import { z } from 'zod';

export const PersonDrawSchema = z.object({
  name: z.string().describe(
    'Person name exactly as written on the form. Common names: ใหม่ (Mai), บู๊ท (Boot), พินิจ (Pinit), แอ๊ด (Aed), ไกล (Kai). Use the Thai name if readable, otherwise use the English name printed on the form.'
  ),
  salary: z.number().describe('Total salary/draw (เงินเดือน) across all ครั้งที่ columns. 0 if empty.'),
  food: z.number().describe('Total food (อาหาร) across all ครั้งที่ columns. 0 if empty.'),
  other: z.number().describe('Total other (อื่นๆ) across all ครั้งที่ columns. 0 if empty.'),
});

export const SectionCItemSchema = z.object({
  who: z.string().describe('ใคร (Who) — name of person'),
  store: z.string().describe('ร้าน (Store) — where the purchase was made'),
  description: z.string().describe('รายละเอียด (Description)'),
  amount: z.number().describe('จำนวน ฿ (Amount in baht)'),
  direction: z.enum(['in', 'out']).describe('เข้า/ออก — cash in or cash out'),
});

export const ExtractionSchema = z.object({
  date: z.string().describe('วันที่ (Date) from top of form, in YYYY-MM-DD format'),
  starting_balance: z.number().describe('ยอดเปิดร้าน (฿) — opening cash balance'),

  person_draws: z.array(PersonDrawSchema).describe(
    'One entry per person who appears in Section A of the form, even if all their values are 0. Include every person row that has a name printed/written, regardless of whether they have any draws that day.'
  ),

  delivery_am: z.number().describe('ค่าส่งเงินสด — รอบเช้า (AM delivery fee)'),
  delivery_pm: z.number().describe('ค่าส่งเงินสด — รอบเย็น (PM delivery fee)'),

  section_c_items: z.array(SectionCItemSchema).describe('Section C line items'),

  actual_cash_count: z.number().describe('ยอดนับเงินสดจริง (Actual Cash Count) — from bottom of form'),

  extraction_confidence: z.enum(['high', 'medium', 'low']).describe(
    'How confident are you in the extraction? "high" = all values clearly readable, "medium" = some values ambiguous, "low" = significant portions unclear'
  ),
  extraction_notes: z.string().optional().describe(
    'Any issues encountered during extraction — e.g., "amount in row 3 of Section A was smudged, read as 500 but could be 800"'
  ),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;
```

### 4.2 System Prompt for Claude Vision

```
You are extracting structured data from a photograph of a Thai handwritten cash drawer ledger form (แบบฟอร์มลิ้นชักเงินสด).

The form has these sections:

**Header:**
- วันที่ (Date): handwritten date at top
- ยอดเปิดร้าน (฿): opening cash balance

**Section A — เบิกเงินเดือน & อาหาร & อื่นๆ (Salary Draw, Meals & Other):**
A table with rows for each person (ใหม่/Mai, บู๊ท/Boot, พินิจ/Pinit, แอ๊ด/Aed, ไกล/Kai) and sub-rows for each category (เงินเดือน/Salary, อาหาร/Food, อื่นๆ/Other). Each person has up to 5 columns (ครั้งที่ 1-5) for multiple draws throughout the day. Sum all columns for each person+category combination.

**Section B — ค่าส่งซัพพลายเออร์ (Supplier Delivery Fees):**
Two rows: morning delivery (รอบเช้า/AM) and evening delivery (รอบเย็น/PM).

**Section C — อื่นๆ (Other Cash Activity):**
Line items with: ใคร (Who), ร้าน (Store), รายละเอียด (Description), จำนวน ฿ (Amount), เข้า/ออก (In/Out direction).

**Footer:**
- ยอดนับเงินสดจริง (Actual Cash Count): the physical cash count written at the bottom.

Rules:
- Empty cells = 0. Do not hallucinate values.
- Thai numerals (๐-๙) should be converted to Arabic numerals (0-9).
- If a value is ambiguous or smudged, extract your best guess and note the ambiguity in extraction_notes.
- Set extraction_confidence based on overall readability.
- The date on the form may be in Thai format (e.g., 2 พ.ค. 2569 or 2/5/69). Convert to YYYY-MM-DD using Buddhist Era (subtract 543 from Thai year if >= 2500, or add 2500+year if 2-digit).
```

### 4.3 API Route (`app/api/extract/route.ts`)

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ExtractionSchema } from '@/lib/extraction-schema';

export async function POST(request: Request) {
  const { image, date } = await request.json();

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: ExtractionSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: image, // base64 string
          },
          {
            type: 'text',
            text: `Extract all data from this cash drawer ledger form. The expected date is ${date}. Follow the extraction rules in your instructions precisely.`,
          },
        ],
      },
    ],
    system: EXTRACTION_SYSTEM_PROMPT, // the prompt from §4.2
  });

  return Response.json(result.object);
}
```

---

## 5. Airtable API Integration

### 5.1 Activity Queries (`app/api/activity/route.ts`)

The activity endpoint fetches today's data from multiple Airtable tables in parallel.

**Verified field names** (from CSV exports of live Airtable base, May 2026):

| Table | Key fields (exact names from export) |
|-------|--------------------------------------|
| Sales | `sale_id`, `sale_date`, `transaction_type`, `payment_method`, `total`, `total_collected`, `customer`, `note` |
| Purchases | `purchase_id`, `purchase_date`, `supplier`, `total`, `total_paid`, `payment_method` |
| Purchase Line Items | `line_id`, `purchase_id`, `product`, `quantity`, `is_received`, `received_at`, `total_units_received` |
| Repair Jobs | `job_id`, `customer`, `status`, `quoted_date`, `start_date`, `completion_date_boot`, `total_collected`, `quoted_price` |
| Expenses | `expense_id`, `expense_date`, `category`, `amount`, `payment_method`, `description` |
| Products | `sku`, `display_name`, `current_stock`, `last_known_cost_baht`, `last_known_sell_price_baht` |

**Important field notes from the live data:**
- **Sales.total** is a formula field (always populated, 208/208 rows). Format: `฿880` (string with ฿ prefix).
- **Sales.total_collected** is a manual entry field (192/208 populated). When present, this is what the customer actually paid. When absent, `total` is the amount. For cash reconciliation, we use `total_collected` if present, else `total`.
- **Sales.payment_method** values: `เงินสด (Cash)`, `โอน (Transfer)`, `เครดิต (Credit)`, or blank.
- **Sales.transaction_type** values: `Product Sale`, `Simple Repair`, `Specialized Repair`.
- **Purchases.payment_method** values: `เงินสด (Cash)`, `โอน (Transfer)`, `Shopee (pre-paid)`.
- **Repair Jobs.status** values: `รับงาน (Quoting)`, `กำลังซ่อม (In Progress)`, `เสร็จแล้ว (Complete)`, `จ่ายแล้ว (Paid)`.
- **Purchase Line Items.is_received** — currently all blank (receiving workflow not yet active). Field exists but unused. Use `received_at` (datetime) as the indicator instead.
- **Expenses** — table exists but has 0 records. Schema is ready. Mai hasn't started logging expenses yet — this is another accountability signal for the dashboard.
- **Currency fields** in Airtable API return as numbers (not the `฿` prefixed strings from CSV export). The CSV formatting is display-only.

```typescript
// All queries filter by today's date
const [sales, purchases, repairs, expenses, receivedItems] = await Promise.all([
  // 1. Sales — today
  airtable.select('Sales', {
    filterByFormula: `IS_SAME({sale_date}, '${date}', 'day')`,
    fields: ['sale_date', 'total', 'total_collected', 'payment_method', 'transaction_type'],
  }),

  // 2. Purchases — today
  airtable.select('Purchases', {
    filterByFormula: `IS_SAME({purchase_date}, '${date}', 'day')`,
    fields: ['purchase_date', 'total', 'total_paid', 'supplier', 'payment_method'],
  }),

  // 3. Repair Jobs — any activity today (check quoted_date and start_date)
  airtable.select('Repair Jobs', {
    filterByFormula: `OR(
      IS_SAME({quoted_date}, '${date}', 'day'),
      IS_SAME({start_date}, '${date}', 'day'),
      IS_SAME({completion_date_boot}, '${date}', 'day')
    )`,
    fields: ['status', 'quoted_price', 'total_collected', 'job_type'],
  }),

  // 4. Expenses — today
  airtable.select('Expenses', {
    filterByFormula: `IS_SAME({expense_date}, '${date}', 'day')`,
    fields: ['expense_date', 'amount', 'category', 'payment_method'],
  }),

  // 5. Received inventory items — today (use received_at, not is_received)
  airtable.select('Purchase Line Items', {
    filterByFormula: `IS_SAME({received_at}, '${date}', 'day')`,
    fields: ['product', 'quantity', 'total_units_received'],
  }),
]);
```

**Computed fields returned:**

```typescript
type ActivitySummary = {
  sales: {
    count: number;
    total: number;           // SUM of (total_collected ?? total) for all sales
    cash_total: number;      // SUM where payment_method = 'เงินสด (Cash)'
    transfer_total: number;  // SUM where payment_method = 'โอน (Transfer)'
    credit_total: number;    // SUM where payment_method = 'เครดิต (Credit)'
  };
  purchases: {
    count: number;
    total: number;           // total value of purchases today (for dashboard display)
  };
  repairs: {
    count: number;
    by_status: Record<string, number>;  // e.g., { "กำลังซ่อม (In Progress)": 1, "เสร็จแล้ว (Complete)": 2 }
    total_quoted: number;
  };
  expenses: {
    count: number;
    total: number;
  };
  inventory_received: {
    item_count: number;      // distinct purchase line items received today
    unit_count: number;      // SUM of total_units_received
  };
};
```

**Note on COD / delivery cash:** Supplier deliveries arrive 2x/day via a Sisaket shipping company. The driver collects one lump sum that combines COD product payments + shipping fees — Mai does not receive an itemized breakdown. This total is what she writes on the paper ledger under Section B (AM/PM delivery). **The paper ledger is the source of truth for delivery cash out, not Airtable.** The Purchases table tracks what was ordered and at what price, but cannot tell us how much cash left the drawer at delivery time. A `shipping_payment` single-select field on Purchases (options: `เงินสด (Cash on delivery)`, `รวมในราคา (Included)`, `โอน (Transfer)`) provides future visibility into which suppliers require cash at delivery but is not used in reconciliation math.

**Note on refunds:** The current Sales table has no explicit "Refund" transaction type. Refunds are not yet captured in the system. For v1, we set refunds to ฿0 and note this as a gap. When a refund workflow is added, the dashboard will pick it up automatically.

### 5.2 Airtable Tables To Create

**None of the reconciliation tables exist yet.** We need to create two new tables:

#### Table 1: `Daily Cash Reconciliation` (สรุปเงินสดประจำวัน)

One record per day. Stores the reconciliation result + system totals. Person-level draw data lives in the linked table below.

| # | Field name | Type | Notes |
|---|---|---|---|
| 1 | `date` | Date | Primary sort field. One record per day. |
| 2 | `starting_balance` | Currency | Cash in drawer at start of day |
| 3 | `person_draws` | Link to Daily Person Draws | One-to-many. All draws for this day. |
| 4 | `total_draws` | Rollup | SUM of `salary` from linked person_draws |
| 5 | `total_food` | Rollup | SUM of `food` from linked person_draws |
| 6 | `total_other_personal` | Rollup | SUM of `other` from linked person_draws |
| 7 | `total_cash_sales` | Currency | From Airtable Sales (system value) |
| 8 | `total_cash_refunds` | Currency | From system (฿0 until refund workflow exists) |
| 9 | `delivery_cash_paid` | Currency | Total cash paid to delivery driver (AM + PM). Includes COD + shipping fees — one lump sum, no breakdown available. Source: paper ledger Section B. |
| 10 | `other_cash_in` | Currency | Section C "เข้า" items total |
| 11 | `other_cash_out` | Currency | Section C "ออก" items total |
| 12 | `total_cash_in` | Formula | `{total_cash_sales} + {other_cash_in}` |
| 13 | `total_cash_out` | Formula | `{total_draws} + {total_food} + {total_other_personal} + {total_cash_refunds} + {delivery_cash_paid} + {other_cash_out}` |
| 14 | `expected_balance` | Formula | `{starting_balance} + {total_cash_in} - {total_cash_out}` |
| 15 | `actual_count` | Currency | Physical cash count at end of day |
| 16 | `variance` | Formula | `{actual_count} - {expected_balance}` |
| 17 | `notes` | Long text | Mai's explanation for variance, or general notes |
| 18 | `section_c_detail` | Long text | JSON or structured text of Section C line items |
| 19 | `extraction_confidence` | Single select | high, medium, low |
| 20 | `ledger_photo` | Attachment | Photo of the paper ledger |
| 21 | `entered_via` | Single select | app, manual |

#### Table 2: `Daily Person Draws` (เบิกส่วนตัวรายวัน)

One record per person per day. Handles any number of people — permanent staff, family, temporary workers.

| # | Field name | Type | Notes |
|---|---|---|---|
| 1 | `date` | Date | Same day as the parent reconciliation record |
| 2 | `person` | Single select | Options auto-expand. Initial: Mai, Boot, Pinit, Kai, Aed |
| 3 | `salary` | Currency | Salary/draw amount for this person today |
| 4 | `food` | Currency | Food/drink expenses for this person today |
| 5 | `other` | Currency | Other expenses for this person today |
| 6 | `total` | Formula | `{salary} + {food} + {other}` |
| 7 | `reconciliation` | Link to Daily Cash Reconciliation | The parent day record |

**Why a linked table?** The printed form currently has 5 named rows (Mai, Boot, Pinit, Aed, Kai). Aed is a temporary cousin worker (here for ~5 days). Next month someone else might help. Hardcoding person fields means modifying the schema every time a worker comes or goes. With a linked table, the schema never changes — you just add a new option to the `person` single-select. The AI extraction outputs a dynamic array of person draws, and the API route creates one linked record per person.

**Views on Daily Person Draws:**
| View | Filter | Purpose |
|------|--------|---------|
| `By Date` | (none), sort `date` desc | Default |
| `By Person` | (none), group by `person` | See one person's history |
| `This Month` | `date` within past month | Monthly summary per person. SUM columns. |

### 5.3 Writing the Reconciliation Record (`app/api/reconcile/route.ts`)

The write is a **two-step process** because of the linked table:

```typescript
// Step 1: Create person draw records
const drawRecords = await Promise.all(
  data.extraction.person_draws
    .filter(p => p.salary > 0 || p.food > 0 || p.other > 0) // skip zero-only rows
    .map(person => airtable.create('Daily Person Draws', {
      date: data.date,
      person: normalizeName(person.name), // map Thai name to single-select option
      salary: person.salary,
      food: person.food,
      other: person.other,
    }))
);

// Step 2: Create the reconciliation record, linking to the draw records
const reconciliation = await airtable.create('Daily Cash Reconciliation', {
  date: data.date,
  starting_balance: data.extraction.starting_balance,
  person_draws: drawRecords.map(r => r.id), // link to created draw records
  total_cash_sales: data.activity.sales.cash_total,
  total_cash_refunds: 0, // not yet captured in system
  delivery_cash_paid: data.extraction.delivery_am + data.extraction.delivery_pm,
  other_cash_in: sumSectionC(data.extraction.section_c_items, 'in'),
  other_cash_out: sumSectionC(data.extraction.section_c_items, 'out'),
  actual_count: data.extraction.actual_cash_count,
  notes: data.note || '',
  section_c_detail: JSON.stringify(data.extraction.section_c_items),
  extraction_confidence: data.extraction.extraction_confidence,
  entered_via: 'app',
});
```

**Name normalization:** The AI might extract "ใหม่" or "Mai" depending on what's written. The `normalizeName()` function maps common variants to the single-select option name:

```typescript
const NAME_MAP: Record<string, string> = {
  'ใหม่': 'Mai', 'mai': 'Mai', 'Mai': 'Mai',
  'บู๊ท': 'Boot', 'boot': 'Boot', 'Boot': 'Boot',
  'พินิจ': 'Pinit', 'pinit': 'Pinit', 'Pinit': 'Pinit',
  'แอ๊ด': 'Aed', 'aed': 'Aed', 'Aed': 'Aed',
  'ไกล': 'Kai', 'แม่': 'Kai', 'kai': 'Kai', 'Kai': 'Kai',
};
```

If a name doesn't match any known mapping, it's passed through as-is — Airtable will create a new single-select option automatically. This is by design: when a new temporary worker shows up, the system just works.

---

## 6. Reconciliation Math (`lib/reconciliation.ts`)

```typescript
export function computeReconciliation(
  extraction: ExtractionResult,
  activity: ActivitySummary
): ReconciliationResult {

  // Cash IN = cash sales + any Section C "เข้า" items
  const section_c_in = extraction.section_c_items
    .filter(item => item.direction === 'in')
    .reduce((sum, item) => sum + item.amount, 0);

  const total_cash_in = activity.sales.cash_total + section_c_in;

  // Cash OUT — aggregate from dynamic person_draws array
  const total_draws = extraction.person_draws
    .reduce((sum, p) => sum + p.salary, 0);

  const total_food = extraction.person_draws
    .reduce((sum, p) => sum + p.food, 0);

  const total_other_personal = extraction.person_draws
    .reduce((sum, p) => sum + p.other, 0);

  // Delivery cash paid = total cash handed to delivery driver (COD + shipping combined)
  // This comes from the paper ledger, NOT from Airtable Purchases
  const total_delivery = extraction.delivery_am + extraction.delivery_pm;

  const section_c_out = extraction.section_c_items
    .filter(item => item.direction === 'out')
    .reduce((sum, item) => sum + item.amount, 0);

  // Note: refunds not yet tracked in Sales table — set to 0
  const refunds = 0;

  const total_cash_out =
    total_draws + total_food + total_other_personal +
    total_delivery + refunds + section_c_out;

  // Expected balance
  const expected_balance =
    extraction.starting_balance + total_cash_in - total_cash_out;

  // Variance
  const variance = extraction.actual_cash_count - expected_balance;

  return {
    starting_balance: extraction.starting_balance,
    total_cash_in,
    total_cash_out,
    expected_balance,
    actual_cash_count: extraction.actual_cash_count,
    variance,
    // Breakdowns for display
    breakdown: {
      person_draws: extraction.person_draws.map(p => ({
        name: p.name,
        salary: p.salary,
        food: p.food,
        other: p.other,
        total: p.salary + p.food + p.other,
      })),
      total_draws,
      total_food,
      total_other_personal,
      delivery_cash_paid: { am: extraction.delivery_am, pm: extraction.delivery_pm,
                  total: total_delivery },
      refunds,
      section_c: { in: section_c_in, out: section_c_out,
                   items: extraction.section_c_items },
    },
  };
}
```

---

## 7. Gamification & Behavioral Design

### 7.1 The Streak

The streak is the primary habit-forming mechanism. Implementation:

- Query `Daily Cash Reconciliation` table, sorted by `date` descending.
- Walk backward from today counting consecutive days (skip weekends if the shop is closed on Sundays — configurable).
- Store nothing extra — the streak is a pure query result.

**Streak milestones:**
| Days | Message |
|------|---------|
| 1 | 🌱 เริ่มต้นดี! (Good start!) |
| 3 | 💪 3 วันติดต่อกัน! (3 days in a row!) |
| 7 | 🔥 ครบสัปดาห์! (Full week!) |
| 14 | ⭐ 2 สัปดาห์! เก่งมาก! (2 weeks! Amazing!) |
| 30 | 🏆 ครบเดือน! ยอดเยี่ยม! (Full month! Outstanding!) |

### 7.2 Visual Feedback

- **Number count-up animation:** When the dashboard loads, numbers animate from 0 to their actual value over ~1 second. This makes the stats feel alive.
- **Card entrance animation:** Cards slide up from below with a slight stagger (card 1, then card 2, etc.). Creates a "reveal" feeling.
- **Variance celebration:** If variance == 0, play a brief confetti animation (CSS-only, no library needed). The green checkmark pulses.
- **Zero-activity dimming:** Cards with zero entries get reduced opacity and a muted color. Cards with entries are vibrant. This creates instant visual contrast — Mai can see at a glance what she did and didn't do.

### 7.3 Accountability Without Shame

The design never says "you forgot to do X." It says "0 รายการ (0 entries)" in a dimmed card. The absence of activity is visible but not judgmental. The system trusts Mai to notice. Over time, she'll internalize the pattern: "when I see a dimmed card, something's missing."

If Cash Sales = ฿0 but the ledger shows a non-zero starting balance and non-zero actual count, the system adds a gentle inline note: "💡 ยอดขายเงินสดในระบบ = ฿0 — ลืมบันทึกหรือเปล่า? (Cash sales in system = ฿0 — did you forget to log?)"

---

## 8. Authentication (v1)

### Simple PIN

For v1, authentication is a 4-digit PIN entered on first visit. The PIN is stored as a hashed env var on Vercel. Once entered correctly, a session cookie is set (7-day expiry). Mai doesn't need to re-enter it daily.

```
PIN: 1234 (Mint sets this)
Cookie: pinit-session (httpOnly, secure, 7-day expiry)
```

If the PIN is wrong 5 times, the app locks for 15 minutes.

### Future Auth

When the platform expands to include sales forms and other tools, we'll upgrade to proper auth. Options:

- **Clerk** (free tier: 10k MAUs) — easiest with Next.js
- **NextAuth.js** with a simple credentials provider
- **Convex auth** if/when we add Convex as the database

No need to decide now. The PIN works for a single-user tool.

---

## 9. PWA Configuration

The app should be installable as a PWA so Mai can add it to her home screen with a custom icon. This makes it feel like a native app.

```json
// public/manifest.json
{
  "name": "พินิจ ปิดร้าน",
  "short_name": "ปิดร้าน",
  "description": "ระบบปิดร้านประจำวัน",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Camera access:** Works in Chrome on Android as a PWA. Uses `<input type="file" accept="image/*" capture="environment">`. No special permissions beyond what the browser provides. Must be served over HTTPS (Vercel handles this automatically).

---

## 10. Cost Estimate (Updated)

| Component | Cost |
|---|---|
| Anthropic API (Claude Sonnet, 1 vision call/day) | ~$0.50–0.90/month |
| Airtable API (Team plan, already paying) | $0 incremental |
| Vercel hosting (free tier) | $0 |
| Domain (optional — can use vercel.app subdomain) | $0–12/year |
| **Monthly total** | **~$0.50–$0.90** |

Compare to previous spec: removed Langbase ($0 on old free tier, but now $100/month). The direct Anthropic API call is both cheaper and architecturally simpler.

---

## 11. Future Expansion Roadmap

This Next.js app is the foundation for the broader Pinit digital platform. Future modules:

### Phase 2: Enhanced Close-Out (Month 2-3)
- **Weekly summary view:** Mai can see her week at a glance (7-day activity chart)
- **Monthly summary:** Running totals, trends, comparison to previous month
- **Photo archive:** Store ledger photos in Google Drive via API, link to reconciliation record

### Phase 3: Sales Form + QR Scanning (Month 3-6)
- **QR code scanning:** Use Barcode Detection API (Chrome/Android) or `html5-qrcode` library to scan QR codes on product labels → auto-lookup product in Airtable → populate sale line item
- **Faster checkout:** Optimized mobile-first sales form replacing Fillout.com
- **Receipt printing:** Generate printable receipt (connects to existing thermal printer setup)
- **Requires:** Proper auth (multiple users), Convex DB for product catalog caching

### Phase 4: AI Conversational Interface — "Mai's Assistant" (Month 6-9)

This is the long-term vision for how Mai interacts with the entire system. Instead of navigating between separate forms and interfaces, Mai opens one app and either taps context buttons or talks to an AI assistant that can do everything.

#### The Concept

The interface has two modes that blend together in a single chat-style UI:

**Mode 1: Button-guided flows (structured entry)**

Mai (or Mint) opens the app and sees context buttons at the top. The buttons shown depend on who's logged in — Mai sees her daily ops buttons, Mint sees those plus analytics and inventory management:

```
📗 ขาย    📘 ซื้อ    📙 ซ่อม    💸 ค่าใช้จ่าย    📦 นับสต็อก    🌙 ปิดร้าน
Sale      Purchase   Repair    Expense         Stock Count    Close-Out
```

She taps one and a guided conversation unfolds — not a form, but a sequence of prompts with tappable options:

```
Mai taps: 📗 ขาย

Bot: สแกน QR หรือพิมพ์ชื่อสินค้า?
     [📷 สแกน QR]  [⌨️ พิมพ์ชื่อ]

Mai taps: 📷 สแกน QR
→ Camera opens, she scans a label
→ Product found: หัวเทียน BP8ES

Bot: หัวเทียน BP8ES — ราคา ฿35
     จำนวนกี่ชิ้น?
     [1]  [2]  [3]  [อื่นๆ]

Mai taps: 2

Bot: รวม ฿70 — ชำระอย่างไร?
     [💵 เงินสด]  [📱 โอน]  [📋 เครดิต]

Mai taps: 💵 เงินสด

Bot: ✅ บันทึกแล้ว!
     หัวเทียน BP8ES × 2 = ฿70 (เงินสด)
     [🧾 พิมพ์ใบเสร็จ]  [📗 ขายต่อ]
```

This is faster than any form. She never types. She never navigates. She taps 4 times and the sale is recorded. The "logic tree" is just a conversation that branches based on her selections.

**Inventory count flow (📦 นับสต็อก):**

This replaces the current manual stock-counting process. Mint or Mai walks the shelves, scanning QR codes and entering actual counts. The AI handles the comparison to system stock.

```
Mai taps: 📦 นับสต็อก

Bot: สแกน QR สินค้าที่จะนับ
     [📷 สแกน QR]  [⌨️ พิมพ์ชื่อ]  [📋 นับทั้งหมวด]

Mai taps: 📷 สแกน QR
→ Scans label on shelf

Bot: หัวเทียน BP8ES — สต็อกในระบบ: 28 ชิ้น
     นับได้กี่ชิ้น?

Mai types: 25

Bot: ⚠️ ขาด 3 ชิ้น (ระบบ 28, นับได้ 25)
     [✅ บันทึก]  [🔄 นับใหม่]  [📷 สแกนต่อ]

Mai taps: ✅ บันทึก → 📷 สแกนต่อ
→ Camera reopens, she scans the next product
→ Repeat until done

Mai types: เสร็จแล้ว (done)

Bot: สรุปการนับวันนี้:
     นับแล้ว 34 SKUs
     ตรง 29 · ขาด 4 · เกิน 1
     [📊 ดูรายละเอียด]  [🏷 พิมพ์ฉลากใหม่]  [✅ ยืนยันทั้งหมด]
```

The `🏷 พิมพ์ฉลากใหม่` button is key — if a product's label is damaged or missing during the count, Mai can immediately reprint it right from the conversation. The AI calls the existing label print API.

**Mode 2: Free-form AI chat (for everything else)**

When the structured buttons don't cover the situation, Mai types or speaks (voice input via phone keyboard):

```
Mai: ลูกค้าจะคืนกรองน้ำมันที่ซื้อเมื่อวาน
     (Customer wants to return the oil filter from yesterday)

Bot: [searches yesterday's sales, finds the oil filter sale]
     เจอแล้ว — กรองน้ำมัน Honda Wave ฿85 เมื่อวาน
     ต้องการคืนเงินสดหรือเปลี่ยนสินค้า?
     [💵 คืนเงิน]  [🔄 เปลี่ยน]

Mai taps: 💵 คืนเงิน

Bot: ✅ บันทึกคืนเงิน ฿85 เรียบร้อย
     สต็อกกรองน้ำมันเพิ่มเป็น 14 ชิ้น
```

Or she asks questions about the business:

```
Mai: วันนี้ขายไปเท่าไหร่แล้ว
     (How much have we sold today?)

Bot: วันนี้ขายไป 8 รายการ รวม ฿4,350
     เงินสด ฿3,200 · โอน ฿1,150
     สินค้าขายดีวันนี้: หัวเทียน (3), น้ำมันเครื่อง (2)
```

**Mode 3: The Oracle — business analytics for Mint (and eventually Mai)**

The same chat interface becomes a business intelligence tool. Mint can ask anything about the business and get answers pulled from live Airtable data:

```
Mint: What's our gross margin this month?

Bot: May 2026 gross margin (MTD):
     Revenue: ฿58,200
     Est. COGS: ฿39,800 (based on product costs)
     Gross profit: ฿18,400
     Gross margin: 31.6%
     
     vs. April: 29.2% (+2.4pp improvement)
     vs. Budget: 30.0% (beating by 1.6pp)
```

```
Mint: Which suppliers have we spent the most with?

Bot: Top 5 suppliers (last 30 days):
     1. รวมเจริญอะไหล่ — ฿12,400 (8 orders)
     2. คุณเฮงยานยนต์ — ฿8,200 (3 orders)
     3. เชาว์เจริญอะไหล่ — ฿6,100 (5 orders)
     4. Shopee — ฿3,400 (12 orders)
     5. บ้านแพ้วดิสทริบิวชัน — ฿2,800 (2 orders)
     
     [📊 ดูแนวโน้มรายเดือน]
```

```
Mint: What are the slow-moving products we should stop restocking?

Bot: Products with zero sales in 60+ days but stock > 0:
     
     1. สายพานราวลิ้น Wave 125 — stock: 8, last sold: 45 days ago
        Cost tied up: ฿1,840
     2. กรองอากาศ Sonic — stock: 12, last sold: 72 days ago
        Cost tied up: ฿960
     ... (15 more items)
     
     Total dead stock value: ฿18,400
     [📥 ดาวน์โหลด Excel]  [📋 ดูทั้งหมด]
```

This turns the Airtable data — which currently sits in tables that nobody analyzes — into actionable intelligence. Mint doesn't need to learn Airtable formulas or build dashboards. She just asks.

Or she handles edge cases no form anticipated:

```
Mai: น้าปรือโทรมาบอกว่ายังไม่เอารถ ขอเลื่อนไปอาทิตย์หน้า
     (Uncle Prue called, says don't pick up the car yet, postpone to next week)

Bot: อัปเดตงานซ่อม #13 น้าปรือ — เลื่อนเป็นอาทิตย์หน้า
     ใส่หมายเหตุ: "ลูกค้าขอเลื่อน"
     [✅ ตกลง]  [✏️ แก้ไข]
```

#### Technical Architecture

**Airtable MCP Server:** A custom MCP (Model Context Protocol) server that exposes the Airtable base as a set of tools Claude can call. Tools include:

| Tool | Description |
|------|-------------|
| `create_sale` | Create a sale record with line items |
| `lookup_product` | Search products by name, SKU, or QR code |
| `get_today_sales` | Fetch today's sales summary |
| `create_purchase` | Log a purchase |
| `update_repair_status` | Change repair job status, add notes |
| `get_repair_jobs` | List active repair jobs |
| `create_expense` | Log an expense |
| `get_product_stock` | Check stock level for a product |
| `update_stock_count` | Record a physical stock count for a product, flag discrepancy |
| `get_stock_discrepancies` | List products where counted ≠ system stock |
| `print_label` | Trigger QR code label printing for a product (calls existing label API) |
| `create_customer_credit` | Create a credit sale record |
| `search_customer` | Find customer by name or phone |
| `get_sales_summary` | Sales totals by day/week/month, with breakdowns by payment method |
| `get_purchase_summary` | Purchase totals by supplier, by period |
| `get_margin_analysis` | Gross margin calculation — revenue vs COGS, by period or product category |
| `get_slow_movers` | Products with zero sales in N days but stock > 0 |
| `get_top_sellers` | Best-selling products by quantity or revenue, by period |
| `get_cash_flow_summary` | Daily/monthly P&L — revenue, COGS, expenses, draws, net cash |

The MCP server runs as a Vercel serverless function (or a separate lightweight service). It wraps the Airtable API with business logic — e.g., `create_sale` not only creates the Sale record but also creates Sale Line Items, decrements stock, and optionally triggers receipt printing.

**Vercel AI SDK `streamUI`:** The frontend uses the Vercel AI SDK's `streamUI` to render a chat interface where Claude's responses can include inline React components. When Claude calls the `create_sale` tool, the response stream includes a `<SaleConfirmation>` component with the details and a print button. When Claude calls `lookup_product`, it renders a `<ProductCard>` with the image, price, and stock level.

**Button components:** The context buttons (Sale, Purchase, Repair, etc.) are React components that inject a pre-written prompt into the chat. Tapping "📗 ขาย" is equivalent to sending the message "I want to log a sale" with a system instruction that triggers the guided flow. The AI handles the branching logic.

**QR code integration:** The camera/QR scanner is a React component that can be triggered from within the chat. When Mai scans a QR code, the decoded value (product SKU) is injected into the conversation context. Claude uses `lookup_product` to find the product and continues the sale flow.

**Voice input:** Standard mobile keyboard voice input (works in Chrome on Android). Mai speaks Thai, the keyboard transcribes, and Claude processes the text. No special speech-to-text integration needed.

#### Why This Is the End State

The current architecture requires Mai to know:
- Which form to open for which task
- What fields to fill in what order
- Where to find things in Airtable Interfaces
- The difference between Sales, Purchases, Expenses, Repairs

With the AI chat interface, Mai just needs to know:
- Open the app
- Tap what you want to do, or describe what happened
- Confirm

The AI handles the routing, the data entry, the lookups, and the edge cases. Mai's mental model goes from "navigate a software system" to "talk to a helper who knows the shop."

For Mint, the same interface becomes an oracle. She doesn't need to learn Airtable formulas, build views, or export CSVs to answer business questions. She asks "what's our margin on chainsaw parts?" and gets an answer in seconds. The data is already in Airtable — the AI just makes it accessible without requiring BI skills. Every analytical query Mint might run in Excel or Google Sheets can be answered conversationally, with the option to export the result as a spreadsheet when she needs to share it or dig deeper.

#### Prerequisites (build before this phase)

- Phases 1-3 complete (close-out system, P&L dashboard, sales form)
- Proper auth (multi-user — Mai, Boot, possibly Pinit)
- Convex DB for fast product lookups (Airtable API is too slow for real-time QR scan → lookup → respond)
- MCP server implementation and testing
- Prompt engineering for Thai language + shop context + guided flows

### Phase 5: Inventory & Purchase Tools (Month 9+)
- **Receiving interface:** Replace Airtable Interface for inventory receiving (or build into AI chat)
- **Purchase order creation:** Generate PO from low-stock products
- **Supplier price tracking:** Historical price trends per product per supplier

### Phase 6: Full Platform (Month 12+)
- **Customer portal:** Credit balance lookup, repair status tracking
- **Boot's repair interface:** Simplified view for Boot to update repair status
- **Mint's admin dashboard:** Cross-day/week/month analytics, margin tracking

---

## 12. Open Questions (Resolved + New)

### Resolved from Initial Spec

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Notification to Mint: email or LINE? | Email first (via Vercel serverless). LINE is a Phase 2 enhancement. |
| 2 | Historical correction? | Yes — Mai can select a past date (up to 3 days) on Screen 1. System checks if a record already exists and offers to overwrite. |
| 3 | Multiple submissions per day? | Yes — overwrite with confirmation. "บันทึกนี้มีอยู่แล้ว ต้องการแก้ไขหรือไม่? (A record already exists. Overwrite?)" |
| 4 | Variance threshold? | ±50 baht. Configurable via env var `VARIANCE_THRESHOLD`. |
| 5 | Airtable source for daily totals? | Sales table (`total_collected` or `total`) for cash sales. Delivery cash paid comes from the paper ledger, not Airtable. See §5.1. |
| 6 | Offline fallback? | If internet is down: Mai fills the paper form as usual. She can upload the photo the next day using the date picker. The dashboard will show yesterday's data retroactively. No special offline mode needed for v1. |
| 7 | Section C item-level detail? | Store as JSON in `section_c_detail` long-text field on the reconciliation record. Queryable enough for now. |
| 8 | Aed / flexible workers? | **Resolved: Option C — linked table.** `Daily Person Draws` table handles any number of people dynamically. See §5.2. |
| 9 | Airtable field names? | **Verified from CSV exports.** All field names confirmed in §5.1. |

### New Open Questions

| # | Question | Notes |
|---|----------|-------|
| 10 | **Sunday shop closure:** Is the shop closed on Sundays? Affects streak calculation (should Sundays count as "missed"?). | Need to confirm with Mai/Mint. |
| 11 | **Starting balance consistency:** Should the system check that today's starting_balance matches yesterday's actual_count? If not, flag it. | Recommended. Easy to implement — just compare. |
| 12 | **Image storage:** Where to store the ledger photos long-term? | Airtable attachment field on the reconciliation record for v1. Simple and queryable. |
| 13 | **Sales.total vs total_collected:** Some sales have `total_collected` blank (16/208). Is this a data quality issue or intentional? For reconciliation, should we use `total` when `total_collected` is missing? | Need to verify with Mint. Likely early data before the workflow was finalized. |
| 14 | **Expenses table empty:** Mai hasn't logged any expenses yet. Should the close-out dashboard show this prominently as a reminder to start? | Yes — the dimmed "0 entries" card serves this purpose. |
| 15 | **COGS accuracy:** Product cost data covers ~80% of SKUs (1,966/2,473). For products without cost data, should we estimate (use average margin) or show "incomplete" flag? | Use average margin for missing, flag the estimate. |

---

## 13. The Path to a Live P&L / Cash Flow Dashboard

### What We Have Now

The `Family_Business_PL_v2.2.xlsx` workbook models cash flow monthly with hardcoded assumptions:
- **Assumptions tab:** Revenue (฿130K/mo base), gross margin (30%), opex broken down by person and category
- **Auto_Monthly tab:** Monthly projection — Gross Sales → Inventory Usage → Gross Cash → Opex → Obligations → Owner Draws → Net Cash
- All values are budget/projected — no actuals yet

Meanwhile, the Airtable base now has **real transactional data:**
- **208 sales** (Apr 25 – May 2, 2026) — with payment method, amounts, product-level detail
- **13 purchases** with supplier, amounts, payment method
- **10 repair jobs** with pricing, parts costs, labor charges
- **2,473 products** with cost and sell prices (1,966 have cost data)
- **0 expenses** (table ready but unused)
- **544 customers** imported from bank statements
- **0 daily cash reconciliation records** (tables not yet created)

### What's Missing for a True P&L

| P&L Line Item | Status | Source |
|---|---|---|
| **Revenue (Gross Sales)** | ✅ Available | Sales table — SUM of `total` or `total_collected` |
| **COGS (Cost of Goods Sold)** | ⚠️ Partially available | Sale Line Items → Products → `last_known_cost_baht` × quantity. ~80% of products have cost data. |
| **Gross Profit** | ⚠️ Computable | Revenue - COGS. Accuracy depends on product cost coverage. |
| **Direct Business Expenses** | ❌ Not yet captured | Shipping, gasoline, tools — need Mai to start using the Expenses form. |
| **Indirect Business Expenses** | ❌ Not captured | Cell phone, Airtable subscription — these are fixed monthly costs known from Assumptions tab. Could be auto-populated. |
| **Owner Draws (Salary + Food)** | 🔜 Will be captured | The Daily Cash Reconciliation + Person Draws tables will capture this daily. Currently paper-only. |
| **Utilities** | ❌ Not captured | Water, electricity, internet — known monthly amounts from Assumptions tab. |
| **Loan Payments** | ❌ Not captured | SCB overdraft interest (฿1,500/mo). Known fixed amount. |
| **Farm Subsidy** | ❌ Not captured | ฿3,000/mo to Pinit's farm. Known fixed amount. |

### The Strategy: Hybrid Approach

**Airtable captures transactions** — individual sales, purchases, expenses, draws. This is where Mai enters data daily. Airtable is the source of truth for "what happened."

**The web platform (this app) computes and displays the P&L** — pulling daily/weekly/monthly aggregates from Airtable and combining with fixed assumptions (from config / env vars mirroring the Assumptions tab). This is where Mint and Ari see the numbers.

**Google Sheets remains the strategic planning tool** — the 10-year projection, scenarios, sensitivity analysis. The web dashboard doesn't replace this; over time it feeds real actuals into it.

### What to Build (7-Day Target)

The daily close-out dashboard already fetches today's sales, purchases, expenses, and draws. Extending it to show a **running daily P&L** requires:

1. **Sum revenue by day** from Sales table (already queried)
2. **Estimate COGS** by joining Sale Line Items → Products → `last_known_cost_baht` × quantity
3. **Sum expenses by day** from Expenses table (already queried, currently empty)
4. **Sum draws by day** from Daily Person Draws table (will exist once close-out system is live)
5. **Add fixed monthly costs** as a daily proration (monthly ÷ days in month) — from config

This gives a daily **Cash Flow Summary** as a new section on the dashboard:

```
Revenue:          ฿ 12,450
- Est. COGS:      ฿  8,715   (based on product costs)
= Gross Profit:   ฿  3,735   (30% margin)
- Expenses:       ฿    450
- Draws:          ฿  2,210
- Fixed costs:    ฿  1,320   (daily proration of monthly fixed)
= Net Cash:       ฿   -245
```

### Implementation Priority

For the 7-day target:

1. **Days 1-3:** Core close-out system (upload → extract → dashboard → reconcile → submit). This is the foundation.
2. **Days 4-5:** COGS calculation (join sale line items to product costs). Add daily revenue/COGS/gross-profit card to dashboard.
3. **Day 6:** Fixed costs config + daily proration display. Monthly rollup page.
4. **Day 7:** Monthly rollup view — current month cumulative P&L, Actuals vs Budget comparison (budget from Assumptions tab values).

The monthly rollup page:

```
พินิจเจริญยนต์ — พ.ค. 2569 (May 2026)
Days completed: 2/31

                    Actual      Budget     Δ
Revenue:           ฿ 25,300    ฿  8,387   +201%
Est. COGS:         ฿ 17,710    ฿  5,871   
Gross Profit:      ฿  7,590    ฿  2,516   +202%
Gross Margin:         30.0%       30.0%
Expenses:          ฿    900    ฿    213   
Owner Draws:       ฿  4,420    ฿  2,210
Fixed Costs:       ฿  2,640    ฿  2,640
Net Cash:          ฿   -370    ฿ -2,547   better
```

This is the "blow them away" dashboard. Going from zero financial visibility to seeing real daily numbers compared against budget — that's transformative.

---

## 14. Build Plan

### Prerequisites (Before Coding)

1. **Create Airtable tables** — create `Daily Cash Reconciliation` and `Daily Person Draws` tables per §5.2. Set up the link field, rollup fields, and formula fields.
2. **Get Airtable API key** — create a Personal Access Token with read/write access to the base. Scopes needed: `data.records:read`, `data.records:write`, `schema.bases:read`.
3. **Get Anthropic API key** — from console.anthropic.com. The Max plan includes API access.
4. **Test extraction quality** — take 3-5 photos of filled-out ledger forms and test Claude Sonnet's extraction accuracy via the API before building the full pipeline. This validates the prompt and Zod schema.
5. **Set up Vercel project** — create a new project, connect to GitHub repo, add env vars.

### Build Order (7-Day Plan)

**Days 1-3: Core Close-Out System**

| Step | What | Est. Time |
|------|------|-----------|
| 1 | Scaffold Next.js project, Tailwind, shadcn/ui, Vercel AI SDK | 30 min |
| 2 | Build Screen 1 (Upload page) — static UI, camera input, image preview | 1 hr |
| 3 | Build `/api/extract` — Claude vision integration with Zod schema | 1 hr |
| 4 | Build `/api/activity` — Airtable queries for today's data | 1 hr |
| 5 | Build Screen 2 (Dashboard) — activity grid + reconciliation display | 2 hr |
| 6 | Build reconciliation logic (`lib/reconciliation.ts`) | 30 min |
| 7 | Build extracted data viewer/editor component | 1 hr |
| 8 | Build `/api/reconcile` — write to Airtable (reconciliation + person draws) | 1 hr |
| 9 | Build `/api/streak` + streak display component | 30 min |
| 10 | Build Screen 3 (Confirmation + Streak) | 30 min |
| 11 | Add animations (count-up, card entrance, confetti) | 1 hr |
| 12 | Add PIN auth middleware | 30 min |
| 13 | PWA manifest + icons | 15 min |
| 14 | Deploy to Vercel, test on Mai's Android phone | 1 hr |

**Days 4-5: COGS + Daily P&L**

| Step | What | Est. Time |
|------|------|-----------|
| 15 | Build `/api/cogs` — join Sale Line Items → Products → cost × qty | 1.5 hr |
| 16 | Add daily P&L section to Screen 2 dashboard | 1 hr |
| 17 | Fixed costs config (env vars or config file matching Assumptions tab) | 30 min |
| 18 | Daily proration display (monthly fixed ÷ days in month) | 30 min |

**Day 6: Monthly Rollup**

| Step | What | Est. Time |
|------|------|-----------|
| 19 | Build `/monthly` page — cumulative month-to-date P&L | 2 hr |
| 20 | Budget comparison (hardcode Base scenario values from Assumptions tab) | 1 hr |
| 21 | Navigation between daily close-out and monthly view | 30 min |

**Day 7: Polish + Launch**

| Step | What | Est. Time |
|------|------|-----------|
| 22 | End-to-end testing with real data on Mai's phone | 1.5 hr |
| 23 | Write Mai-facing usage instructions (Thai, with screenshots) | 1 hr |
| 24 | Fix bugs from testing | 1 hr |
| 25 | Launch — walk Mai through first use via LINE video call | 30 min |

**Total: ~22 hours across 7 days**

### Testing Checklist

- [ ] Photo upload works on Mai's Android phone (Chrome)
- [ ] Photo upload works on Mai's iPad (Safari — may need testing)
- [ ] Claude extraction returns correct values from a real filled-out form
- [ ] Extraction handles empty cells correctly (returns 0, not null)
- [ ] Extraction handles Thai numerals (๐-๙)
- [ ] Activity data fetches correctly from all Airtable tables
- [ ] Reconciliation math is correct (verify against manual calculation)
- [ ] Edit mode on extracted data works and recalculates live
- [ ] Submit writes correct record to Airtable
- [ ] Variance notification sends to Mint
- [ ] Streak calculation handles weekends correctly
- [ ] PIN auth works and persists via cookie
- [ ] PWA installs correctly on Android home screen
- [ ] App loads in < 2 seconds on Thai mobile data

---

*Created: May 2026*
*Author: Ari + Claude*
*Supersedes: cash_reconciliation_system_spec.md, daily_cash_reconciliation_schema.md*
*Airtable field names verified from CSV exports: May 2, 2026*
*Dependencies: Airtable base (live), Anthropic API key, Vercel account*
*Next step: Create the two new Airtable tables, then begin build*
