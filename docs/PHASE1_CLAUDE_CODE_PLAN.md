# Phase 1: AI Chat — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** It contains everything needed to build Phase 1 of the Pinit AI Chat interface.

---

## What We're Building

Add a `/chat` route to the existing `pinit-daily` Next.js 14 app. This is an AI-powered chat where Mai (Thai-speaking shop operator) can look up products, check today's sales, view repair jobs, and search customers — all in conversational Thai.

Phase 1 is **read-only** — no writes to Airtable. Just the chat UI, streaming responses, and 4 lookup tools.

---

## Pre-Build Checklist

Before writing any code, verify these exist in the repo:

```bash
# Check existing files
cat lib/airtable.ts        # Should have selectRecords, createRecord, createRecords, updateRecord
cat lib/constants.ts       # Should have TABLES, FIELDS, PAYMENT_METHODS, etc.
cat package.json           # Check current dependencies
```

Install new dependencies:

```bash
npm install ai @ai-sdk/anthropic
```

The `ai` package is the Vercel AI SDK. `@ai-sdk/anthropic` is the Anthropic provider. No other new deps needed for Phase 1.

---

## Files to Create (6 files)

```
app/
  chat/
    page.tsx                    # Chat UI with useChat, context buttons, message renderer
  api/
    chat/
      route.ts                  # POST handler: streamText + tools + system prompt
lib/
  chat-system-prompt.ts         # System prompt string
  chat-tools.ts                 # 4 tool definitions + their execute functions
components/
  chat/
    context-buttons.tsx         # 6 action buttons at top of chat
    tool-result-card.tsx        # Renders tool results as styled cards
```

---

## File 1: `lib/chat-system-prompt.ts`

Export a single string constant. This is the system prompt for Claude.

```typescript
export const SYSTEM_PROMPT = `คุณคือ "น้องพินิจ" (Nong Pinit) — ผู้ช่วย AI ของร้านพินิจเจริญยนต์ ร้านอะไหล่รถจักรยานยนต์ในจังหวัดศรีสะเกษ

You are the AI assistant for Pinit Charoen Yon (พินิจเจริญยนต์), a motorcycle and small engine parts shop in Si Sa Ket, Thailand.

LANGUAGE RULES:
- Default to Thai for all responses
- If the user writes in English, respond in English
- Always use Thai currency format: ฿1,234
- Use Thai date format: วันนี้ = today's date

USERS:
- Mai (ใหม่) — shop operator. Thai only. Keep responses short and action-oriented.
- Mint (มิ้นท์) — business advisor, bilingual. Provide detailed answers with numbers.
- Boot (บู๊ท) — mechanic. Limited interaction, repair status only.

SHOP CONTEXT:
- Sells motorcycle parts, small engine parts, oils, chains, sprockets, bearings, brake pads, etc.
- ~2,500 products in inventory with QR-coded labels
- Typical daily revenue: ฿3,000-15,000
- Payment methods: เงินสด (Cash), โอน (Transfer), เครดิต (Credit)

BEHAVIOR:
- When a user taps a context button, you receive a structured prompt. Follow the guided flow.
- For lookups: show the product name, SKU, current stock, sell price, and repair price if applicable.
- Present options as numbered choices or tappable labels when appropriate.
- If a tool call fails, explain the error in simple Thai and suggest what to do.
- For questions about today's sales, use the get_today_sales tool.
- For repair job questions, use the get_repair_jobs tool.
- For customer lookups, use the search_customer tool.

IMPORTANT:
- This is Phase 1 — read-only. You cannot create, update, or delete records yet.
- If a user asks to log a sale, purchase, expense, or repair, tell them this feature is coming soon (เร็วๆ นี้).
- The 🌙 ปิดร้าน button should redirect to the close-out page, not handled in chat.
`;
```

---

## File 2: `lib/chat-tools.ts`

This file defines 4 tools using the Vercel AI SDK `tool()` function. Each tool has a description, parameters (zod schema), and an `execute` function that calls Airtable.

**CRITICAL RULES for Airtable queries:**
1. All fetch calls MUST use `cache: 'no-store'` (Next.js caches by default)
2. Thai text in `filterByFormula` requires manual URL encoding — do NOT use `URLSearchParams` for the formula
3. `LOWER()` breaks Thai text in Airtable — only use it for Latin characters
4. The `sku` field is a barcode type — `LOWER()` doesn't work on it
5. Reuse the existing `selectRecords` from `lib/airtable.ts`

### Tool 1: `lookup_product`

**Purpose:** Search products by name (Thai), SKU, or partial match.

**Parameters:**
- `query: string` — the search term

**Airtable query logic** (copy the search pattern from the existing `/api/inventory/search` route):
- Split query on spaces into words
- For each word:
  - If word contains Latin characters: `OR(SEARCH("word", LOWER({display_name})), SEARCH("word", LOWER({original_name})), SEARCH("word", {sku}))`
  - If word is Thai-only: `OR(SEARCH("word", {display_name}), SEARCH("word", {original_name}), SEARCH("word", {sku}))`
- AND all word clauses together
- Fields to return: `sku`, `display_name`, `current_stock`, `last_known_cost_baht`, `last_known_sell_price_baht`, `repair_price_total`, `category`, `product_photo`
- Table: `Products` (use the constant from `lib/constants.ts`)
- Max 10 results
- Sort by `display_name` asc

**Return shape:**
```typescript
{
  found: number;
  products: Array<{
    id: string;          // Airtable record ID
    sku: string;
    name: string;        // display_name
    stock: number;       // current_stock
    cost: number;        // last_known_cost_baht
    sellPrice: number;   // last_known_sell_price_baht
    repairPrice: number | null; // repair_price_total (null if 0 or missing)
    category: string;
    photoUrl: string | null;
  }>;
}
```

### Tool 2: `get_today_sales`

**Purpose:** Get a summary of today's sales.

**Airtable query logic:**
- Table: `Sales`
- Filter: `IS_SAME({sale_date}, TODAY(), 'day')`
- Fields: `sale_id`, `sale_date`, `transaction_type`, `payment_method`, `total`, `total_collected`, `display_name (from product) (from line_items)`, `created_by`
- No parameters needed

**Return shape:**
```typescript
{
  date: string;          // today's date YYYY-MM-DD
  count: number;         // total number of sales
  totalRevenue: number;  // sum of all sale totals
  byPaymentMethod: Record<string, { count: number; total: number }>;
  byType: Record<string, { count: number; total: number }>;
  recentSales: Array<{
    saleId: number;
    type: string;
    paymentMethod: string;
    total: number;
    items: string[];     // product names from lookup
  }>;
}
```

**Compute the aggregates in JavaScript** after fetching all today's records. Sum totals, group by payment_method and transaction_type.

### Tool 3: `get_repair_jobs`

**Purpose:** List active repair jobs (not paid/cancelled).

**Parameters:**
- `status_filter?: string` — optional, e.g. "กำลังซ่อม (In Progress)"

**Airtable query logic:**
- Table: `Repair Jobs`
- Default filter (no status_filter): `AND({status} != 'จ่ายแล้ว (Paid)', {status} != 'ยกเลิก (Cancelled)')`
- If status_filter provided: `{status} = 'status_filter_value'`
- Fields: `job_id`, `customer`, `vehicle`, `vehicle_description`, `license_plate`, `status`, `job_type`, `quoted_price`, `total_collected`, `effort_tier`, `labor_charge`, `notes`, `quoted_date`, `parts_cost_total`, `parts_sell_total`
- Sort by `quoted_date` desc

**Return shape:**
```typescript
{
  count: number;
  jobs: Array<{
    id: string;           // Airtable record ID
    jobId: number;
    customer: string;     // customer name (first linked record name)
    vehicle: string;      // vehicle name
    vehicleDescription: string;
    licensePlate: string;
    status: string;
    jobType: string[];
    quotedPrice: number;
    totalCollected: number;
    effortTier: string;
    laborCharge: number;
    quotedDate: string;
    partsCostTotal: number;
    partsSellTotal: number;
    notes: string;
  }>;
}
```

**Note on linked record fields:** `customer` and `vehicle` are `multipleRecordLinks` fields. Airtable returns them as arrays of record IDs like `["recXXX"]`. To get the customer name, you need the `customer` field to return the primary field value. In the Airtable API, linked record fields return record IDs, not names. You'll need to either:
- Use `cellValuesByFieldId` and handle the linked record format, OR
- Add a formula/lookup field in the return fields like the existing `card_summary` field which already contains customer name

**Simplest approach:** Include `card_summary` in the fields list — it's a formula field that already contains `customer | license_plate \n job_types \n tier | hours | price`. Parse it, or just return it as a display string.

Alternatively, if the linked record returns just IDs, do a secondary lookup on the Customers table. But start with `card_summary` for v1.

### Tool 4: `search_customer`

**Purpose:** Search customers by name or phone.

**Parameters:**
- `query: string` — name or phone number

**Airtable query logic:**
- Table: `Customers`
- Customer table field names (from schema): `Name` (primary field, type singleLineText), `Phone` (phoneNumber), `credit_balance` (rollup)
- Filter: `OR(SEARCH("query", {Name}), SEARCH("query", {Phone}))`
- For Thai text in the query: no `LOWER()`. For Latin text: wrap with `LOWER()` on the `{Name}` field only
- Fields: `Name`, `Phone`, `credit_balance`, `Sales`, `Repair Jobs`
- Max 10 results

**Return shape:**
```typescript
{
  found: number;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    creditBalance: number;
    salesCount: number;      // length of Sales linked array
    repairJobsCount: number; // length of Repair Jobs linked array
  }>;
}
```

### Putting it together in `chat-tools.ts`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { selectRecords } from './airtable';
// import table/field constants from constants.ts

export const chatTools = {
  lookup_product: tool({
    description: 'ค้นหาสินค้าจากชื่อ, SKU หรือคำค้นบางส่วน (Search products by name, SKU, or partial match)',
    parameters: z.object({
      query: z.string().describe('ชื่อสินค้า, SKU, หรือคำค้น'),
    }),
    execute: async ({ query }) => {
      // ... Airtable query logic described above
    },
  }),

  get_today_sales: tool({
    description: 'ดูสรุปยอดขายวันนี้ — จำนวน, ยอดรวม, แยกตามวิธีชำระเงิน (Get today\'s sales summary)',
    parameters: z.object({}),
    execute: async () => {
      // ... Airtable query logic described above
    },
  }),

  get_repair_jobs: tool({
    description: 'ดูรายการงานซ่อมที่ยังไม่เสร็จ หรือกรองตามสถานะ (List active repair jobs)',
    parameters: z.object({
      status_filter: z.string().optional().describe('กรองตามสถานะ เช่น กำลังซ่อม (In Progress)'),
    }),
    execute: async ({ status_filter }) => {
      // ... Airtable query logic described above
    },
  }),

  search_customer: tool({
    description: 'ค้นหาลูกค้าจากชื่อหรือเบอร์โทร (Search customers by name or phone)',
    parameters: z.object({
      query: z.string().describe('ชื่อลูกค้าหรือเบอร์โทร'),
    }),
    execute: async ({ query }) => {
      // ... Airtable query logic described above
    },
  }),
};
```

---

## File 3: `app/api/chat/route.ts`

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { SYSTEM_PROMPT } from '@/lib/chat-system-prompt';
import { chatTools } from '@/lib/chat-tools';

export const maxDuration = 60; // Vercel serverless timeout

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    maxSteps: 5, // Allow up to 5 tool calls in one turn
  });

  return result.toDataStreamResponse();
}
```

**Important:** `maxSteps: 5` allows Claude to call multiple tools in sequence (e.g., look up a product, then check stock). Without this, tool results won't be processed automatically.

---

## File 4: `components/chat/context-buttons.tsx`

A row of 6 buttons that inject pre-written prompts into the chat.

```typescript
'use client';

interface ContextButtonsProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const BUTTONS = [
  { emoji: '📗', label: 'ขาย', prompt: 'ต้องการบันทึกการขาย' },
  { emoji: '📘', label: 'ซื้อ', prompt: 'ต้องการบันทึกการซื้อ' },
  { emoji: '📙', label: 'ซ่อม', prompt: 'ต้องการดูงานซ่อม' },
  { emoji: '💸', label: 'จ่าย', prompt: 'ต้องการบันทึกค่าใช้จ่าย' },
  { emoji: '📦', label: 'สต็อก', prompt: 'ต้องการนับสต็อก' },
  { emoji: '🌙', label: 'ปิดร้าน', prompt: '__CLOSE_SHOP__' }, // Special: redirects
];
```

**Design:**
- Horizontal scrollable row
- Each button: rounded-lg, bg-slate-800, border border-slate-700, text-sm
- Color-code: ขาย=green, ซื้อ=blue, ซ่อม=orange, จ่าย=red, สต็อก=purple, ปิดร้าน=slate
- When tapped, call `onSend(prompt)` which appends it as a user message
- ปิดร้าน is special: `router.push('/')` instead of sending a message

---

## File 5: `components/chat/tool-result-card.tsx`

Renders tool results as styled cards inside the chat messages.

**Detection logic:** Check the message for tool invocations. In the Vercel AI SDK, messages with tool calls have `toolInvocations` array. Each invocation has `toolName`, `args`, `state`, and `result`.

**Card types:**

### ProductCard (from `lookup_product`)
```
┌──────────────────────────────────┐
│ 📦 หัวเทียน BP8ES               │
│ SKU: PD69000071                  │
│ สต็อก: 28 ชิ้น                   │
│ ราคาขาย: ฿35  ต้นทุน: ฿18       │
│ ราคาซ่อม: ฿55 (if applicable)   │
└──────────────────────────────────┘
```
- bg-slate-800, border-l-4 border-sky-400
- Show repair price only if non-null/non-zero
- If multiple products returned, render a list of compact cards

### SalesSummaryCard (from `get_today_sales`)
```
┌──────────────────────────────────┐
│ 📊 สรุปยอดขายวันนี้              │
│ จำนวน: 12 รายการ                 │
│ รวม: ฿4,250                      │
│ เงินสด: ฿3,100 | โอน: ฿1,150    │
└──────────────────────────────────┘
```
- bg-slate-800, border-l-4 border-green-400

### RepairJobCard (from `get_repair_jobs`)
```
┌──────────────────────────────────┐
│ 📙 งาน #15 — น้าปรือ            │
│ 🏍 Wave 125i                     │
│ สถานะ: กำลังซ่อม                 │
│ ราคาเสนอ: ฿2,500                │
└──────────────────────────────────┘
```
- bg-slate-800, border-l-4 border-orange-400
- Status badge: color based on status
  - รับงาน = blue, กำลังซ่อม = yellow, เสร็จแล้ว = green

### CustomerCard (from `search_customer`)
```
┌──────────────────────────────────┐
│ 👤 น้าปรือ                       │
│ 📱 089-123-4567                  │
│ ยอดเครดิต: ฿1,200               │
│ ซื้อ 5 ครั้ง | ซ่อม 2 ครั้ง      │
└──────────────────────────────────┘
```
- bg-slate-800, border-l-4 border-purple-400

---

## File 6: `app/chat/page.tsx`

The main chat page.

```typescript
'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContextButtons } from '@/components/chat/context-buttons';
import { ToolResultCard } from '@/components/chat/tool-result-card';
```

### Layout Structure

```
┌─────────────────────────────────────┐
│  🤖 น้องพินิจ                       │  ← Header (fixed top)
│  Pinit AI Assistant                 │
├─────────────────────────────────────┤
│  [📗 ขาย] [📘 ซื้อ] [📙 ซ่อม]     │  ← Context buttons (sticky)
│  [💸 จ่าย] [📦 สต็อก] [🌙 ปิดร้าน] │
├─────────────────────────────────────┤
│                                     │
│  Messages area (scrollable)         │  ← flex-1, overflow-y-auto
│                                     │
│  Bot: สวัสดีค่ะ! วันนี้จะทำอะไรดี? │
│                                     │
├─────────────────────────────────────┤
│  ┌────────────────────────┬───┐     │  ← Input (fixed bottom)
│  │ พิมพ์ข้อความ...        │ ➤ │     │
│  └────────────────────────┴───┘     │
└─────────────────────────────────────┘
```

### Key Implementation Details

**useChat hook:**
```typescript
const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
  api: '/api/chat',
  initialMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'สวัสดีค่ะ! 🤖 น้องพินิจพร้อมช่วยแล้วค่ะ\nวันนี้จะทำอะไรดีคะ?',
    },
  ],
});
```

**Context button handler:**
```typescript
const handleContextButton = (prompt: string) => {
  if (prompt === '__CLOSE_SHOP__') {
    router.push('/');
    return;
  }
  append({ role: 'user', content: prompt });
};
```

**Message rendering:**
```typescript
{messages.map((m) => (
  <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
    <div className={m.role === 'user'
      ? 'bg-sky-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]'
      : 'bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[85%]'
    }>
      {/* Render text content */}
      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}

      {/* Render tool results */}
      {m.toolInvocations?.map((invocation) => (
        <ToolResultCard
          key={invocation.toolCallId}
          toolName={invocation.toolName}
          state={invocation.state}
          result={invocation.state === 'result' ? invocation.result : undefined}
        />
      ))}
    </div>
  </div>
))}
```

**Auto-scroll to bottom:**
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Input form:**
```typescript
<form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-slate-700 bg-slate-900">
  <input
    value={input}
    onChange={handleInputChange}
    placeholder="พิมพ์ข้อความ..."
    className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400"
    disabled={isLoading}
  />
  <button
    type="submit"
    disabled={isLoading || !input.trim()}
    className="bg-sky-500 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
  >
    ➤
  </button>
</form>
```

### Design System (match existing app)

- **Background:** bg-slate-900
- **Cards:** bg-slate-800
- **Accent:** sky-400 / sky-500
- **Text:** text-white (primary), text-slate-400 (secondary)
- **Font:** Sarabun (Thai), sans-serif
- **Container:** max-w-md mx-auto, h-screen, flex flex-col
- **Mobile-first:** full height, no horizontal scroll

### Loading State

While Claude is thinking (isLoading = true), show a typing indicator:
```
┌──────────────────────┐
│ 🤖 กำลังคิด...      │  ← Pulsing dots animation
└──────────────────────┘
```

---

## Middleware Update

The existing middleware likely blocks `/chat` (requires PIN). Add `/chat` to the protected paths, or if it's already using a cookie-based auth check, just verify `/chat` works when authenticated.

Check `middleware.ts` — ensure the `/chat` route is accessible after PIN auth, and that `/api/chat` is in the `PUBLIC_PATHS` (API routes should not redirect to PIN page).

---

## Testing Checklist

After building, verify each item:

1. **`/chat` loads** — context buttons visible, welcome message shown
2. **Type "หัวเทียน" → product results** — lookup_product fires, ProductCards render
3. **Type "PD69" → SKU search works** — partial SKU match returns results
4. **Tap 📙 ซ่อม → repair jobs list** — get_repair_jobs fires, RepairJobCards render
5. **Type "วันนี้ขายไปเท่าไหร่" → sales summary** — get_today_sales fires, SalesSummaryCard renders
6. **Type "ค้นหาลูกค้า น้าปรือ" → customer results** — search_customer fires
7. **Tap 📗 ขาย → AI says "coming soon"** — write operations not yet available
8. **Tap 🌙 ปิดร้าน → redirects to `/`** — not handled in chat
9. **Streaming works** — text appears incrementally, not all at once
10. **Thai text renders correctly** — no encoding issues
11. **Mobile layout** — full height, no overflow, input at bottom
12. **Tool error handling** — if Airtable is down, show Thai error message

---

## Common Pitfalls (from build history)

| Pitfall | Prevention |
|---------|-----------|
| Stale Airtable data | Every `selectRecords` call uses `cache: 'no-store'` — this is already in `lib/airtable.ts` but verify |
| Thai text in filterByFormula | Build the formula string manually, then encode: `encodeURIComponent(formula)`. Do NOT use `URLSearchParams` for the formula value |
| LOWER() breaks Thai | Never `LOWER()` on Thai text. Only on Latin strings. Check each word with `/[a-zA-Z]/.test(word)` |
| SKU field is barcode type | Always `SEARCH("term", {sku})` without `LOWER()` |
| API route auth | Ensure `/api/chat` is in `PUBLIC_PATHS` in middleware.ts so it doesn't redirect to PIN |
| useChat message format | Vercel AI SDK expects `messages` array with `role` and `content`. Tool results come in `toolInvocations` property |
| maxSteps not set | Without `maxSteps` in `streamText`, Claude won't auto-process tool results. Set to 5. |

---

## Environment Variables

No new env vars needed. The chat uses existing:
- `ANTHROPIC_API_KEY` — already set for Claude Vision extraction
- `AIRTABLE_API_KEY` — already set
- `AIRTABLE_BASE_ID` — already set

---

## After Phase 1 Works

Phase 2 adds write operations: `create_sale`, `create_expense`, `create_purchase`, `update_repair_status`. Each will require a confirmation flow where Claude summarizes the action and waits for user confirmation before writing.

Phase 3 adds QR scanner (html5-qrcode) and label printing integration.

Phase 4 adds analytics tools (margin analysis, slow movers, top sellers, cash flow).
