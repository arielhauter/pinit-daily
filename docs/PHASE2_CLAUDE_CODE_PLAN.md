# Phase 2: Write Operations + Clickable Cards — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** It builds on the working Phase 1 chat.

---

## What We're Building

Add 4 write tools to the existing `/chat` AI interface, plus make the Phase 1 tool result cards clickable. After this phase, Mai can log sales, expenses, purchases, and update repair statuses entirely through the chat — replacing all 4 Fillout.com forms.

**New tools:** `create_sale`, `create_expense`, `create_purchase`, `update_repair_status`
**Updated files:** tool result cards become clickable, system prompt updated for write flows

---

## Critical Design Rule: Confirmation Before Writes

Claude must NEVER create or modify records without explicit user confirmation. The flow is always:

1. Claude gathers all information through conversation
2. Claude presents a summary and asks for confirmation
3. User confirms (ตกลง / ใช่ / yes) or corrects
4. ONLY then does Claude call the write tool

This is enforced in TWO places:
- The **system prompt** instructs Claude to always confirm first
- Each write tool's **description** reminds Claude to confirm before calling

---

## CRITICAL: Airtable Automations Already Running

There are 6 automations in Airtable that fire automatically. The write tools MUST NOT duplicate their work.

### Automation 1: Stock decrement on Sale Line Item creation
- **Trigger:** When a Sale Line Item record is created (if product ID is not empty and quantity > 0)
- **Action:** Decrements `current_stock` on the linked Product by the line item `quantity`
- **Impact on create_sale:** Do NOT manually decrement stock. The automation handles it. If you also decrement, stock will be decremented TWICE.

### Automation 2: Customer Credit on credit sale
- **Trigger:** When a Sale record's `payment_method` = "เครดิต (Credit)"
- **Action:** Creates a Customer Credit record linked to the customer and sale
- **Impact on create_sale:** Do NOT create Customer Credit records. The automation handles it. Just set `payment_method` to "เครดิต (Credit)" and link the customer — the automation does the rest.

### Automation 3: Generate SKU for new products
- **Trigger:** When a Product record is created
- **Action:** Auto-generates SKU like "PD69000377" and sets `sku` and `barcode` fields
- **Impact:** No conflict with Phase 2 tools. Just be aware that new products won't have a SKU immediately — there's a delay while the automation runs.

### Automation 4: Supplier ID generation
- **Trigger:** When a Supplier record is created
- **Action:** Auto-generates `supplier_id` from `display_name` and `supplier_type`
- **Impact on create_purchase:** When creating a new supplier, only set `display_name`. The `supplier_id` is auto-generated.

### Automation 5: Repair Job → Paid → Create Sale + Line Items
- **Trigger:** When Repair Job `status` changes to "จ่ายแล้ว (Paid)" AND `Sales` linked field is empty
- **Action:** Creates a full Sale record (transaction_type = "Specialized Repair") with Sale Line Items from Repair Job Parts, plus a labor line item. Also links it back to the Repair Job.
- **Impact on update_repair_status:** Do NOT create Sale records when transitioning to Paid. The automation handles the entire Sale creation including parts line items and labor. The tool should ONLY update the status, payment_method, total_collected, and completion_date. The automation takes care of everything else.
- **ALSO:** Since Automation 1 fires when Sale Line Items are created, stock is ALSO automatically decremented for repair parts when the repair is marked Paid. No manual stock work needed.

### Automation 6: Stock increment on purchase receiving
- **Trigger:** When `is_received` checkbox is checked on a Purchase Line Item
- **Action:** Sets `received_at` timestamp and increments `current_stock` on the linked Product by `total_units_received` (or `quantity`)
- **Impact on create_purchase:** Do NOT increment stock when creating purchases. Stock only increases when items are received (separate process). This is correct and matches the spec.

---

## Files to Modify (3 files)

```
lib/chat-tools.ts              # Add 4 new write tools
lib/chat-system-prompt.ts       # Add write flow instructions
components/chat/tool-result-card.tsx  # Make cards clickable + add new card types
```

---

## Part 1: System Prompt Update (`lib/chat-system-prompt.ts`)

Add these sections to the existing system prompt:

```
WRITE OPERATIONS — PHASE 2:
You can now create sales, expenses, purchases, and update repair statuses.

CONFIRMATION RULE (CRITICAL):
- Before calling ANY write tool (create_sale, create_expense, create_purchase, update_repair_status), you MUST first present a summary and ask the user to confirm.
- Format the summary clearly, then ask: "ถูกต้องไหมคะ?" or "ยืนยันบันทึกไหมคะ?"
- Only call the write tool AFTER the user confirms (ตกลง, ใช่, ยืนยัน, yes, ok, etc.)
- If the user says ไม่ / ยกเลิก / แก้ไข / no — ask what to change, do NOT write.

SALE FLOW (📗 ขาย):
When user wants to log a sale:
1. Ask them to type a product name or SKU (QR scanning coming in Phase 3)
2. Call lookup_product to find the product
3. If multiple results, ask which one
4. Ask quantity (suggest common amounts: 1, 2, 3, 5)
5. Ask if they want to add more items or proceed to payment
6. Ask payment method: เงินสด (Cash), โอน (Transfer), เครดิต (Credit)
7. If เครดิต — require customer name (search or create new)
8. Present summary and ask for confirmation
9. Call create_sale only after confirmation
- Transaction type: ask "ขายสินค้า หรือ ซ่อมง่าย?" only if relevant. Default to Product Sale.
- For simple repairs, use transaction_type "Simple Repair" — these still use create_sale, not the repair job system.
- Stock guard: if stock < requested quantity, warn but allow if user confirms.
- Price override: use the product's sell price by default. Only ask about price override if the user mentions a different price.
- For simple repairs: use repair_price_total from the product record instead of sell price.

EXPENSE FLOW (💸 จ่าย):
When user wants to log an expense:
1. Ask category — present the most common ones as choices:
   ค่าน้ำมันรถ (Fuel), ค่าเครื่องมือ (Tools), ค่าขนส่ง (Shipping), ค่าอาหาร (Food & drinking water), ค่าไฟ (Electricity), ค่าน้ำ (Water), อื่นๆ (Other)
2. Ask amount (฿)
3. Ask payment method: เงินสด (Cash), โอน (Transfer)
4. Ask for description (what was it for?)
5. Present summary and ask for confirmation
6. Call create_expense after confirmation
- Date defaults to today unless user specifies otherwise

PURCHASE FLOW (📘 ซื้อ):
When user wants to log a purchase:
1. Ask supplier name — search existing suppliers or type new name
2. Ask payment method: เงินสด (Cash), โอน (Transfer), บัตรเครดิต (Credit Card), Shopee (pre-paid)
3. Ask for items: product name + quantity + unit cost per item
4. Ask shipping cost (optional)
5. Ask total paid
6. Present summary and ask for confirmation
7. Call create_purchase after confirmation
- Purchase does NOT auto-increment stock. Receiving is a separate process.

REPAIR STATUS UPDATE (📙 ซ่อม → update):
When user wants to update a repair job status:
1. Show active repair jobs (use get_repair_jobs)
2. Ask which job to update
3. Show current status and valid next status:
   - รับงาน (Quoting) → กำลังซ่อม (In Progress)
   - กำลังซ่อม (In Progress) → เสร็จแล้ว (Complete)
   - เสร็จแล้ว (Complete) → จ่ายแล้ว (Paid) — requires payment method + total collected
4. Present summary and ask for confirmation
5. Call update_repair_status after confirmation
```

---

## Part 2: Write Tools (`lib/chat-tools.ts`)

Add these 4 tools to the existing `chatTools` object.

### Tool 5: `create_sale`

**Description for Claude:** `บันทึกการขาย — สร้างรายการขายใหม่พร้อมรายการสินค้า ลดสต็อกอัตโนมัติ (Create a sale with line items and auto-decrement stock). IMPORTANT: Always confirm with user before calling this tool.`

**Parameters (zod schema):**
```typescript
z.object({
  transaction_type: z.enum(['Product Sale', 'Simple Repair']).describe('ประเภท: Product Sale หรือ Simple Repair'),
  items: z.array(z.object({
    product_record_id: z.string().describe('Airtable record ID ของสินค้า (ได้จาก lookup_product)'),
    quantity: z.number().describe('จำนวน'),
    unit_price: z.number().describe('ราคาต่อชิ้น (ราคาขายปกติ หรือ override)'),
    repair_price_override: z.number().optional().describe('ราคาซ่อมต่อชิ้น (เฉพาะ Simple Repair)'),
  })).describe('รายการสินค้า'),
  payment_method: z.string().describe('วิธีชำระ: เงินสด (Cash), โอน (Transfer), เครดิต (Credit)'),
  customer_name: z.string().optional().describe('ชื่อลูกค้า (จำเป็นถ้าเครดิต)'),
  discount: z.number().optional().describe('ส่วนลด (฿)'),
  total_collected: z.number().optional().describe('ยอดรวมที่รับจริง (ถ้าต่างจากที่คำนวณ)'),
  note: z.string().optional().describe('หมายเหตุ'),
})
```

**Execute logic — this is the most complex tool. Steps:**

1. **Look up customer if payment is Credit:**
   - Search Customers table by `customer_name`
   - If not found, create new customer record with `createRecord('Customers', { Name: customer_name })`
   - Get the customer record ID

2. **Create the Sale record:**
   ```typescript
   const saleFields = {
     sale_date: new Date().toISOString(),
     transaction_type: transaction_type, // "Product Sale" or "Simple Repair"
     payment_method: payment_method,     // exact string: "เงินสด (Cash)" etc.
     // customer: [customerRecordId],    // array of record IDs, only if customer provided
     // discount_baht: discount,         // only if discount provided
     // total_collected: total_collected, // only if override provided
     // note: note,                      // only if provided
     created_by: 'Mai',                  // default to Mai
   };
   ```
   - Use `createRecord` from `lib/airtable.ts`
   - Table: `Sales`
   - Important: `customer` field is `multipleRecordLinks` — pass as array: `[recordId]`
   - Important: `sale_date` is a `dateTime` field — pass ISO string
   - The `total` field is a FORMULA — do NOT set it. It auto-computes from line items.

3. **Create Sale Line Items (one per item):**
   ```typescript
   const lineItems = items.map(item => ({
     fields: {
       sale_id: [saleRecordId],           // link to the Sale we just created
       product: [item.product_record_id], // link to the Product
       quantity: item.quantity,
       // price_override: item.unit_price, // only if different from product's default
       // repair_price_override: item.repair_price_override, // only for Simple Repair
     }
   }));
   ```
   - Use `createRecords` from `lib/airtable.ts` (batch create, up to 10 at a time)
   - Table: `Sale Line Items`
   - Important: `sale_id` and `product` are `multipleRecordLinks` — pass as arrays
   - The `line_total` field is a FORMULA — do NOT set it.
   - The `effective_price` field is a FORMULA that uses `price_override` if set, otherwise the product's `last_known_sell_price_baht`. So only set `price_override` if the user gave a different price.
   - For Simple Repair: set `repair_price_override` if user gave a different repair price.

4. **DO NOT decrement stock manually.**
   - Airtable Automation 1 automatically decrements `current_stock` on the linked Product whenever a Sale Line Item is created.
   - If you also decrement stock in the tool code, stock will be decremented TWICE.
   - The stock guard check (warning if stock < quantity) still happens BEFORE creating records — use `lookup_product` or a `getRecord` call to check current stock and warn the user. But do NOT update stock yourself.
   - You may need to add a `getRecord` helper to `lib/airtable.ts` if one doesn't exist. It's a simple GET to `https://api.airtable.com/v0/{baseId}/{table}/{recordId}` with `cache: 'no-store'`.

5. **DO NOT create Customer Credit records manually.**
   - Airtable Automation 2 automatically creates a Customer Credit record when a Sale has `payment_method` = "เครดิต (Credit)".
   - Just set the `payment_method` and `customer` fields correctly — the automation handles the rest.

6. **Return confirmation:**
   ```typescript
   return {
     success: true,
     saleId: saleRecord.id,
     saleNumber: saleRecord.fields.sale_id, // the auto-number
     items: items.map(i => ({
       name: i.productName, // you'll need to carry this through
       quantity: i.quantity,
       unitPrice: i.unit_price,
       lineTotal: i.quantity * i.unit_price,
     })),
     total: computedTotal,
     paymentMethod: payment_method,
     customer: customer_name || null,
   };
   ```

**IMPORTANT NOTES for create_sale:**
- The Sale table's `total` field is a FORMULA. It auto-computes from line items. Do NOT try to set it.
- The `subtotal` field is a ROLLUP of line item `line_total` values. Auto-computed.
- `discount_baht` is a writable currency field on the Sale — set this if user gives a discount.
- `total_collected` is a writable currency field — set only if user specifies an override amount.
- `payment_method` values must be EXACT strings from Airtable: `"เงินสด (Cash)"`, `"โอน (Transfer)"`, `"เครดิต (Credit)"`, `"หลายช่องทาง (Mixed) "` (note: Mixed has a trailing space in Airtable!)

---

### Tool 6: `create_expense`

**Description:** `บันทึกค่าใช้จ่าย (Create an expense record). IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  expense_date: z.string().optional().describe('วันที่ (YYYY-MM-DD) ถ้าไม่ระบุใช้วันนี้'),
  category: z.string().describe('หมวดหมู่ค่าใช้จ่าย'),
  amount: z.number().describe('จำนวนเงิน (฿)'),
  payment_method: z.string().describe('วิธีชำระ'),
  description: z.string().describe('รายละเอียด'),
  note: z.string().optional().describe('หมายเหตุเพิ่มเติม'),
})
```

**Execute logic — straightforward single record create:**
```typescript
const fields = {
  expense_date: expense_date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
  category: category,           // exact string from Airtable dropdown
  amount: amount,
  payment_method: payment_method, // exact string
  description: description,
  // note: note,                  // only if provided
};

const record = await createRecord('Expenses', fields);
```

**Expense category values (exact strings from Airtable):**
```
ค่าไฟ (Electricity)
ค่าน้ำ (Water)
ค่าน้ำมันรถ (Fuel)
ค่าอินเทอร์เน็ต (Internet)
ค่าซอฟต์แวร์ (Software i.e. Airtable, Fillout)
ค่า AI / Claude
ค่าโทรศัพท์ (Cell phone plans Mai, Boot, Pinit)
ค่าจ้างช่าง (Part-time labor)
ค่าขนส่ง (Shipping / inbound freight)
ค่าเครื่องมือ (Tools & maintenance)
เงินเดือน Mai
เงินเดือน Boot
เงินเดือน/เบิก Pinit
ค่าอาหาร/เครื่องดื่ม (Food & drinking water - shop)
ดอกเบี้ยเบิกเกินบัญชี (SCB overdraft interest)
ค่ายื่นภาษี (Tax filing)
Netflix
ค่าฟาร์ม (Farm subsidy - labor, transport, supplies)
อื่นๆ (Other)
```

**Payment method values for Expenses:**
```
เงินสด (Cash)
โอน (Transfer)
เครดิต (Credit)
หลายช่องทาง (Mixed    <-- note: in Airtable schema this is "หลายช่องทาง (Mixed" without closing paren
```

**Return:** `{ success: true, expenseId: record.id, category, amount, paymentMethod }`

---

### Tool 7: `create_purchase`

**Description:** `บันทึกการสั่งซื้อ — สร้างรายการสั่งซื้อพร้อมรายการสินค้า (Create a purchase order with line items). Does NOT auto-increment stock. IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  supplier_name: z.string().describe('ชื่อผู้จำหน่าย'),
  payment_method: z.string().describe('วิธีชำระ: เงินสด (Cash), โอน (Transfer), บัตรเครดิต (Credit Card), Shopee (pre-paid)'),
  items: z.array(z.object({
    product_record_id: z.string().describe('Airtable record ID ของสินค้า'),
    product_name: z.string().describe('ชื่อสินค้า (เพื่อแสดงผล)'),
    quantity: z.number().describe('จำนวน'),
    unit_cost: z.number().describe('ราคาต่อหน่วย'),
  })).describe('รายการสินค้า'),
  shipping_cost: z.number().optional().describe('ค่าจัดส่ง'),
  total_paid: z.number().describe('ยอดรวมที่จ่าย'),
  note: z.string().optional().describe('หมายเหตุ'),
})
```

**Execute logic:**

1. **Find or create Supplier:**
   - Search Suppliers table: `SEARCH("supplier_name", {display_name})`
   - Field name in Suppliers table: `display_name` (not `supplier_name`)
   - If not found, create new: `createRecord('Suppliers', { display_name: supplier_name })`
   - Note: Suppliers primary field is `supplier_id` (singleLineText), but `display_name` is the human-readable name

2. **Create Purchase record:**
   ```typescript
   const purchaseFields = {
     purchase_date: new Date().toISOString(),
     supplier: [supplierRecordId],    // multipleRecordLinks — array
     payment_method: payment_method,   // exact string
     total_paid: total_paid,
     shipping_cost: shipping_cost || undefined,
     note: note || undefined,
   };
   const purchaseRecord = await createRecord('Purchases', purchaseFields);
   ```

3. **Create Purchase Line Items:**
   ```typescript
   const lineItems = items.map(item => ({
     fields: {
       purchase_id: [purchaseRecord.id],
       product: [item.product_record_id],
       quantity: item.quantity,
       unit_cost: item.unit_cost,
     }
   }));
   await createRecords('Purchase Line Items', lineItems);
   ```
   - Table: `Purchase Line Items`
   - `purchase_id` and `product` are `multipleRecordLinks` — arrays

4. **Return:**
   ```typescript
   return {
     success: true,
     purchaseId: purchaseRecord.id,
     supplier: supplier_name,
     itemCount: items.length,
     totalPaid: total_paid,
     shippingCost: shipping_cost || 0,
   };
   ```

**Purchase payment method values (exact strings):**
```
เงินสด (Cash)
โอน (Transfer)
บัตรเครดิต (Credit Card)
Shopee (pre-paid)
```

**IMPORTANT:** `create_purchase` does NOT increment product stock. Stock only changes when items are received through the receiving process (separate feature).

---

### Tool 8: `update_repair_status`

**Description:** `อัปเดตสถานะงานซ่อม (Update repair job status). Valid transitions: รับงาน→กำลังซ่อม→เสร็จแล้ว→จ่ายแล้ว. IMPORTANT: Always confirm with user before calling.`

**Parameters:**
```typescript
z.object({
  job_record_id: z.string().describe('Airtable record ID ของงานซ่อม (ได้จาก get_repair_jobs)'),
  new_status: z.string().describe('สถานะใหม่'),
  payment_method: z.string().optional().describe('วิธีชำระ (จำเป็นเมื่อเปลี่ยนเป็น จ่ายแล้ว)'),
  total_collected: z.number().optional().describe('ยอดเก็บจริง (จำเป็นเมื่อเปลี่ยนเป็น จ่ายแล้ว)'),
  notes: z.string().optional().describe('หมายเหตุ'),
})
```

**Execute logic:**

1. **Validate status transition:**
   ```typescript
   const VALID_TRANSITIONS: Record<string, string[]> = {
     'รับงาน (Quoting)': ['กำลังซ่อม (In Progress)'],
     'กำลังซ่อม (In Progress)': ['เสร็จแล้ว (Complete)'],
     'เสร็จแล้ว (Complete)': ['จ่ายแล้ว (Paid)'],
   };
   ```
   - First, fetch the current record to get current status
   - Check `VALID_TRANSITIONS[currentStatus]` includes `new_status`
   - If invalid, return error with explanation

2. **Build update fields:**
   ```typescript
   const updateFields: Record<string, any> = {
     status: new_status,
   };
   
   // If transitioning to Complete, set completion date
   if (new_status === 'เสร็จแล้ว (Complete)') {
     updateFields.completion_date_boot = new Date().toISOString().split('T')[0];
   }
   
   // If transitioning to Paid, require payment info
   if (new_status === 'จ่ายแล้ว (Paid)') {
     if (!payment_method || total_collected === undefined) {
       return { success: false, error: 'ต้องระบุวิธีชำระและยอดเก็บเมื่อเปลี่ยนเป็นจ่ายแล้ว' };
     }
     updateFields.payment_method = payment_method;
     updateFields.total_collected = total_collected;
   }
   
   if (notes) {
     updateFields.notes = notes;
   }
   ```

3. **Update the record:**
   ```typescript
   await updateRecord('Repair Jobs', job_record_id, updateFields);
   ```

4. **Return:**
   ```typescript
   return {
     success: true,
     jobId: job_record_id,
     previousStatus: currentStatus,
     newStatus: new_status,
     paymentMethod: payment_method || null,
     totalCollected: total_collected || null,
   };
   ```

**Repair status values (exact strings):**
```
รับงาน (Quoting)
กำลังซ่อม (In Progress)
เสร็จแล้ว (Complete)
จ่ายแล้ว (Paid)
ยกเลิก (Cancelled)
```

---

## Part 3: Clickable Tool Result Cards (`components/chat/tool-result-card.tsx`)

### Make existing cards clickable

Each card type needs an `onAction` callback prop that injects a follow-up message into the chat. The parent `chat/page.tsx` passes the `append` function from `useChat`.

**ProductCard — tap to start a sale:**
```typescript
// When user taps a product card:
onAction(`ขายสินค้า ${product.name} (${product.sku}) ราคา ฿${product.sellPrice}`)
```
- Only show the tap action if product has stock > 0
- Show a subtle "แตะเพื่อขาย" label or a small cart icon

**RepairJobCard — tap to update status:**
```typescript
// When user taps a repair job card:
onAction(`อัปเดตสถานะงานซ่อม #${job.jobId}`)
```
- Show the next valid status as a hint: e.g., "แตะเพื่อเปลี่ยนเป็น กำลังซ่อม"

**CustomerCard — tap to see history:**
```typescript
// When user taps a customer card:
onAction(`ดูประวัติลูกค้า ${customer.name}`)
```

**SalesSummaryCard — no click action for now** (could link to daily details later)

### Add new card types for write confirmations

**SaleConfirmationCard** (from `create_sale`):
```
┌──────────────────────────────────┐
│ ✅ บันทึกการขายเรียบร้อย!        │
│ หัวเทียน BP8ES × 2 = ฿70        │
│ ชำระ: เงินสด                     │
│ [📗 ขายต่อ]                      │
└──────────────────────────────────┘
```
- bg-slate-800, border-l-4 border-green-500
- "ขายต่อ" button sends `ต้องการบันทึกการขาย` to start a new sale

**ExpenseConfirmationCard** (from `create_expense`):
```
┌──────────────────────────────────┐
│ ✅ บันทึกค่าใช้จ่ายเรียบร้อย!    │
│ ค่าน้ำมัน ฿200 (เงินสด)          │
└──────────────────────────────────┘
```
- border-l-4 border-red-400

**PurchaseConfirmationCard** (from `create_purchase`):
```
┌──────────────────────────────────┐
│ ✅ บันทึกการซื้อเรียบร้อย!       │
│ จาก: คุณเฮงยานยนต์สุรินทร์       │
│ 3 รายการ รวม ฿4,500              │
└──────────────────────────────────┘
```
- border-l-4 border-blue-400

**RepairStatusCard** (from `update_repair_status`):
```
┌──────────────────────────────────┐
│ ✅ อัปเดตสถานะเรียบร้อย!         │
│ งาน #13: เสร็จแล้ว → จ่ายแล้ว   │
│ เก็บเงิน ฿4,210 (เงินสด)        │
└──────────────────────────────────┘
```
- border-l-4 border-orange-400

### Wiring up clickable cards in `app/chat/page.tsx`

Pass the `append` function to `ToolResultCard`:

```typescript
<ToolResultCard
  key={invocation.toolCallId}
  toolName={invocation.toolName}
  state={invocation.state}
  result={invocation.state === 'result' ? invocation.result : undefined}
  onAction={(message) => append({ role: 'user', content: message })}
/>
```

---

## Part 4: Helper Function — `getRecord`

If `lib/airtable.ts` doesn't already have a single-record fetch function, add one:

```typescript
export async function getRecord(table: string, recordId: string) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Airtable getRecord failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
```

---

## Exact Airtable Field Names Reference

These are the EXACT field names from the verified schema. Use these, not approximations.

### Sales table (`Sales`)
- `sale_date` (dateTime) — ISO string
- `transaction_type` (singleSelect) — "Product Sale" | "Simple Repair" | "Specialized Repair"
- `payment_method` (singleSelect) — "เงินสด (Cash)" | "โอน (Transfer)" | "เครดิต (Credit)" | "หลายช่องทาง (Mixed) "
- `customer` (multipleRecordLinks → Customers) — array of record IDs
- `line_items` (multipleRecordLinks → Sale Line Items) — DO NOT SET, auto-linked from line item side
- `discount_baht` (currency) — optional
- `total` (formula) — DO NOT SET, auto-computed
- `total_collected` (currency) — optional override
- `note` (richText) — optional
- `created_by` (singleSelect) — "Mai" | "Boot" | "Mint" | "Pinit"

### Sale Line Items table (`Sale Line Items`)
- `sale_id` (multipleRecordLinks → Sales) — array: [saleRecordId]
- `product` (multipleRecordLinks → Products) — array: [productRecordId]
- `quantity` (number)
- `price_override` (currency) — only set if different from product's default sell price
- `repair_price_override` (currency) — only for Simple Repair, set if different from product's default repair price
- `line_total` (formula) — DO NOT SET
- `effective_price` (formula) — DO NOT SET

### Expenses table (`Expenses`)
- `expense_date` (date) — YYYY-MM-DD string
- `category` (singleSelect) — exact string from list above
- `amount` (currency)
- `payment_method` (singleSelect)
- `description` (singleLineText)
- `note` (richText) — optional

### Purchases table (`Purchases`)
- `purchase_date` (dateTime) — ISO string
- `supplier` (multipleRecordLinks → Suppliers) — array: [supplierRecordId]
- `payment_method` (singleSelect) — different options from Sales!
- `total_paid` (currency)
- `shipping_cost` (currency) — optional
- `note` (richText) — optional

### Purchase Line Items table (`Purchase Line Items`)
- `purchase_id` (multipleRecordLinks → Purchases) — array: [purchaseRecordId]
- `product` (multipleRecordLinks → Products) — array: [productRecordId]
- `quantity` (number)
- `unit_cost` (currency)

### Repair Jobs table (`Repair Jobs`)
- `status` (singleSelect) — exact strings from list above
- `payment_method` (singleSelect)
- `total_collected` (currency)
- `completion_date_boot` (date) — YYYY-MM-DD
- `notes` (richText)

### Customers table (`Customers`)
- `Name` (singleLineText) — note: capital N, this is the primary field
- `Phone` (phoneNumber) — note: capital P

### Suppliers table (`Suppliers`)
- `supplier_id` (singleLineText) — primary field, auto-generated or manual
- `display_name` (singleLineText) — the human-readable name to search by

---

## Common Pitfalls for Phase 2

| Pitfall | Prevention |
|---------|-----------|
| **DOUBLE STOCK DECREMENT** | **Do NOT manually decrement stock in create_sale.** Automation 1 already decrements when Sale Line Items are created. Manual + automation = double decrement. |
| **DOUBLE CUSTOMER CREDIT** | **Do NOT manually create Customer Credit records.** Automation 2 creates them when payment_method = Credit. |
| **DOUBLE SALE ON REPAIR PAID** | **Do NOT create Sale records in update_repair_status.** Automation 5 creates the Sale + Line Items + labor when status → Paid. |
| Setting formula fields | NEVER set `total`, `subtotal`, `line_total`, `effective_price` — these are formulas |
| Linked record format | ALL `multipleRecordLinks` fields take arrays: `[recordId]`, not bare strings |
| Payment method mismatch | Each table has DIFFERENT payment method options. Sales ≠ Purchases ≠ Expenses |
| Mixed payment trailing space | Sales `payment_method` "หลายช่องทาง (Mixed) " has a trailing space in Airtable |
| Expense category mismatch | Use EXACT strings from the schema, including parenthetical English |
| Stock guard is still needed | Even though automation handles decrement, `create_sale` should still CHECK stock before creating and warn if insufficient. Just don't UPDATE stock yourself. |
| Customer field case | Customers table uses `Name` (capital N) and `Phone` (capital P) |
| Supplier search field | Search by `display_name`, not `supplier_id`. Automation 4 auto-generates `supplier_id`. |
| Creating records without confirmation | System prompt and tool descriptions both say confirm first |
| Sale date vs Expense date | Sales use `dateTime` (ISO string with time). Expenses use `date` (YYYY-MM-DD only). |

---

## Testing Checklist

1. **Sale flow:** Tap 📗 ขาย → search product → select → set quantity → choose payment → confirm → verify record appears in Airtable Sales + Sale Line Items tables. Stock should be decremented by Automation 1 (NOT by the tool code).
2. **Multi-item sale:** Add 2+ items before payment → verify all line items created, stock decremented for each by automation
3. **Simple repair sale:** Choose ซ่อมง่าย → uses repair price instead of sell price
4. **Credit sale:** Choose เครดิต → requires customer name → verify customer linked → verify Customer Credit record auto-created by Automation 2
5. **Stock guard:** Try selling more than current stock → warning appears (tool checks stock but does NOT update it)
6. **Expense flow:** Tap 💸 จ่าย → category → amount → payment → confirm → verify in Airtable
7. **Purchase flow:** Tap 📘 ซื้อ → supplier → items → total → confirm → verify in Airtable. Stock should NOT change (only changes on receiving via Automation 6).
8. **Repair status update:** View repair jobs → tap a job card → update status → verify in Airtable
9. **Status validation:** Try invalid transition (e.g., รับงาน → จ่ายแล้ว) → should be rejected
10. **Paid status:** Update to จ่ายแล้ว → requires payment method + total collected → verify Sale + Line Items auto-created by Automation 5
11. **No double stock decrement:** After sale, check product stock was decremented ONCE (not twice)
12. **Clickable product cards:** Tap product → starts sale flow
13. **Clickable repair cards:** Tap repair job → starts status update
14. **Confirmation flow:** Verify Claude ALWAYS asks for confirmation before writing
15. **Cancel flow:** Say "ยกเลิก" after confirmation prompt → should NOT write

---

## After Phase 2 Works

Phase 3 adds QR scanner and label printing.
Phase 4 adds analytics tools (margin analysis, slow movers, top sellers, cash flow).
