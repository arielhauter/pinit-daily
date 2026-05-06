# Workflow Audit: Required Fields + Flow Triggers

> **Give this to Claude Code as a system prompt update task.**

---

## Overview

Review and update `lib/chat-system-prompt.ts` with detailed field requirements and flow triggers for every workflow. The system prompt needs to clearly tell Claude:
1. Which fields are REQUIRED vs OPTIONAL for each workflow
2. When to ask for optional fields vs skip them (speed vs data quality)
3. What follow-up actions to trigger after state changes

---

## SALE FLOW — Field Requirements

Replace the existing sale flow section in the system prompt with this:

```
SALE FLOW (📗 ขาย):

FIRST RESPONSE when Mai taps 📗 ขาย or says "ต้องการบันทึกการขาย":
Show the checklist of what's needed, then start:
"📗 บันทึกการขาย — ต้องการข้อมูล:
✅ สินค้า (ชื่อ/สแกน QR)
✅ จำนวน
✅ วิธีชำระ (สด/โอน/เครดิต)
○ ลูกค้า (จำเป็นถ้าเครดิต, ข้ามได้ถ้าสด/โอน)
○ เบอร์โทรลูกค้า (ข้ามได้)
○ ส่วนลด (ข้ามได้)
○ หมายเหตุ (ข้ามได้)

เริ่มเลย — พิมพ์ชื่อสินค้าหรือสแกน QR ค่ะ 📷"

REQUIRED FIELDS (must collect before creating):
- product(s) + quantity — search by name, SKU, or QR scan
- payment_method — เงินสด/โอน/เครดิต (always ask, no default)
- transaction_type — "ขายสินค้า หรือ ซ่อมง่าย?" (ask if ambiguous, default to Product Sale for simple lookups)

CONDITIONALLY REQUIRED:
- customer — REQUIRED if payment_method = เครดิต (Credit). Search existing first, offer to create new.
- total_collected — auto-computed from items. Only ask for override if user mentions a different amount or discount.

OPTIONAL BUT ENCOURAGED:
- customer name — even for cash/transfer sales, GENTLY ask: "ลูกค้าชื่ออะไรคะ? (ข้ามได้)" 
  - If Mai says "ข้าม" or ignores, proceed without customer — don't insist
  - If Mai provides a name, search existing customers. If not found, ask "สร้างลูกค้าใหม่ไหมคะ?"
- customer phone — if customer is provided AND phone is empty in the database, ask ONCE: "มีเบอร์โทรลูกค้าไหมคะ? (ข้ามได้)"
  - Don't ask if they already skipped customer name
  - Don't ask if phone already exists in the database
- discount — only ask if user mentions it. Don't prompt for discount on every sale.
- note — only ask if something unusual (e.g., stock mismatch, special arrangement)

SPEED MODE DETECTION:
If Mai sends messages very quickly, or types shorthand like "หัวเทียน 2 สด" (product + qty + payment in one message), parse all three and go straight to confirmation. Don't ask follow-up questions one by one.

Example fast flow:
User: "หัวเทียน 2 เงินสด"
Bot: [lookup_product → find หัวเทียน → confirm] "หัวเทียน BP8ES × 2 = ฿70 เงินสด — ยืนยันไหมคะ?"

Example detailed flow:
User: "ขาย"
Bot: "จะขายอะไรคะ? พิมพ์ชื่อสินค้าหรือสแกน QR"
User: "หัวเทียน"
Bot: [shows product cards] "ต้องการตัวไหนคะ?"
User: [taps card or types "1"]
Bot: "กี่ชิ้นคะ?"
User: "2"
Bot: "ชำระด้วยอะไรคะ? เงินสด / โอน / เครดิต"
User: "สด"
Bot: "ลูกค้าชื่ออะไรคะ? (ข้ามได้)"
User: "ข้าม"
Bot: "หัวเทียน BP8ES × 2 = ฿70 เงินสด — ยืนยันไหมคะ?"
```

---

## SIMPLE REPAIR SALE — Field Requirements

```
SIMPLE REPAIR (ซ่อมง่าย):
Same as Product Sale flow EXCEPT:
- transaction_type = "Simple Repair"
- Use repair_price_total from product instead of sell price
- Always ask for customer name (repairs are usually for known customers)
- If user says "ซ่อมง่าย" or "ซ่อม" in the sale context, switch to Simple Repair pricing automatically
- Example repair products: น้ำมันเครื่อง, ผ้าเบรก, หัวเทียน, ยางใน/ยางนอก
```

---

## EXPENSE FLOW — Field Requirements

```
EXPENSE FLOW (💸 จ่าย):

FIRST RESPONSE when Mai taps 💸 จ่าย:
"💸 บันทึกค่าใช้จ่าย — ต้องการข้อมูล:
✅ หมวดหมู่
✅ จำนวนเงิน (฿)
✅ วิธีชำระ (สด/โอน)
✅ รายละเอียด
○ วันที่ (ถ้าไม่ใช่วันนี้)
○ หมายเหตุ (ข้ามได้)

เลือกหมวดหมู่ค่ะ 👇"
Then present the category choices.

REQUIRED FIELDS:
- category — present the 7 most common choices, let Mai pick by number or name
- amount — in ฿
- payment_method — เงินสด / โอน (most expenses are cash)
- description — what was it for? A few words is fine.

OPTIONAL:
- expense_date — defaults to today. Only ask if Mai says "เมื่อวาน" or specifies a date.
- note — only if Mai volunteers extra info

SPEED: Expense is the simplest flow. Aim for 4 exchanges max:
User: "จ่ายค่าน้ำมัน 200 สด"
Bot: "ค่าน้ำมัน ฿200 เงินสด — ยืนยันไหมคะ?"
```

---

## PURCHASE FLOW — Field Requirements

```
PURCHASE FLOW (📘 ซื้อ):

FIRST RESPONSE when Mai taps 📘 ซื้อ:
"📘 บันทึกการซื้อ — ต้องการข้อมูล:
✅ ผู้จำหน่าย (ชื่อ)
✅ วิธีชำระ (สด/โอน/บัตร/Shopee)
✅ รายการสินค้า + จำนวน + ราคาต่อหน่วย
✅ ยอดรวมที่จ่าย
○ ค่าจัดส่ง (ข้ามได้)
○ หมายเหตุ (ข้ามได้)

เริ่มเลย — ซื้อจากผู้จำหน่ายไหนคะ?"

REQUIRED FIELDS:
- supplier_name — search existing suppliers or create new
- payment_method — เงินสด / โอน / บัตรเครดิต / Shopee (pre-paid)
- items — at least one item with product + quantity + unit_cost
- total_paid — total amount paid to supplier

OPTIONAL BUT ENCOURAGED:
- shipping_cost — ask: "มีค่าจัดส่งไหมคะ? (ข้ามได้ถ้าไม่มี)"
- note — for special terms, order references, etc.

IMPORTANT: Purchase does NOT auto-increment stock. Tell Mai: "บันทึกการซื้อเรียบร้อย สต็อกจะเพิ่มเมื่อรับของเข้าระบบค่ะ"
```

---

## REPAIR STATUS UPDATE — Field Requirements + Flow Triggers

This is the most complex flow because different status transitions require different fields AND trigger different follow-up actions.

But first — creating the repair job itself:

---

## CREATE REPAIR JOB (New Specialized Repair Quote)

This replaces the Fillout "📙 บันทึกงานซ่อม" form. Mai uses this when a customer brings in a motorcycle for specialized repair (not simple repairs like oil changes — those use the Sale flow with "Simple Repair" type).

### Tool 18: `create_repair_job`

**Add this new tool to `lib/chat-tools.ts`.**

**Description:** `สร้างงานซ่อมใหม่ — บันทึกข้อมูลลูกค้า, รถ, ประเภทงาน, เสนอราคา (Create a new specialized repair job with customer, vehicle, job type, parts, and quoted price). IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  customer_name: z.string().describe('ชื่อลูกค้า'),
  customer_phone: z.string().optional().describe('เบอร์โทรลูกค้า'),
  vehicle_description: z.string().describe('รายละเอียดรถ เช่น Honda Wave 110i สีแดง ปี 2012'),
  license_plate: z.string().optional().describe('ทะเบียนรถ'),
  job_type: z.array(z.string()).describe('ประเภทงาน เช่น ["เปลี่ยนน้ำมันเครื่อง", "เปลี่ยนแบตเตอรี่"]'),
  effort_tier: z.string().describe('ระดับความยาก: Tier 1-5'),
  estimated_hours: z.number().describe('ชั่วโมงคาดว่าจะใช้'),
  labor_charge: z.number().describe('ค่าแรง (฿)'),
  parts: z.array(z.object({
    product_name: z.string().describe('ชื่ออะไหล่'),
    quantity: z.number().describe('จำนวน'),
  })).describe('อะไหล่ที่ต้องใช้'),
  quoted_price: z.number().describe('ราคาเสนอลูกค้า (฿)'),
  notes: z.string().optional().describe('หมายเหตุ'),
})
```

**Execute logic:**

1. **Find or create Customer:**
   - Search Customers table by name
   - If not found, create new customer with Name (and Phone if provided)
   - If found but phone is empty and phone was provided, update customer with phone

2. **Find or create Vehicle:**
   - Search Vehicles table: `SEARCH("vehicle_description", {display_name})`
   - If not found, create new vehicle with `display_name: vehicle_description`
   - If license_plate provided, set it on the vehicle record

3. **Match parts to Products:**
   - For each part, search Products table by name
   - Track matched parts (with record IDs) and unmatched parts
   
4. **Create the Repair Job record:**
   ```typescript
   const jobFields = {
     customer: [customerRecordId],
     vehicle: [vehicleRecordId],
     vehicle_description: vehicle_description,
     license_plate: license_plate || undefined,
     job_type: job_type, // multiSelect — Airtable accepts array of strings? Or needs {name: string}[]?
     status: 'รับงาน (Quoting)',
     quoted_date: new Date().toISOString(),
     effort_tier: effort_tier, // singleSelect — exact string like "Tier 3 — งานฝีมือ (Skilled)"
     estimated_hours: estimated_hours,
     labor_charge: labor_charge,
     quoted_price_to_customer: quoted_price,
     notes: notes || undefined,
     created_by: 'Mai', // or detect from language
   };
   ```

   **IMPORTANT for multiSelect fields:**
   - `job_type` is a multipleSelects field. Airtable API expects an array of EXACT option strings.
   - The valid job_type options need to be checked — they're in the schema as singleSelect choices but the field is actually multipleSelects.

   **IMPORTANT for singleSelect fields:**
   - `effort_tier` must be an EXACT string from Airtable: "Tier 1 — งานเร็ว (Quick)", "Tier 2 — งานปกติ (Standard)", "Tier 3 — งานฝีมือ (Skilled)", "Tier 4 — งานซับซ้อน (Complex)", "Tier 5 — งานใหญ่ (Major)"
   - Add a normalization map like the payment method maps.

5. **Create Repair Job Parts:**
   For each matched part:
   ```typescript
   await createRecord('Repair Job Parts', {
     repair_job: [jobRecordId],
     product: [productRecordId],
     quantity: part.quantity,
   });
   ```

6. **Return:**
   ```typescript
   return {
     success: true,
     jobId: jobRecord.fields.job_id, // auto-number
     jobRecordId: jobRecord.id,
     customer: customer_name,
     vehicle: vehicle_description,
     licensePlate: license_plate,
     jobType: job_type,
     effortTier: effort_tier,
     estimatedHours: estimated_hours,
     laborCharge: labor_charge,
     quotedPrice: quoted_price,
     partsMatched: matchedParts.length,
     unmatchedParts: unmatchedParts,
   };
   ```

### Repair Job Creation — System Prompt Flow:

```
CREATE REPAIR JOB FLOW (📙 รับงานซ่อม):

FIRST RESPONSE when Mai taps 📙 รับงานซ่อม or says "ต้องการสร้างงานซ่อมใหม่":
"📙 รับงานซ่อมใหม่ — ต้องการข้อมูล:
✅ ชื่อลูกค้า
✅ รถ (ยี่ห้อ รุ่น สี ปี)
✅ ประเภทงานซ่อม
✅ ระดับความยาก (Tier 1-5)
✅ ชั่วโมงที่คาดว่าจะใช้
✅ อะไหล่ที่ต้องใช้
✅ ค่าแรง
✅ ราคาเสนอลูกค้า
○ เบอร์โทรลูกค้า (ข้ามได้)
○ ทะเบียนรถ (ข้ามได้)
○ หมายเหตุ (ข้ามได้)

เริ่มเลย — ลูกค้าชื่ออะไรคะ?"

When Mai wants to create a new specialized repair job (customer brings in motorcycle for major repair):

1. CUSTOMER — "ลูกค้าชื่ออะไรคะ?"
   - Search existing customers
   - If new: "สร้างลูกค้าใหม่ไหมคะ?" + ask for phone
   - If existing but no phone: "มีเบอร์โทรลูกค้าไหมคะ? (ข้ามได้)"

2. VEHICLE — "รถอะไรคะ? (ยี่ห้อ รุ่น สี ปี)"
   - Example: "Honda Wave 110i สีแดง ปี 2012"
   - Ask license plate: "ทะเบียนอะไรคะ? (ข้ามได้)"

3. JOB TYPE — "ประเภทงานซ่อมอะไรคะ? (เลือกได้หลายอย่าง)"
   - Present common options: เปลี่ยนน้ำมันเครื่อง, เปลี่ยนแบตเตอรี่, ซ่อมเครื่องยนต์, ซ่อมระบบไฟ, เปลี่ยนโซ่สเตอร์, etc.
   - Can select multiple

4. EFFORT TIER — "ระดับความยากเท่าไหร่คะ?"
   - Present the 5 tiers with descriptions:
     Tier 1 — งานเร็ว (15 นาที, ฿120/ชม.)
     Tier 2 — งานปกติ (15-45 นาที, ฿160/ชม.)
     Tier 3 — งานฝีมือ (1-3 ชม., ฿200/ชม.)
     Tier 4 — งานซับซ้อน (3-8 ชม., ฿250/ชม.)
     Tier 5 — งานใหญ่ (8-24+ ชม., ฿300/ชม.)

5. ESTIMATED HOURS — "คาดว่าจะใช้เวลากี่ชั่วโมงคะ?"

6. PARTS — "ต้องใช้อะไหล่อะไรบ้างคะ?"
   - For each part: search product by name
   - Show stock status: ✅ มีสต็อก / ❌ ต้องสั่ง
   - Ask "เพิ่มอะไหล่อีกไหม?"

7. LABOR CHARGE — "ค่าแรงเท่าไหร่คะ?"
   - Suggest based on tier × hours: "แนะนำ: Tier 3 × 2 ชม. = ฿400"
   - Mai can override

8. QUOTED PRICE — "ราคาเสนอลูกค้าเท่าไหร่คะ?"
   - Show suggested total: "อะไหล่ ฿X + ค่าแรง ฿Y = ฿Z"
   - Mai enters the actual quoted price (may differ from suggested)

9. CONFIRMATION — Show full summary:
   "งานซ่อมใหม่:
   ลูกค้า: น้าปรือ
   รถ: Honda Wave 110i (ทะเบียน กก-1234)
   ประเภท: เปลี่ยนน้ำมันเครื่อง, เปลี่ยนแบตเตอรี่
   ระดับ: Tier 3 — งานฝีมือ
   เวลา: 2 ชม.
   อะไหล่: น้ำมันเครื่อง ×1, แบตเตอรี่ ×1
   ค่าแรง: ฿400
   ราคาเสนอ: ฿2,500
   ยืนยันไหมคะ?"

10. After creation: "สร้างงานซ่อม #XX เรียบร้อยค่ะ ✅ ลูกค้าอนุมัติแล้วหรือยังคะ?"
    - If approved → update status to กำลังซ่อม + offer to print work order
    - If pending → "แจ้งเมื่อลูกค้าตกลงนะคะ"
```

---

### Tool 18 Result Card (`components/chat/tool-result-card.tsx`)

Add a `RepairJobCreationCard`:

```
┌──────────────────────────────────┐
│ ✅ สร้างงานซ่อม #15 เรียบร้อย!   │
│ ลูกค้า: น้าปรือ                  │
│ รถ: Honda Wave 110i              │
│ ประเภท: เปลี่ยนน้ำมัน, แบตเตอรี่  │
│ ราคาเสนอ: ฿2,500                │
│ [🖨 พิมพ์ใบสั่งงาน]              │
└──────────────────────────────────┘
```
- border-l-4 border-orange-500
- Print button uses data-label-url with the Render.com work order URL

---

```
REPAIR STATUS UPDATE FLOW:

STATUS TRANSITIONS AND REQUIRED FIELDS:

1. รับงาน (Quoting) → กำลังซ่อม (In Progress):
   REQUIRED: (none beyond the status change)
   AUTOMATIC ACTION: After updating status, IMMEDIATELY offer to print work order:
   "สถานะอัปเดตเป็น กำลังซ่อม แล้วค่ะ — พิมพ์ใบสั่งงานให้บูทไหมคะ? 🖨"
   If Mai says yes → call print_label equivalent OR provide the work order print URL:
   https://pinit-print-api.onrender.com/workorder/{job_record_id}
   Open this URL in a new tab using the data-label-url pattern.

2. กำลังซ่อม (In Progress) → เสร็จแล้ว (Complete):
   REQUIRED:
   - completion_date — defaults to today
   DEFAULT ENCOURAGED BEHAVIOR — WORK ORDER PHOTO:
   "บูทซ่อมเสร็จแล้ว — ถ่ายรูปใบสั่งงานได้เลยค่ะ 📋"
   (triggers work order extraction which captures ALL of the following at once:
   - actual_hours — ชั่วโมงจริงที่ใช้
   - notes — หมายเหตุจากบูท
   - additional parts added — อะไหล่ที่เพิ่ม + จำนวน
   - parts removed/not used — อะไหล่ที่ถอดออก
   - advice for customer — คำแนะนำให้มายแจ้งลูกค้า)
   
   ALTERNATIVE — MANUAL ENTRY:
   If Mai doesn't have the work order photo, or says "ใส่เอง":
   - actual_hours — "บูทใช้เวลากี่ชั่วโมงคะ?"
   - parts changes — "มีอะไหล่เพิ่มหรือลดจากเดิมไหมคะ?"
   - notes — "บูทมีหมายเหตุอะไรไหมคะ?"
   - advice for customer — "บูทมีคำแนะนำให้แจ้งลูกค้าไหมคะ?"

3. เสร็จแล้ว (Complete) → จ่ายแล้ว (Paid):
   REQUIRED:
   - payment_method — เงินสด / โอน / เครดิต (MUST ask, no default)
   - total_collected — "ลูกค้าจ่ายเท่าไหร่คะ?"
   AUTOMATIC: Automation 5 creates Sale + Line Items. Tell Mai:
   "เก็บเงินเรียบร้อย ฿X — ระบบสร้างบันทึกการขายอัตโนมัติแล้วค่ะ ✅"

IMPORTANT FLOW TRIGGERS:
- When showing repair jobs list, highlight jobs that need attention:
  - "กำลังซ่อม" for > 3 days → "⚠️ งาน #X ซ่อมมา 4 วันแล้ว"
  - "เสร็จแล้ว" but not paid → "💰 งาน #X เสร็จแล้ว รอเก็บเงิน"
- After ANY repair status update, ask: "ต้องการทำอะไรต่อไหมคะ? (ดูงานอื่น / กลับหน้าหลัก)"
```

---

## STOCK COUNT FLOW — Field Requirements

```
STOCK COUNT FLOW (📦 สต็อก):

REQUIRED FIELDS:
- product — scan QR or search by name
- new_count — the physical count number

OPTIONAL:
- counted_by — defaults to "Mai"

AFTER UPDATE, ALWAYS OFFER:
- "สแกนต่อ 📷" (scan next product)
- "พิมพ์ฉลาก 🏷" (if label is missing or damaged)
```

---

## LABEL PRINTING — show_repair_on_label Flow

The `show_repair_on_label` checkbox on Products controls whether the repair price appears on printed QR labels. This needs to be surfaced during the label printing flow.

### System prompt addition for LABEL PRINTING:

```
LABEL PRINTING — REPAIR PRICE TOGGLE:
- When printing a label for a product that has repair_price_total > 0:
  - Ask Mai: "สินค้านี้มีราคาซ่อม ฿XX — แสดงราคาซ่อมบนฉลากไหมคะ?"
  - If Mai says yes → update product's show_repair_on_label to true, include repair price in label URL
  - If Mai says no → update product's show_repair_on_label to false, exclude repair price from label URL
  - This setting persists — next time Mai prints this product's label, it remembers her choice
- If product has no repair price (repair_price_total = 0 or null), skip this question entirely
- If label was triggered by card button (quick action), use the existing show_repair_on_label value without asking — only ask during conversational label printing
```

### Tool update for `print_label`:

Add a `show_repair` optional boolean parameter:

```typescript
z.object({
  sku: z.string().describe('SKU ของสินค้า'),
  size: z.enum(['40x20', '40x30', '70x30', '70x50']).describe('ขนาดฉลาก'),
  show_repair: z.boolean().optional().describe('แสดงราคาซ่อมบนฉลาก — ถ้าระบุจะอัปเดต show_repair_on_label ในระบบด้วย'),
})
```

In the execute function:
- If `show_repair` is explicitly provided AND differs from current `show_repair_on_label`, update the product record
- Use the resolved value (provided or from DB) when building the label URL

### Separate task (not in this prompt): 
Add `show_repair_on_label` toggle to the `/inventory` page product cards so Mai can also toggle it during stock counts.

---

## WORK ORDER PHOTO FLOW

```
WORK ORDER PHOTO FLOW (📋):

TRIGGER: Mai says "บูทซ่อมเสร็จ" or taps a Complete repair job
ALTERNATIVE TRIGGER: Mai taps the 📋 camera button

REQUIRED FROM EXTRACTION:
- job_id — to match to existing repair job
- total_hours — Boot's recorded hours

OPTIONAL FROM EXTRACTION:
- time_entries — individual date/start/end rows
- additional_parts — parts Boot added beyond original list
- notes — Boot's handwritten observations
- advice_for_customer — what Boot wants Mai to tell the customer

AFTER EXTRACTION:
- Present extracted data clearly
- Ask Mai to confirm or correct
- If additional parts can't be matched to products: "ไม่พบ 'ลูกสูบ' ในระบบ ต้องเพิ่มสินค้าใหม่ก่อนค่ะ"
```

---

## GENERAL SYSTEM PROMPT IMPROVEMENTS

Add these general instructions:

```
SESSION CONTEXT — PER CUSTOMER:
- Once a customer is identified in a session (by name or search), remember them for all subsequent transactions
- If Mai starts a new sale without specifying a customer, use the last customer from this session
- If Mai says "ลูกค้าใหม่" / "คนใหม่" / "คนอื่น" → clear the current customer context and ask for the new name
- If Mai clears the chat (🗑) → everything resets including customer context
- For multi-item sales: all items belong to the same customer and same payment method unless Mai says otherwise

DATA QUALITY PHILOSOPHY:
- Always collect REQUIRED fields — never skip them
- For OPTIONAL fields: ask ONCE politely with "(ข้ามได้)" — if Mai skips, move on immediately
- Never ask the same optional question twice in one flow
- If a customer record exists but has empty phone: ask ONCE, not every time
- Balance speed vs data quality based on context:
  - Quick transaction (one item, cash) → minimize questions
  - Credit sale → collect everything (customer, phone, verify balance)
  - Repair job → collect everything (it's a longer interaction anyway)

CONTEXTUAL AWARENESS:
- If Mai just completed a sale and starts another, don't re-explain the flow
- If Mai typed "หัวเทียน 3 โอน" → parse product + quantity + payment in one shot
- If Mai says "เหมือนเดิม" or "อันเดิม" → use the same product/customer from the last transaction
- If a customer was mentioned earlier in the conversation, remember them for subsequent transactions

PROACTIVE SUGGESTIONS:
- When showing a repair job with status "กำลังซ่อม" → ask about progress/completion
- When showing a product with stock = 0 → mention "สต็อกหมด ต้องสั่งซื้อไหมคะ?"
- When a credit sale is created → show customer's total credit balance
- After completing the last item on a clear agenda → "เสร็จหมดแล้วค่ะ! มีอะไรเพิ่มเติมไหม?"
```

---

## IMPLEMENTATION

Give this entire document to Claude Code with this instruction:

**1. Update `lib/chat-system-prompt.ts` — replace the existing SALE FLOW, EXPENSE FLOW, PURCHASE FLOW, REPAIR STATUS UPDATE, and STOCK COUNT FLOW sections with the versions above. Add the CREATE REPAIR JOB FLOW section. Add the SESSION CONTEXT and GENERAL SYSTEM PROMPT IMPROVEMENTS sections. Keep all existing sections that are not being replaced (Oracle mode, error handling, response format rules, QR scanner, label printing, work order photo, etc.)**

**2. Add `create_repair_job` tool to `lib/chat-tools.ts` — Tool 18 as described above. Include:**
- Customer find/create logic (same pattern as create_sale)
- Vehicle find/create logic
- Parts matching to Products table
- Repair Job Parts record creation
- Effort tier normalization map (short names → exact Airtable strings)
- Job type handling for multipleSelects field
- Try-catch error handling (same pattern as all other tools)

**3. Add `RepairJobCreationCard` to `components/chat/tool-result-card.tsx` — result card for create_repair_job with print work order button.**

**4. Add the create_repair_job case to the ToolResultCard switch statement.**

**5. Update `print_label` tool in `lib/chat-tools.ts`:**
- Add `show_repair` optional boolean parameter
- If `show_repair` is explicitly provided and differs from current `show_repair_on_label` value, update the product record in Airtable with `await updateRecord('Products', productRecordId, { show_repair_on_label: show_repair })`
- Use the resolved value when building the label URL's `repair` parameter: if show_repair is false, set repair=0 in the URL regardless of the product's repair_price_total

**6. Add `update_product` tool to `lib/chat-tools.ts` — Tool 19:**

**Description:** `แก้ไขข้อมูลสินค้า — ราคาขาย, ต้นทุน, ราคาซ่อม, ชื่อ, แสดงราคาซ่อมบนฉลาก (Update product details: sell price, cost, repair price, name, show_repair_on_label)`

**Parameters:**
```typescript
z.object({
  product_record_id: z.string().describe('Airtable record ID ของสินค้า (ได้จาก lookup_product)'),
  sell_price: z.number().optional().describe('ราคาขายใหม่'),
  cost_price: z.number().optional().describe('ต้นทุนใหม่'),
  repair_price: z.number().optional().describe('ราคาซ่อมใหม่'),
  display_name: z.string().optional().describe('ชื่อสินค้าใหม่'),
  show_repair_on_label: z.boolean().optional().describe('แสดงราคาซ่อมบนฉลาก'),
})
```

**Execute logic:**
```typescript
execute: async (params) => {
  const { product_record_id, ...updates } = params;
  
  // Get current product for comparison
  const product = await getRecord('Products', product_record_id);
  
  // Build update fields — only include fields that were provided
  const updateFields: Record<string, any> = {};
  if (updates.sell_price !== undefined) updateFields.last_known_sell_price_baht = updates.sell_price;
  if (updates.cost_price !== undefined) updateFields.last_known_cost_baht = updates.cost_price;
  if (updates.repair_price !== undefined) updateFields.repair_price_total = updates.repair_price;
  if (updates.display_name !== undefined) updateFields.display_name = updates.display_name;
  if (updates.show_repair_on_label !== undefined) updateFields.show_repair_on_label = updates.show_repair_on_label;
  
  if (Object.keys(updateFields).length === 0) {
    return { success: false, error: 'ไม่มีข้อมูลที่ต้องแก้ไข' };
  }
  
  await updateRecord('Products', product_record_id, updateFields);
  
  return {
    success: true,
    productName: product.fields.display_name,
    sku: product.fields.sku,
    changes: Object.entries(updateFields).map(([field, value]) => ({
      field,
      oldValue: product.fields[field],
      newValue: value,
    })),
  };
}
```

**System prompt addition:**
```
PRODUCT UPDATES:
- Mint or Mai can ask to change a product's sell price, cost, repair price, name, or label settings
- Always look up the product first (lookup_product) to confirm which product
- Show current values and proposed changes before confirming
- Example: "แก้ราคาขายหัวเทียน BP8ES เป็น ฿40" → lookup product → "ราคาขายปัจจุบัน ฿35 → เปลี่ยนเป็น ฿40 ยืนยันไหมคะ?"
- After updating price, ask: "ต้องการพิมพ์ฉลากใหม่ไหมคะ? 🏷"
```

**Add `ProductUpdateCard` to tool-result-card.tsx:**
```
┌──────────────────────────────────┐
│ ✅ แก้ไขสินค้าเรียบร้อย!          │
│ หัวเทียน BP8ES (PD69000071)      │
│ ราคาขาย: ฿35 → ฿40              │
│ [🏷 พิมพ์ฉลากใหม่]               │
└──────────────────────────────────┘
```
- border-l-4 border-sky-400
- Print label button with data-card-action

---

**7. Add `delete_record` tool to `lib/chat-tools.ts` — Tool 20:**

**Description:** `ลบรายการ — ลบบันทึกการขาย, ค่าใช้จ่าย, หรือการซื้อ (Delete a sale, expense, or purchase record). Only records created today can be deleted. IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  table: z.enum(['Sales', 'Expenses', 'Purchases']).describe('ตาราง'),
  record_id: z.string().describe('Airtable record ID ของรายการที่จะลบ'),
  reason: z.string().describe('เหตุผลที่ลบ'),
})
```

**Execute logic:**
```typescript
execute: async ({ table, record_id, reason }) => {
  // Verify the record exists and was created today
  const record = await getRecord(table, record_id);
  
  // Check creation date — only allow deleting records from today
  const createdTime = new Date(record.createdTime);
  const today = new Date();
  const isToday = createdTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) === 
                  today.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  
  if (!isToday) {
    return { 
      success: false, 
      error: 'ลบได้เฉพาะรายการที่สร้างวันนี้เท่านั้น สำหรับรายการเก่ากว่า กรุณาติดต่อ Mint ให้ลบใน Airtable ค่ะ' 
    };
  }
  
  // If deleting a Sale, also delete associated Sale Line Items
  if (table === 'Sales') {
    const lineItems = await selectRecords('Sale Line Items', {
      filterByFormula: `RECORD_ID() != "" AND FIND("${record_id}", ARRAYJOIN({sale_id}))`,
      // Alternative: fetch line items linked to this sale
    });
    // Note: Airtable linked records — when the Sale is deleted, 
    // the link in Sale Line Items breaks but the line items remain.
    // We should delete them explicitly.
    for (const li of lineItems) {
      await deleteRecord('Sale Line Items', li.id);
    }
    
    // Also need to re-increment stock for each line item (since Automation 1 decremented it)
    // This is tricky — for v1, just warn Mai that stock may need manual adjustment
  }
  
  // Delete the record
  await deleteRecord(table, record_id);
  
  return {
    success: true,
    table,
    recordId: record_id,
    reason,
    warning: table === 'Sales' 
      ? 'สต็อกอาจต้องปรับด้วยมือ เนื่องจากระบบลดสต็อกอัตโนมัติตอนขาย' 
      : undefined,
  };
}
```

**IMPORTANT: Add a `deleteRecord` helper to `lib/airtable.ts`:**
```typescript
export async function deleteRecord(table: string, recordId: string) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Airtable deleteRecord failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
```

**System prompt addition:**
```
DELETE RECORDS:
- Mai or Mint can delete sales, expenses, or purchases that were created by mistake
- SAFETY GUARD: Only records created TODAY can be deleted through the chat. For older records, tell the user to contact Mint/admin to delete in Airtable directly.
- Always confirm before deleting: "จะลบ [รายละเอียด] — แน่ใจไหมคะ? ลบแล้วกู้คืนไม่ได้"
- When deleting a Sale: warn that stock was already auto-decremented and may need manual adjustment
- Log the deletion reason
- After deleting: "ลบเรียบร้อยค่ะ ✅ [warning about stock if applicable]"
```

**Add `DeleteConfirmationCard` to tool-result-card.tsx:**
```
┌──────────────────────────────────┐
│ ✅ ลบรายการเรียบร้อย!             │
│ ⚠️ สต็อกอาจต้องปรับด้วยมือ       │  ← only for Sales
└──────────────────────────────────┘
```
- border-l-4 border-red-500

**8. Update context buttons in `components/chat/context-buttons.tsx`** — change from 6 buttons to 8, splitting repair into two and adding receiving:

Current buttons:
```
📗 ขาย | 📘 ซื้อ | 📙 ซ่อม | 💸 จ่าย | 📦 สต็อก | 🌙 ปิดร้าน
```

New buttons:
```
📗 ขาย | 📘 ซื้อ | 📦 รับของ | 🔧 งานซ่อม | 📙 รับงานซ่อม | 💸 จ่าย | 📦 สต็อก | 🌙 ปิดร้าน
```

Button definitions:
- 📗 ขาย → prompt: `ต้องการบันทึกการขาย`
- 📘 ซื้อ → prompt: `ต้องการบันทึกการซื้อ`
- 📦 รับของ → prompt: `ต้องการรับสินค้าเข้าสต็อก` (inventory receiving)
- 🔧 งานซ่อม → prompt: `ต้องการดูงานซ่อม` (view/manage existing)
- 📙 รับงานซ่อม → prompt: `ต้องการสร้างงานซ่อมใหม่` (create new quote)
- 💸 จ่าย → prompt: `ต้องการบันทึกค่าใช้จ่าย`
- 📦 สต็อก → prompt: `ต้องการนับสต็อก`
- 🌙 ปิดร้าน → `__CLOSE_SHOP__` (redirect)

Color scheme: ขาย=green, ซื้อ=blue, รับของ=teal, งานซ่อม=orange, รับงานซ่อม=amber, จ่าย=red, สต็อก=purple, ปิดร้าน=slate

Note: 📦 รับของ and 📦 สต็อก both use the package emoji but have different labels and colors. Consider using 📥 for รับของ instead to differentiate visually.

---

**9. Add `receive_purchase_items` tool to `lib/chat-tools.ts` — Tool 21:**

This replaces the Airtable Interface for inventory receiving. When a Shopee package or wholesale delivery arrives, Mai uses this to confirm receipt, which triggers Automation 6 (stock increment + timestamp).

**Description:** `รับสินค้าเข้าสต็อก — ดูรายการรอรับและยืนยันการรับสินค้า (View pending deliveries and confirm receipt. Checking is_received triggers automatic stock increment via Airtable automation.)`

**Two sub-flows needed — use two tools:**

**Tool 21a: `get_pending_receiving`**

**Description:** `ดูรายการสินค้ารอรับ — สินค้าที่สั่งซื้อแล้วยังไม่ได้รับ (List purchase line items where is_received is unchecked)`

**Parameters:**
```typescript
z.object({
  supplier_name: z.string().optional().describe('กรองตามผู้จำหน่าย (ข้ามได้)'),
})
```

**Execute logic:**
```typescript
execute: async ({ supplier_name }) => {
  let formula = `{is_received} = FALSE()`;
  
  const records = await selectRecords('Purchase Line Items', {
    filterByFormula: formula,
    fields: [
      'product_name_lookup',
      'quantity',
      'total_units_received',
      'unit_cost',
      'purchase_id',
      'current_stock_lookup',
      'is_received',
    ],
    sort: [{ field: 'purchase_id', direction: 'desc' }],
  });

  // Group by purchase for display
  return {
    pendingCount: records.length,
    items: records.map(r => ({
      id: r.id,
      productName: r.fields.product_name_lookup?.[0] || 'Unknown',
      quantity: r.fields.quantity || 0,
      totalUnits: r.fields.total_units_received || r.fields.quantity || 0,
      unitCost: r.fields.unit_cost || 0,
      currentStock: r.fields.current_stock_lookup?.[0] || 0,
      purchaseId: r.fields.purchase_id || null,
    })),
  };
}
```

**Tool 21b: `confirm_receiving`**

**Description:** `ยืนยันรับสินค้า — ติ๊ก is_received ซึ่งจะเพิ่มสต็อกอัตโนมัติผ่าน Airtable automation (Confirm receipt of purchase line items. Checking is_received triggers Automation 6 which increments stock and timestamps received_at.) IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  line_item_ids: z.array(z.string()).describe('Airtable record IDs ของ Purchase Line Items ที่จะรับ'),
  quantity_adjustments: z.array(z.object({
    id: z.string().describe('Record ID'),
    actual_quantity: z.number().describe('จำนวนที่ได้รับจริง (ถ้าต่างจากที่สั่ง)'),
  })).optional().describe('ปรับจำนวนถ้าได้รับไม่ครบ'),
})
```

**Execute logic:**
```typescript
execute: async ({ line_item_ids, quantity_adjustments }) => {
  const results = [];
  
  for (const id of line_item_ids) {
    // Check if quantity needs adjustment
    const adjustment = quantity_adjustments?.find(a => a.id === id);
    
    const updateFields: Record<string, any> = {
      is_received: true,
    };
    
    // If actual quantity differs from ordered
    if (adjustment) {
      updateFields.quantity = adjustment.actual_quantity;
    }
    
    await updateRecord('Purchase Line Items', id, updateFields);
    // Automation 6 handles: received_at timestamp + stock increment
    
    results.push({ id, received: true });
  }
  
  return {
    success: true,
    receivedCount: results.length,
    results,
    note: 'สต็อกเพิ่มอัตโนมัติแล้วค่ะ ✅',
  };
}
```

**IMPORTANT:** Do NOT manually increment stock — Automation 6 handles it when `is_received` is checked. Same principle as Automation 1 for sales.

**System prompt addition:**
```
INVENTORY RECEIVING FLOW (📦 รับของ):

FIRST RESPONSE when Mai taps 📦 รับของ or says "ของมาแล้ว":
"📦 รับสินค้าเข้าสต็อก — ดูรายการรอรับเลยค่ะ"
Then immediately call get_pending_receiving.

Show pending items as a list:
"📦 รายการรอรับ (X รายการ):
1. น้ำมันเครื่อง PTT 10W-30 × 5 (สต็อกปัจจุบัน: 2)
2. แบตเตอรี่ fb 115 pro × 1 (สต็อกปัจจุบัน: 0)
3. หัวเทียน BP8ES × 10 (สต็อกปัจจุบัน: 28)

จะรับทั้งหมดเลย หรือเลือกเฉพาะบางรายการคะ?"

OPTIONS:
- "ทั้งหมด" / "รับหมด" → confirm all items → call confirm_receiving with all IDs
- "1, 2" or "รายการ 1 กับ 2" → confirm selected items only
- "รายการ 2 ได้ 3 ไม่ใช่ 5" → adjust quantity before confirming (wrong quantity received)

AFTER RECEIVING:
- Show confirmation: "✅ รับ X รายการเรียบร้อย สต็อกเพิ่มอัตโนมัติแล้ว"
- For each received item, offer label printing: "ต้องการพิมพ์ฉลากไหมคะ? 🏷"
- If items remain pending: "ยังเหลือ X รายการรอรับ"

EDGE CASES:
- Package arrives but no pending items → "ไม่มีรายการรอรับค่ะ ต้องบันทึกการซื้อก่อนไหมคะ? 📘"
- Wrong quantity (ordered 5, received 3) → adjust quantity field before checking is_received, note the shortage
- Damaged item → don't check is_received, add note, suggest contacting supplier
```

**Add `PendingReceivingCard` and `ReceivingConfirmCard` to tool-result-card.tsx:**

PendingReceivingCard:
```
┌──────────────────────────────────┐
│ 📦 รายการรอรับ — 5 รายการ        │
│                                   │
│ 1. น้ำมัน PTT 10W-30 × 5         │
│    สต็อก: 2 | ฿85/ชิ้น           │
│ 2. แบตเตอรี่ fb 115 × 1          │
│    สต็อก: 0 | ฿500/ชิ้น          │
│ ...                               │
│                                   │
│ [✅ รับทั้งหมด]                   │
└──────────────────────────────────┘
```
- border-l-4 border-teal-400
- "รับทั้งหมด" button: `data-card-action="รับสินค้าทั้งหมด"`
- Each item could be individually tappable for partial receiving

ReceivingConfirmCard:
```
┌──────────────────────────────────┐
│ ✅ รับสินค้า 3 รายการเรียบร้อย!   │
│ สต็อกเพิ่มอัตโนมัติแล้ว          │
│ [🏷 พิมพ์ฉลาก]                   │
└──────────────────────────────────┘
```
- border-l-4 border-teal-500

**9. Update the system prompt** — when each context button is tapped, Claude's FIRST response must show a checklist of required and optional fields before starting the flow. This trains Mai on what info she needs to collect.

**10. Add Airtable Dashboard links to the chat page navigation (`app/chat/page.tsx`):**

Add a dropdown menu in the header labeled "📊 สถิติ" that opens to show 4 dashboard links. Each link opens in a new tab.

```typescript
const DASHBOARD_LINKS = [
  { label: '💰 แดชบอร์ด', url: 'https://airtable.com/appx3s0m3OFYJCTLI/pagvJTFN33q1a42Ld' },
  { label: '🔧 แดชบอร์ดงานซ่อม', url: 'https://airtable.com/appx3s0m3OFYJCTLI/pagwrR5454lhRruBN' },
  { label: '📋 Mint รีวิวประจำวัน', url: 'https://airtable.com/appx3s0m3OFYJCTLI/pagNTa1jp1fMdlmqy' },
  { label: '📦 มูลค่าสต็อก', url: 'https://airtable.com/appx3s0m3OFYJCTLI/pag46ZWMNO49mVK7t' },
];
```

Implementation:
- Add a `showDashboardMenu` state (boolean)
- "📊 สถิติ" button in the header toggles the dropdown
- Dropdown renders as an absolute-positioned menu below the button (bg-slate-800, rounded-lg, shadow-lg, z-40)
- Each link: `<a href={url} target="_blank" rel="noopener noreferrer">` with hover state
- Click outside closes the dropdown
- All labels in Thai as shown above
