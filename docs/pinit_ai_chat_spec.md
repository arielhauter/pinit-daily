# Pinit AI Chat Interface — Full Build Spec

> **Working title:** พินิจ AI — ผู้ช่วยร้านอะไหล่ (Pinit AI — Auto Parts Shop Assistant)
> **App:** New route at `/chat` in existing `pinit-daily` Next.js app
> **Users:** Mai (shop operator, Thai-speaking), Mint (advisor, English/Thai), Boot (mechanic, limited interaction)
> **Platform:** Next.js 14 App Router + Vercel AI SDK + Anthropic Claude Sonnet 4.6 + Airtable REST API
> **Repo:** `pinit-daily` (same repo as close-out + inventory count systems, already deployed on Vercel)

---

## 1. What This Is

A single AI chat interface that replaces multiple separate forms and dashboards. Mai opens one app, taps a button or types/speaks, and the AI handles everything — logging sales, looking up products, checking repair status, answering business questions, printing labels.

The interface has three modes that blend seamlessly in a single chat UI:

1. **Button-guided flows** — structured data entry via tappable options (sale, purchase, expense, repair, stock count, close-out)
2. **Free-form chat** — Mai types or speaks in Thai to handle edge cases, ask questions, or do anything the buttons don't cover
3. **Oracle mode** — Mint asks business intelligence questions in English or Thai and gets answers from live Airtable data

The AI handles routing, data entry, lookups, edge cases, and analytics. Mai's mental model goes from "navigate a software system" to "talk to a helper who knows the shop."

---

## 2. Existing Infrastructure (Already Built)

The `pinit-daily` app already has:

### 2.1 Working Features
- **Daily close-out system** (`/` route) — camera upload → Claude Vision extraction → activity dashboard → Airtable write
- **Inventory count** (`/inventory` route) — search products, edit stock/prices, create new products, print labels
- **PIN auth** — 4-digit PIN with cookie-based session
- **Vercel Blob** — photo upload storage
- **Label API** — Render.com service at `https://pinit-label-api.onrender.com/label/{sku}/{size}?name=...&price=...&repair=...`

### 2.2 Existing Airtable Client (`lib/airtable.ts`)
- `selectRecords(table, params)` — paginated read with filterByFormula, fields, sort
- `createRecord(table, fields)` — single record create
- `createRecords(table, records[])` — batch create (up to 10)
- `updateRecord(table, recordId, fields)` — single record update
- All use `cache: 'no-store'` to prevent stale data

### 2.3 Existing Constants (`lib/constants.ts`)
All Airtable table names and field names are already defined and verified:
- TABLES: Sales, Purchases, Purchase Line Items, Repair Jobs, Expenses, Products, Daily Cash Reconciliation, Daily Person Draws, Customers, Customer Credit, Suppliers, Vehicles, Sale Line Items
- FIELDS: Complete field mappings for each table
- PAYMENT_METHODS: เงินสด (Cash), โอน (Transfer), เครดิต (Credit), Shopee (pre-paid)
- REPAIR_STATUSES: รับงาน (Quoting), กำลังซ่อม (In Progress), เสร็จแล้ว (Complete), จ่ายแล้ว (Paid)
- NAME_MAP: Thai name → normalized English name mapping

### 2.4 UI Design System
- Dark theme (slate-900 bg, slate-800 cards, sky-400 accent)
- Thai font: Sarabun
- Mobile-first (max-w-md container)
- Thai-primary labels with English subtitles
- Toast notification system
- Color-coded activity cards (green=sales, blue=purchases, orange=repairs, etc.)

---

## 3. Technical Architecture

### 3.1 Vercel AI SDK — `useChat` + Tool Calling

Use the Vercel AI SDK's `useChat` hook on the frontend and tool-calling on the backend. This is simpler than `streamUI` and gives us:
- Streaming text responses
- Tool calls that execute server-side (Airtable reads/writes)
- Tool results returned inline in the conversation
- Message history maintained automatically

```
┌─────────────────────────────────────┐
│  Frontend: /chat page               │
│  useChat() hook                     │
│  Context buttons inject prompts     │
│  QR scanner injects SKU            │
│  Renders tool results as cards     │
└──────────────┬──────────────────────┘
               │ POST /api/chat
               ↓
┌─────────────────────────────────────┐
│  Backend: /api/chat/route.ts        │
│  streamText() with tools            │
│  Claude Sonnet 4.6                  │
│  System prompt (Thai shop context)  │
│  18 Airtable tools defined         │
└──────────────┬──────────────────────┘
               │ Tool execution
               ↓
┌─────────────────────────────────────┐
│  lib/airtable.ts                    │
│  Existing CRUD functions            │
│  + New business logic helpers       │
└─────────────────────────────────────┘
```

### 3.2 Why Not MCP?

The spec originally called for an MCP server. For v1, we skip MCP and define tools directly in the API route using the Vercel AI SDK's `tool()` function. Reasons:
- Simpler to build and debug
- No separate server to deploy
- Tools run as serverless functions alongside the chat route
- Can migrate to MCP later if needed

### 3.3 Project Structure (New Files)

```
app/
  chat/
    page.tsx                    # Chat UI — useChat, context buttons, message renderer
  api/
    chat/
      route.ts                  # POST: streamText with tools + system prompt
lib/
  chat-tools.ts                 # All 18 tool definitions
  chat-system-prompt.ts         # System prompt for Claude
  chat-tool-handlers.ts         # Business logic for each tool (Airtable operations)
components/
  chat/
    message-bubble.tsx          # Single message — renders text + tool result cards
    context-buttons.tsx         # Top action buttons (Sale, Purchase, etc.)
    tool-result-cards.tsx       # React components for each tool result type
    qr-scanner.tsx              # Camera-based QR code scanner
    chat-input.tsx              # Text input + send button + QR trigger
```

---

## 4. System Prompt

The system prompt establishes Claude as a shop assistant who speaks Thai by default and can switch to English for Mint. It must be highly specific about the Airtable schema so tool calls produce correct data.

```
คุณคือ "น้องพินิจ" (Nong Pinit) — ผู้ช่วย AI ของร้านพินิจเจริญยนต์ ร้านอะไหล่รถจักรยานยนต์ในจังหวัดศรีสะเกษ

You are the AI assistant for Pinit Charoen Yon (พินิจเจริญยนต์), a motorcycle and small engine parts shop in Si Sa Ket, Thailand.

LANGUAGE RULES:
- Default to Thai for all responses
- If the user writes in English, respond in English
- Always use Thai currency format: ฿1,234
- Use Thai date format: 3 พ.ค. 2569 (but store dates as YYYY-MM-DD internally)

USERS:
- Mai (ใหม่) — shop operator. Manages daily sales, purchases, expenses. Thai only. Keep responses short and action-oriented for her.
- Mint (มิ้นท์) — business advisor, Mai's partner. Bilingual. Ask analytical questions. Provide detailed answers with numbers.
- Boot (บู๊ท) — mechanic. Only interacts for repair status updates.

SHOP CONTEXT:
- Sells motorcycle parts, small engine parts, oils, chains, sprockets, bearings, brake pads, etc.
- ~2,500 products in inventory with QR-coded labels
- Typical daily revenue: ฿3,000-15,000
- Payment methods: เงินสด (Cash), โอน (Transfer), เครดิต (Credit)
- Suppliers: รวมเจริญอะไหล่, คุณเฮงยานยนต์สุรินทร์, เชาว์เจริญอะไหล่, บ้านแพ้วดิสทริบิวชัน, Shopee

BEHAVIOR:
- When Mai taps a context button, you receive a structured prompt. Follow the guided flow — present options as tappable choices, minimize typing.
- For sales: always confirm product, quantity, price, and payment method before creating the record.
- For lookups: show the product name, SKU, current stock, sell price, and repair price if applicable.
- Never create, update, or delete records without explicit user confirmation.
- If a tool call fails, explain the error in simple Thai and suggest what to do.
- For analytics questions: query the data, compute the answer, and present it clearly with numbers.

IMPORTANT AIRTABLE RULES:
- Sale records need: sale_date, transaction_type, payment_method, total, line_items (linked to Sale Line Items)
- Sale Line Items need: product (linked to Products), quantity, unit_price, line_total
- After creating a sale, decrement the product's current_stock by the quantity sold
- Purchase records need: purchase_date, supplier, total, payment_method
- Expense records need: expense_date, category, amount, payment_method, description
- Repair jobs have statuses: รับงาน → กำลังซ่อม → เสร็จแล้ว → จ่ายแล้ว
- Product stock should never go negative — warn if a sale would cause this
```

---

## 5. Tool Definitions

### 5.1 Product & Inventory Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `lookup_product` | `query: string` (name, SKU, or partial) | Product details: name, SKU, stock, cost, sell price, repair price, photo URL | Uses existing search logic from inventory route. Multi-word Thai + case-insensitive English. |
| `get_product_stock` | `sku: string` | Stock level + recent sales count (7 days) | Single product lookup by exact SKU |
| `update_stock_count` | `record_id: string, new_count: number, counted_by: string` | Updated product record | Sets current_stock, has_been_counted=true, counted_date=today |
| `print_label` | `sku: string, size: '40x20' \| '40x30' \| '70x30' \| '70x50'` | Label URL to open | Constructs the Render.com label API URL with product details |

### 5.2 Sales Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `create_sale` | `transaction_type: 'product sale' \| 'simple repair', items: [{sku, quantity, unit_price, repair_price_override?}], payment_method: string, customer?: string, discount?: number, total_collected?: number, note?: string` | Sale record ID + confirmation details | Creates Sale → Sale Line Items (linked) → decrements product stock for each item. Computes total from line items minus discount. Payment methods: เงินสด (Cash), โอน (Transfer), เครดิต (Credit), หลายช่องทาง (Mixed). If Mixed, ask for split amounts. If เครดิต, require customer selection. `total_collected` allows override when actual amount differs from computed total. |
| `get_today_sales` | none | Today's sales summary: count, total, by payment method, top items | Queries Sales table filtered by today's date |
| `get_sales_summary` | `period: 'today' \| 'week' \| 'month' \| 'custom', start_date?: string, end_date?: string` | Revenue totals, payment method breakdown, item counts | Aggregate query with date filtering |

### 5.3 Purchase Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `create_purchase` | `supplier: string, items: [{product_name, quantity, unit_cost}], payment_method: string, shipping_cost?: number, total_paid: number, note?: string` | Purchase record ID | Creates Purchase → Purchase Line Items. Payment methods: เงินสด (Cash), โอน (Transfer), บัตรเครดิต (Credit Card), Shopee (จ่ายล่วงหน้า) (pre-paid). Does NOT auto-increment stock (receiving is separate). |
| `get_purchase_summary` | `period: string, supplier?: string` | Purchase totals, by supplier breakdown | Aggregate query |

### 5.4 Expense Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `create_expense` | `expense_date: string, category: string, amount: number, payment_method: string, description: string, note?: string` | Expense record ID | Creates Expense record. Date defaults to today but can be overridden. Payment methods: เงินสด (Cash), โอน (Transfer), เครดิต (Credit), หลายช่องทาง (Mixed). |

### 5.5 Repair Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `create_repair_job` | `customer: string, vehicle: string, license_plate?: string, job_type: string, effort_tier: 1-5, estimated_hours?: string, parts: [{sku, quantity}]?, labor_charge?: number, quoted_price?: number, note?: string` | Repair job record ID | Creates Repair Job with status = รับงาน (Quoting). Links to customer + vehicle (creates if new). Effort tiers: Tier 1 งานเร็ว (Quick), Tier 2 งานปกติ (Standard), Tier 3 งานฝีมือ (Skilled), Tier 4 งานซับซ้อน (Complex), Tier 5 งานใหญ่ (Major). |
| `get_repair_jobs` | `status_filter?: string` | List of active repair jobs: customer, vehicle, status, quoted price | Queries Repair Jobs table, excludes จ่ายแล้ว (Paid) |
| `update_repair_status` | `job_id: string, new_status: string, payment_method?: string, total_collected?: number, notes?: string` | Updated repair record | Validates status transition: รับงาน → กำลังซ่อม → เสร็จแล้ว → จ่ายแล้ว. If → เสร็จแล้ว, sets completion_date. If → จ่ายแล้ว, requires payment_method + total_collected (triggers auto Sale record creation via Airtable automation). |
| `create_vehicle` | `name: string, brand?: string, vehicle_class?: string, engine_cc?: number, fuel_system?: string, notes?: string` | Vehicle record ID | Creates new vehicle record when customer brings a new vehicle |
| `create_customer` | `name: string, phone?: string` | Customer record ID | Creates new customer record |

### 5.6 Customer Tools

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `search_customer` | `query: string` | Customer matches: name, phone, credit balance | Searches Customers table |
| `create_customer_credit` | `customer_id: string, sale_id: string, amount: number` | Credit record ID | Creates Customer Credit record linked to customer and sale |

### 5.7 Analytics Tools (Oracle Mode)

| Tool | Parameters | Returns | Business Logic |
|------|-----------|---------|----------------|
| `get_margin_analysis` | `period: string, category?: string` | Revenue, COGS, gross profit, margin % | Joins Sales → Sale Line Items → Products (cost). Computes margin. |
| `get_slow_movers` | `days_threshold: number` (default 60) | Products with zero sales in N days but stock > 0, with cost tied up | Queries Products with stock > 0, cross-references Sales for last sale date |
| `get_top_sellers` | `period: string, metric: 'quantity' \| 'revenue', limit: number` | Top N products by quantity sold or revenue | Aggregate from Sale Line Items |
| `get_cash_flow_summary` | `period: 'daily' \| 'weekly' \| 'monthly'` | Revenue, purchases, expenses, draws, net cash flow | Aggregates across Sales, Purchases, Expenses, Daily Cash Reconciliation |

---

## 6. Frontend Design

### 6.1 Chat Page Layout

```
┌─────────────────────────────────────┐
│  🤖 น้องพินิจ                       │
│  Pinit AI Assistant                 │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📗 ขาย  📘 ซื้อ  📙 ซ่อม       ││
│  │ 💸 จ่าย  📦 สต็อก  🌙 ปิดร้าน  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ Messages ─────────────────────┐ │
│  │                                │ │
│  │  Bot: สวัสดีค่ะ ใหม่!          │ │
│  │  วันนี้จะทำอะไรดี?             │ │
│  │                                │ │
│  │  Mai: [taps 📗 ขาย]           │ │
│  │                                │ │
│  │  Bot: สแกน QR หรือพิมพ์ชื่อ?  │ │
│  │  [📷 สแกน QR] [⌨️ พิมพ์ชื่อ] │ │
│  │                                │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────┬───┬───┐ │
│  │ พิมพ์ข้อความ...        │📷│ ➤ │ │
│  └────────────────────────┴───┴───┘ │
└─────────────────────────────────────┘
```

### 6.2 Context Buttons

The buttons inject a pre-written prompt into the chat as if the user typed it:

| Button | Injected Prompt | Triggers |
|--------|----------------|----------|
| 📗 ขาย (Sale) | `ต้องการบันทึกการขาย` | Sale guided flow |
| 📘 ซื้อ (Purchase) | `ต้องการบันทึกการซื้อ` | Purchase guided flow |
| 📙 ซ่อม (Repair) | `ต้องการดูงานซ่อม` | Repair jobs list |
| 💸 จ่าย (Expense) | `ต้องการบันทึกค่าใช้จ่าย` | Expense guided flow |
| 📦 สต็อก (Stock) | `ต้องการนับสต็อก` | Stock count flow with QR scanner |
| 🌙 ปิดร้าน (Close) | `ต้องการปิดร้าน` | Redirects to existing close-out page |

### 6.3 Tool Result Cards

When Claude calls a tool, the result should render as a styled React component in the chat, not raw text. Each tool type gets its own card:

**ProductCard** (from `lookup_product`):
```
┌──────────────────────────────────┐
│ 📦 หัวเทียน BP8ES               │
│ SKU: PD69000071                  │
│ สต็อก: 28 ชิ้น                   │
│ ราคาขาย: ฿35  ต้นทุน: ฿18       │
│ [🏷 พิมพ์ฉลาก]                  │
└──────────────────────────────────┘
```

**SaleConfirmation** (from `create_sale`):
```
┌──────────────────────────────────┐
│ ✅ บันทึกแล้ว!                   │
│ หัวเทียน BP8ES × 2 = ฿70        │
│ ชำระ: เงินสด                     │
│ [📗 ขายต่อ] [🧾 พิมพ์ใบเสร็จ]   │
└──────────────────────────────────┘
```

**RepairJobCard** (from `get_repair_jobs`):
```
┌──────────────────────────────────┐
│ 📙 งาน #15 — น้าปรือ            │
│ 🏍 Wave 125i ทะเบียน กก-1234    │
│ สถานะ: กำลังซ่อม                 │
│ ราคาเสนอ: ฿2,500                │
│ [📋 ดูรายละเอียด] [✏️ อัปเดต]  │
└──────────────────────────────────┘
```

### 6.4 QR Scanner Integration

A React component using the device camera to scan QR codes (use `html5-qrcode` library). When a QR code is detected:
1. Decode the value (should be a product SKU like "PD69000071")
2. Inject into the chat: "สแกนได้: PD69000071"
3. Claude calls `lookup_product` with the SKU
4. Product card renders in the conversation

The scanner can be triggered:
- From the input bar (camera icon)
- By Claude during a guided flow (e.g., "สแกน QR หรือพิมพ์ชื่อ?")

### 6.5 Inline Action Buttons

Claude's responses should include tappable buttons that inject follow-up prompts. These are NOT React components — they're just styled text in the message that triggers a new user message when tapped.

Example: After a product lookup, Claude says:
```
หัวเทียน BP8ES — ราคา ฿35, สต็อก 28 ชิ้น
จะขายกี่ชิ้น?
[1] [2] [3] [5] [อื่นๆ]
```

Tapping [2] sends the message "2" to the chat.

---

## 7. Guided Flows (Detailed)

### 7.1 Sale Flow

```
User taps: 📗 ขาย
→ Prompt: "ต้องการบันทึกการขาย"

Bot: สแกน QR หรือพิมพ์ชื่อสินค้า?
     [📷 สแกน QR]  [⌨️ พิมพ์ชื่อ]

── Path A: QR Scan ──
User scans QR → "สแกนได้: PD69000071"
Bot calls lookup_product("PD69000071")
Bot: หัวเทียน BP8ES — ราคา ฿35
     สต็อก: 28 ชิ้น
     จำนวนกี่ชิ้น?
     [1]  [2]  [3]  [อื่นๆ]

── Path B: Type Name ──
User types: "หัวเทียน"
Bot calls lookup_product("หัวเทียน")
Bot: เจอ 5 รายการ:
     1. หัวเทียน BP8ES — ฿35 (สต็อก 28)
     2. หัวเทียน C7HSA — ฿40 (สต็อก 15)
     3. หัวเทียน NGK — ฿45 (สต็อก 8)
     เลือกรายการไหน?
     [1]  [2]  [3]

User: 1
Bot: หัวเทียน BP8ES — ราคา ฿35
     จำนวนกี่ชิ้น?
     [1]  [2]  [3]  [อื่นๆ]

User: 2
Bot: รวม ฿70 — ชำระอย่างไร?
     [💵 เงินสด]  [📱 โอน]  [📋 เครดิต]

User taps: 💵 เงินสด
Bot calls create_sale({items: [{sku: "PD69000071", quantity: 2, unit_price: 35}], payment_method: "เงินสด (Cash)"})
Bot: ✅ บันทึกแล้ว!
     หัวเทียน BP8ES × 2 = ฿70 (เงินสด)
     [📗 ขายต่อ]  [🧾 พิมพ์ใบเสร็จ]
```

### 7.2 Multi-Item Sale

```
After first item confirmed:
Bot: เพิ่มสินค้าอีกหรือชำระเลย?
     [➕ เพิ่มสินค้า]  [💰 ชำระเลย]

User: ➕ เพิ่มสินค้า
Bot: สแกน QR หรือพิมพ์ชื่อสินค้าถัดไป
     [📷 สแกน QR]  [⌨️ พิมพ์ชื่อ]
→ Repeat product selection flow
→ Accumulate items in the conversation context

User: 💰 ชำระเลย
Bot: สรุปรายการ:
     1. หัวเทียน BP8ES × 2 = ฿70
     2. น้ำมันเครื่อง SAE40 × 1 = ฿120
     รวม ฿190 — ชำระอย่างไร?
     [💵 เงินสด]  [📱 โอน]  [📋 เครดิต]
```

### 7.3 Expense Flow

```
User taps: 💸 จ่าย
Bot: หมวดค่าใช้จ่าย?
     [⛽ น้ำมัน]  [🔧 เครื่องมือ]  [📦 ค่าส่ง]  [🏪 ของใช้ร้าน]  [อื่นๆ]

User: ⛽ น้ำมัน
Bot: จำนวนเท่าไหร่ (฿)?

User: 200
Bot: ชำระอย่างไร?
     [💵 เงินสด]  [📱 โอน]

User: 💵 เงินสด
Bot: หมายเหตุ? (หรือข้ามได้)
     [ข้าม]

User: เติมน้ำมันรถส่ง
Bot calls create_expense({category: "น้ำมัน", amount: 200, payment_method: "เงินสด (Cash)", description: "เติมน้ำมันรถส่ง"})
Bot: ✅ บันทึกค่าใช้จ่าย ฿200 (น้ำมัน) เรียบร้อย
```

### 7.4 Stock Count Flow (via Chat)

```
User taps: 📦 สต็อก
Bot: สแกน QR สินค้าที่จะนับ
     [📷 สแกน QR]  [⌨️ พิมพ์ชื่อ]

User scans QR → PD69000071
Bot calls lookup_product + get_product_stock
Bot: หัวเทียน BP8ES
     สต็อกในระบบ: 28 ชิ้น
     นับได้กี่ชิ้น?

User: 25
Bot: ⚠️ ขาด 3 ชิ้น (ระบบ 28, นับ 25)
     [✅ บันทึก]  [🔄 นับใหม่]

User: ✅ บันทึก
Bot calls update_stock_count(record_id, 25, "Mai")
Bot: ✅ อัปเดตสต็อกเป็น 25 ชิ้น
     [📷 สแกนต่อ]  [🏷 พิมพ์ฉลาก]  [เสร็จ]
```

---

## 8. Airtable Schema Reference

### 8.1 Tables and Key Fields

**Sales**
- sale_id, sale_date, transaction_type, payment_method, total, total_collected, customer, note, line_items (linked → Sale Line Items)

**Sale Line Items**
- product (linked → Products), quantity, unit_price, line_total, sale (linked → Sales)

**Products**
- sku (barcode field), display_name, original_name, category, current_stock, last_known_cost_baht, last_known_sell_price_baht, repair_price_total, has_been_counted, counted_date, counted_by, product_photo, show_repair_on_label, notes

**Purchases**
- purchase_id, purchase_date, supplier (linked → Suppliers), total, total_paid, payment_method

**Purchase Line Items**
- purchase_id (linked), product, quantity, is_received, received_at, total_units_received

**Repair Jobs**
- job_id, customer (linked → Customers), vehicle (linked → Vehicles), status, quoted_date, start_date, completion_date_boot, total_collected, quoted_price, job_type, parts_used (linked), labor_charge, actual_hours, notes

**Expenses**
- expense_id, expense_date, category, amount, payment_method, description

**Customers**
- customer_name, phone, credit_balance

**Customer Credit**
- customer (linked), sale (linked), amount, date, status

**Suppliers**
- supplier_name, contact_person, phone

**Daily Cash Reconciliation**
- date, starting_balance, total_draws, total_food, total_other_personal, total_cash_sales, total_delivery_fees, other_cash_in, other_cash_out, total_cash_in, total_cash_out, expected_balance, actual_count, variance, notes, entered_via

**Daily Person Draws**
- date, person, salary, food, other, total, reconciliation (linked)

### 8.2 Payment Method Values (exact strings)
- `เงินสด (Cash)`
- `โอน (Transfer)`
- `เครดิต (Credit)`
- `Shopee (pre-paid)`

### 8.3 Repair Status Values (exact strings)
- `รับงาน (Quoting)`
- `กำลังซ่อม (In Progress)`
- `เสร็จแล้ว (Complete)`
- `จ่ายแล้ว (Paid)`

### 8.4 Expense Categories
- น้ำมัน (Fuel)
- เครื่องมือ (Tools)
- ค่าส่ง (Shipping)
- ของใช้ร้าน (Shop supplies)
- ค่าซ่อมแซม (Maintenance)
- อื่นๆ (Other)

---

## 8.5 Fillout Form Field Reference (Being Replaced)

These are the exact fields from the current Fillout.com forms that the AI chat must replicate:

### Log Sale / Simple Repair Form
- Transaction Type: ขายสินค้า (product sale) | ซ่อมง่าย (simple repair)
- Payment Method: เงินสด (Cash) | โอน (Transfer) | เครดิต (Credit) | หลายช่องทาง (Mixed)
- Customer: linked record (optional, required for Credit) — can create new inline
- Line Items (repeating): Product (linked, can create new) → Quantity → Sell $ Override → Repair $ Override
- Discount (฿) — optional
- Total Collected (฿) — optional override
- Notes — rich text

### Log Purchase Form
- Supplier: linked record (required) — can create new inline
- Payment Method: เงินสด (Cash) | โอน (Transfer) | บัตรเครดิต (Credit Card) | Shopee (จ่ายล่วงหน้า) (pre-paid)
- Line Items (repeating): Product (linked, can create new) → Quantity → Price Override
- Shipping Cost (฿) — optional
- Total Paid (฿) — required
- Notes — rich text

### Log Repair Job Form
- Customer: linked (required) — can create new (Name + Phone)
- Vehicle: linked (required) — can create new (Name, Brand, Vehicle Class, Engine CC, Fuel System, Notes)
- Vehicle Description — auto-populated text
- License Plate — optional text
- Job Type: dropdown (required)
- Status: locked to รับงาน (Quoting) on creation
- Quoted Date: datetime (required, defaults to now)
- Start Date: date (optional)
- Parts Used: Product linked (repeating, can create new) → Quantity → Price Override
- Estimated Hours: dropdown (0:00 to 2:00+ in 15-min increments)
- Effort Tier: Tier 1-5 (Quick → Major)
- Labor Charge: number
- Quoted Price to Customer: number
- Notes: rich text

### Log Expenses Form
- Expense Date: date (required, defaults to today)
- Category: dropdown (required) — options include: น้ำมัน, เครื่องมือ, ค่าส่ง, ค่าไฟ, ค่าน้ำ, etc.
- Amount (฿): number (required)
- Payment Method: เงินสด (Cash) | โอน (Transfer) | เครดิต (Credit) | หลายช่องทาง (Mixed)
- Description: text (required)
- Note: rich text (optional)

### Key Observations for AI Chat Implementation
1. **"Mixed" payment** — Sales and Expenses support หลายช่องทาง (Mixed). Chat must ask for split amounts.
2. **Inline creation** — Sales, Purchases, and Repairs all allow creating new Products, Customers, and Vehicles inline. AI must support "product not found — create it?"
3. **Price overrides** — Sales allow overriding both sell price AND repair price per line item. Default from product record.
4. **Repair complexity** — has Effort Tiers, Estimated Hours, Labor Charge, Quoted Price, Parts, Vehicle + Customer linkage. Guided flow must be smart about which fields to ask for.
5. **Purchase payment methods differ** — includes "บัตรเครดิต (Credit Card)" and "Shopee (จ่ายล่วงหน้า)" instead of generic "เครดิต (Credit)".
6. **Simple repair vs Specialized repair** — Simple repairs use the Sale form (transaction_type = "Simple Repair"). Specialized repairs use the separate Repair Job form with full quoting workflow.

---

### Phase 1: Core Chat (Day 1-2)
1. Chat page UI (`/chat`) with `useChat` hook
2. `/api/chat/route.ts` with `streamText` + system prompt
3. Context buttons component
4. Message renderer (text + basic tool results)
5. 4 read-only tools: `lookup_product`, `get_today_sales`, `get_repair_jobs`, `search_customer`

### Phase 2: Write Operations (Day 2-3)
6. `create_sale` tool (with Sale Line Items + stock decrement)
7. `create_expense` tool
8. `create_purchase` tool
9. `update_repair_status` tool
10. Confirmation flow — Claude confirms before writing

### Phase 3: QR + Labels (Day 3-4)
11. QR scanner component (`html5-qrcode`)
12. QR scan → product lookup → inline in chat flow
13. `print_label` tool — opens label URL in new tab
14. `update_stock_count` tool

### Phase 4: Analytics / Oracle (Day 4-5)
15. `get_sales_summary` with date ranges
16. `get_margin_analysis`
17. `get_slow_movers`
18. `get_top_sellers`
19. `get_cash_flow_summary`
20. `get_purchase_summary`

### Phase 5: Polish (Day 5+)
21. Tool result card components (styled React cards)
22. Inline action buttons in messages
23. Multi-item sale flow
24. Error handling + retry logic
25. Navigation integration (link from home page)

---

## 10. Environment Variables (Existing + New)

```
# Already configured:
ANTHROPIC_API_KEY=sk-ant-...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
PIN_HASH=...
VARIANCE_THRESHOLD=50
NEXT_PUBLIC_LABEL_API_URL=https://pinit-label-api.onrender.com
BLOB_READ_WRITE_TOKEN=...

# No new env vars needed — the chat uses the same Anthropic + Airtable keys
```

---

## 11. Key Design Decisions

### 11.1 Confirmation Before Writes
Claude must ALWAYS confirm before creating or modifying records. The flow is:
1. Claude gathers all information
2. Claude presents a summary: "บันทึกยอดขาย: หัวเทียน × 2 = ฿70, เงินสด — ถูกต้องหรือไม่?"
3. User confirms with [✅ ตกลง] or corrects
4. Only then does Claude call the write tool

### 11.2 Stock Guard
Before `create_sale`, check that `current_stock >= quantity`. If not, warn:
"⚠️ สต็อกไม่พอ — หัวเทียน BP8ES เหลือ 2 ชิ้น แต่ต้องการ 5 ชิ้น. บันทึกต่อหรือไม่?"

### 11.3 Session Continuity
The chat maintains message history within a session. If Mai logs a sale then immediately asks "วันนี้ขายไปเท่าไหร่" — Claude should include the sale she just logged. The `useChat` hook handles this via the messages array.

### 11.4 Close-Out Redirect
The 🌙 ปิดร้าน button redirects to the existing close-out page (`/`) rather than handling it in the chat. The close-out system is a separate, well-tested flow with image upload that doesn't fit naturally in a chat context.

### 11.5 Inventory Count — Chat vs Dedicated Page
The `/inventory` page already exists and works well for batch counting. The chat-based stock count (📦 สต็อก) is for quick one-off counts while walking the shelves. Both update the same Airtable fields.

---

## 12. Testing Checklist

- [ ] Chat loads, context buttons visible
- [ ] Tapping 📗 ขาย starts the sale flow
- [ ] Product lookup by Thai name works
- [ ] Product lookup by SKU works
- [ ] Product lookup by partial SKU works
- [ ] QR scanner opens and reads codes
- [ ] QR scan → product card renders in chat
- [ ] Sale creation with single item works (Sale + Sale Line Items + stock decrement)
- [ ] Multi-item sale works
- [ ] Payment method selection works
- [ ] Expense creation works
- [ ] Repair job listing works
- [ ] Repair status update works
- [ ] "วันนี้ขายไปเท่าไหร่" returns accurate numbers
- [ ] Margin analysis returns correct computation
- [ ] Slow movers query works
- [ ] Label printing opens correct URL in new tab
- [ ] Error on tool call shows Thai error message
- [ ] Confirmation required before all writes
- [ ] Stock guard prevents overselling
- [ ] Chat works on Android Chrome
- [ ] Chat works on iOS Safari
