# Phase 4: Analytics / Oracle Mode — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** It builds on the working Phases 1-3.

---

## What We're Building

6 analytics tools that let Mint (or Mai) ask business intelligence questions and get answers from live Airtable data. These are all read-only — no writes.

**New tools:** `get_sales_summary`, `get_purchase_summary`, `get_margin_analysis`, `get_slow_movers`, `get_top_sellers`, `get_cash_flow_summary`

---

## Files to Modify

```
lib/chat-tools.ts              # Add 6 analytics tools
lib/chat-system-prompt.ts       # Add Oracle mode instructions
components/chat/tool-result-card.tsx  # Add analytics result cards
```

---

## Part 1: System Prompt Update (`lib/chat-system-prompt.ts`)

Add this section:

```
ANALYTICS / ORACLE MODE:
You have 6 analytics tools for business intelligence questions. Use them when the user asks about:
- Sales performance over time (get_sales_summary)
- Purchase spending by supplier or period (get_purchase_summary)
- Profit margins (get_margin_analysis)
- Products that aren't selling (get_slow_movers)
- Best-selling products (get_top_sellers)
- Cash flow overview (get_cash_flow_summary)

When answering analytics questions:
- Always include specific numbers — totals, counts, percentages
- Format currency as ฿X,XXX
- Compare to context when possible ("เพิ่มขึ้น 15% จากสัปดาห์ก่อน")
- If the user asks in English, respond in English with full detail
- If the user asks in Thai, respond in Thai but keep numbers prominent
- For period-based queries, default to "this month" if the user doesn't specify
- Present key findings first, then details

DATE HANDLING FOR ANALYTICS:
- "วันนี้" / "today" = today's date
- "สัปดาห์นี้" / "this week" = Monday to today
- "เดือนนี้" / "this month" = 1st of current month to today
- "เมื่อวาน" / "yesterday" = yesterday's date
- "สัปดาห์ที่แล้ว" / "last week" = previous Monday to Sunday
- "เดือนที่แล้ว" / "last month" = 1st to last day of previous month
- Custom ranges: use start_date and end_date in YYYY-MM-DD format
```

---

## Part 2: Analytics Tools (`lib/chat-tools.ts`)

### Tool 11: `get_sales_summary`

**Description:** `สรุปยอดขายตามช่วงเวลา — รายได้, จำนวน, แยกตามวิธีชำระและประเภท (Sales summary by period with revenue, count, payment method and type breakdowns)`

**Parameters:**
```typescript
z.object({
  period: z.enum(['today', 'yesterday', 'week', 'last_week', 'month', 'last_month', 'custom']).describe('ช่วงเวลา'),
  start_date: z.string().optional().describe('วันเริ่มต้น YYYY-MM-DD (สำหรับ custom)'),
  end_date: z.string().optional().describe('วันสิ้นสุด YYYY-MM-DD (สำหรับ custom)'),
})
```

**Execute logic:**

1. Compute date range based on period:
```typescript
function getDateRange(period: string, start_date?: string, end_date?: string) {
  const now = new Date();
  // Use Bangkok timezone for date calculations
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const yyyy = (d: Date) => d.toISOString().split('T')[0];
  
  switch (period) {
    case 'today':
      return { start: yyyy(today), end: yyyy(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: yyyy(y), end: yyyy(y) };
    }
    case 'week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - mon.getDay() + (mon.getDay() === 0 ? -6 : 1));
      return { start: yyyy(mon), end: yyyy(today) };
    }
    case 'last_week': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - mon.getDay() + (mon.getDay() === 0 ? -6 : 1) - 7);
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      return { start: yyyy(mon), end: yyyy(sun) };
    }
    case 'month':
      return { start: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`, end: yyyy(today) };
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: yyyy(first), end: yyyy(last) };
    }
    case 'custom':
      return { start: start_date || yyyy(today), end: end_date || yyyy(today) };
    default:
      return { start: yyyy(today), end: yyyy(today) };
  }
}
```

2. Query Sales with date filter:
```typescript
const { start, end } = getDateRange(period, start_date, end_date);
// Airtable date filter — sale_date is a dateTime field
const formula = `AND(IS_AFTER({sale_date}, '${start}'), IS_BEFORE({sale_date}, '${end}T23:59:59'))`;
```

Note: For single-day queries (today, yesterday), use:
```typescript
const formula = `IS_SAME({sale_date}, '${start}', 'day')`;
```

For ranges:
```typescript
const formula = `AND(IS_AFTER({sale_date}, DATEADD('${start}', -1, 'days')), IS_BEFORE({sale_date}, DATEADD('${end}', 1, 'days')))`;
```

3. Fields to fetch: `sale_id`, `sale_date`, `transaction_type`, `payment_method`, `total`, `total_collected`

4. Compute aggregates in JavaScript:
```typescript
return {
  period: period,
  startDate: start,
  endDate: end,
  count: sales.length,
  totalRevenue: sum of total fields,
  totalCollected: sum of total_collected fields,
  averageSale: totalRevenue / count,
  byPaymentMethod: { /* group and sum */ },
  byTransactionType: { /* group and sum */ },
  dailyBreakdown: [ /* if period > 1 day, group by date */ ],
};
```

---

### Tool 12: `get_purchase_summary`

**Description:** `สรุปยอดซื้อตามช่วงเวลาและผู้จำหน่าย (Purchase summary by period and supplier)`

**Parameters:**
```typescript
z.object({
  period: z.enum(['today', 'yesterday', 'week', 'last_week', 'month', 'last_month', 'custom']).describe('ช่วงเวลา'),
  start_date: z.string().optional().describe('วันเริ่มต้น YYYY-MM-DD'),
  end_date: z.string().optional().describe('วันสิ้นสุด YYYY-MM-DD'),
  supplier_name: z.string().optional().describe('กรองตามผู้จำหน่าย'),
})
```

**Execute logic:**

1. Use same `getDateRange` helper
2. Query Purchases table with date filter on `purchase_date`
3. If `supplier_name` provided, add supplier filter (search linked supplier name)
4. Fields: `purchase_id`, `purchase_date`, `supplier`, `total`, `total_paid`, `shipping_cost`, `payment_method`

**Note:** `supplier` is a linked record — it returns record IDs, not names. To get supplier names, you need to either:
- Fetch each supplier record separately, OR
- Use a formula/lookup field if one exists

Simplest approach: after fetching purchases, collect unique supplier record IDs, batch-fetch supplier names from the Suppliers table, then map them back.

```typescript
return {
  period,
  startDate: start,
  endDate: end,
  count: purchases.length,
  totalSpent: sum of total_paid,
  totalShipping: sum of shipping_cost,
  bySupplier: { /* supplier_name: { count, total } */ },
  byPaymentMethod: { /* group and sum */ },
};
```

---

### Tool 13: `get_margin_analysis`

**Description:** `วิเคราะห์กำไร — รายได้, ต้นทุน, กำไรขั้นต้น, เปอร์เซ็นต์มาร์จิ้น (Margin analysis: revenue, COGS, gross profit, margin %)`

**Parameters:**
```typescript
z.object({
  period: z.enum(['today', 'week', 'month', 'last_month', 'custom']).describe('ช่วงเวลา'),
  start_date: z.string().optional().describe('วันเริ่มต้น YYYY-MM-DD'),
  end_date: z.string().optional().describe('วันสิ้นสุด YYYY-MM-DD'),
  category: z.string().optional().describe('กรองตามหมวดหมู่สินค้า'),
})
```

**Execute logic:**

This is the most data-intensive tool. It joins Sales → Sale Line Items → Products to compute margins.

1. Get date range
2. Query Sale Line Items where the linked sale's date is in range. Unfortunately, Airtable can't filter Sale Line Items by the parent Sale's date directly in a formula. Two approaches:

**Approach A (simpler):** Query Sales in date range first, get their record IDs, then query Sale Line Items where `sale_id` matches those IDs. But Airtable formulas can't do `IN()` with a list of IDs.

**Approach B (recommended):** Query Sale Line Items and include `sale_date` as a lookup field if available. Check schema — there's `transaction_type_lookup` on Sale Line Items. If there's no `sale_date` lookup, we need to fetch all Sale Line Items and their parent Sales.

**Practical approach:**
1. Fetch Sales in date range → get record IDs
2. Fetch ALL Sale Line Items (they have `product_cost_lookup` field which gives unit cost)
3. Filter Sale Line Items client-side by matching `sale_id` to the Sales we found
4. For each line item, compute: revenue = `line_total`, cost = `product_cost_lookup` × `quantity`

Fields from Sale Line Items:
- `sale_id` (linked) — to match with Sales
- `quantity`
- `line_total` (formula — effective_price × quantity)
- `product_cost_lookup` (lookup — cost from Products table)
- `product_name_lookup` (lookup — name from Products table)

```typescript
return {
  period,
  startDate: start,
  endDate: end,
  totalRevenue: sum of line_total,
  totalCOGS: sum of (product_cost_lookup * quantity),
  grossProfit: totalRevenue - totalCOGS,
  marginPercent: (grossProfit / totalRevenue) * 100,
  itemCount: total line items,
  byCategory: [ /* if category data available */ ],
  topMarginProducts: [ /* top 5 by margin */ ],
  worstMarginProducts: [ /* bottom 5 by margin */ ],
};
```

**Performance note:** This could involve many records. Limit to 500 Sale Line Items per query. If there are more, note in the response that results are partial.

---

### Tool 14: `get_slow_movers`

**Description:** `สินค้าค้างสต็อก — สินค้าที่มีสต็อกแต่ไม่ขายมานาน (Products with stock > 0 but no recent sales, with capital tied up)`

**Parameters:**
```typescript
z.object({
  days_threshold: z.number().optional().describe('จำนวนวันที่ไม่มียอดขาย (default: 60)'),
  min_stock: z.number().optional().describe('สต็อกขั้นต่ำ (default: 1)'),
})
```

**Execute logic:**

Use the Products table directly — it already has `total_units_sold` (rollup) and `current_stock`.

1. Query Products where `current_stock > 0` (or `>= min_stock`)
2. Fields: `sku`, `display_name`, `current_stock`, `last_known_cost_baht`, `last_known_sell_price_baht`, `category`, `total_units_sold`, `stock_value_cost`, `Created`
3. Filter client-side: products with `total_units_sold` = 0 or null are never-sold items
4. For products that have sold before, we'd need to check the last sale date. This requires checking Sale Line Items — which is expensive. For v1, focus on products with `total_units_sold` = 0 (never sold) and very low `total_units_sold` relative to stock.

**Simpler v1 approach:**
```typescript
// Fetch products with stock > 0
const products = await selectRecords('Products', {
  filterByFormula: `AND({current_stock} > ${min_stock - 1}, {category} != 'ค่าแรง (Labor & Services)')`,
  fields: ['sku', 'display_name', 'current_stock', 'last_known_cost_baht', 'last_known_sell_price_baht', 'category', 'total_units_sold', 'stock_value_cost'],
  sort: [{ field: 'total_units_sold', direction: 'asc' }],
});

// Filter to slow movers — never sold or very few sales
const slowMovers = products
  .filter(p => (p.fields.total_units_sold || 0) <= 2)
  .slice(0, 20);
```

```typescript
return {
  daysThreshold: days_threshold || 60,
  count: slowMovers.length,
  totalCapitalTiedUp: sum of stock_value_cost,
  products: slowMovers.map(p => ({
    sku: p.fields.sku,
    name: p.fields.display_name,
    stock: p.fields.current_stock,
    cost: p.fields.last_known_cost_baht,
    sellPrice: p.fields.last_known_sell_price_baht,
    unitsSold: p.fields.total_units_sold || 0,
    capitalTiedUp: p.fields.stock_value_cost || 0,
    category: p.fields.category,
  })),
};
```

---

### Tool 15: `get_top_sellers`

**Description:** `สินค้าขายดี — อันดับสินค้าตามยอดขายหรือรายได้ (Top selling products by quantity or revenue)`

**Parameters:**
```typescript
z.object({
  period: z.enum(['week', 'month', 'last_month', 'all_time', 'custom']).describe('ช่วงเวลา'),
  start_date: z.string().optional().describe('วันเริ่มต้น YYYY-MM-DD'),
  end_date: z.string().optional().describe('วันสิ้นสุด YYYY-MM-DD'),
  metric: z.enum(['quantity', 'revenue']).optional().describe('เรียงตาม: จำนวน หรือ รายได้ (default: revenue)'),
  limit: z.number().optional().describe('จำนวนอันดับ (default: 10)'),
})
```

**Execute logic:**

**For `all_time`:** Use the Products table directly — it has `total_units_sold` and `total_revenue` rollups:
```typescript
const products = await selectRecords('Products', {
  filterByFormula: `{total_units_sold} > 0`,
  fields: ['sku', 'display_name', 'total_units_sold', 'total_revenue', 'current_stock', 'category', 'last_known_cost_baht', 'last_known_sell_price_baht'],
  sort: [{ field: metric === 'quantity' ? 'total_units_sold' : 'total_revenue', direction: 'desc' }],
});
```

**For period-based:** Need to query Sale Line Items within the date range (same approach as margin analysis — fetch Sales in range, then match line items):

1. Fetch Sales in date range → get IDs
2. Fetch Sale Line Items with those sale_ids
3. Group by product, sum quantity and line_total
4. Sort by metric, take top N

```typescript
return {
  period,
  metric: metric || 'revenue',
  limit: limit || 10,
  products: topProducts.map(p => ({
    rank: index + 1,
    name: p.name,
    sku: p.sku,
    totalQuantity: p.totalQty,
    totalRevenue: p.totalRevenue,
    currentStock: p.currentStock,
    category: p.category,
  })),
};
```

---

### Tool 16: `get_cash_flow_summary`

**Description:** `สรุปกระแสเงินสด — รายได้, ค่าใช้จ่าย, ยอดซื้อ, เงินเบิก, กระแสเงินสดสุทธิ (Cash flow: revenue, expenses, purchases, draws, net)`

**Parameters:**
```typescript
z.object({
  period: z.enum(['today', 'week', 'month', 'last_month', 'custom']).describe('ช่วงเวลา'),
  start_date: z.string().optional().describe('วันเริ่มต้น YYYY-MM-DD'),
  end_date: z.string().optional().describe('วันสิ้นสุด YYYY-MM-DD'),
})
```

**Execute logic:**

Query 4 tables in parallel and aggregate:

```typescript
const { start, end } = getDateRange(period, start_date, end_date);

// Parallel queries
const [sales, purchases, expenses, draws] = await Promise.all([
  // Sales — sum total_collected for cash inflow
  selectRecords('Sales', {
    filterByFormula: dateFilter('sale_date', start, end),
    fields: ['total', 'total_collected', 'payment_method'],
  }),
  // Purchases — sum total_paid for cash outflow
  selectRecords('Purchases', {
    filterByFormula: dateFilter('purchase_date', start, end),
    fields: ['total_paid', 'shipping_cost', 'payment_method'],
  }),
  // Expenses — sum amount for cash outflow
  selectRecords('Expenses', {
    filterByFormula: dateFilter('expense_date', start, end),
    fields: ['amount', 'category', 'payment_method'],
  }),
  // Daily Person Draws — sum total for cash outflow
  selectRecords('Daily Person Draws', {
    filterByFormula: dateFilter('date', start, end),
    fields: ['person', 'salary', 'food', 'other', 'total'],
  }),
]);
```

**Note on date filter for different field types:**
- `sale_date` and `purchase_date` are `dateTime` fields
- `expense_date` and `date` (Daily Person Draws) are `date` fields
- The filter formula may need different syntax for each. For date fields: `AND({expense_date} >= '${start}', {expense_date} <= '${end}')`
- For dateTime fields: use `IS_SAME` or `IS_AFTER`/`IS_BEFORE`

Create a helper function that handles both:
```typescript
function dateFilter(field: string, start: string, end: string): string {
  if (start === end) {
    return `IS_SAME({${field}}, '${start}', 'day')`;
  }
  return `AND(
    IS_AFTER({${field}}, DATEADD('${start}', -1, 'days')),
    IS_BEFORE({${field}}, DATEADD('${end}', 1, 'days'))
  )`;
}
```

```typescript
const totalRevenue = sales.reduce((sum, s) => sum + (s.fields.total_collected || s.fields.total || 0), 0);
const cashSales = sales.filter(s => (s.fields.payment_method || '').includes('เงินสด')).reduce((sum, s) => sum + (s.fields.total_collected || 0), 0);
const transferSales = sales.filter(s => (s.fields.payment_method || '').includes('โอน')).reduce((sum, s) => sum + (s.fields.total_collected || 0), 0);

const totalPurchases = purchases.reduce((sum, p) => sum + (p.fields.total_paid || 0), 0);
const totalExpenses = expenses.reduce((sum, e) => sum + (e.fields.amount || 0), 0);
const totalDraws = draws.reduce((sum, d) => sum + (d.fields.total || 0), 0);

const totalCashIn = cashSales; // only cash payments are actual cash inflow
const totalCashOut = totalPurchases + totalExpenses + totalDraws; // simplified
const netCashFlow = totalCashIn - totalCashOut;

return {
  period,
  startDate: start,
  endDate: end,
  revenue: {
    total: totalRevenue,
    cash: cashSales,
    transfer: transferSales,
    credit: creditSales,
    salesCount: sales.length,
  },
  expenses: {
    total: totalExpenses,
    byCategory: { /* group expenses by category */ },
    count: expenses.length,
  },
  purchases: {
    total: totalPurchases,
    count: purchases.length,
  },
  draws: {
    total: totalDraws,
    count: draws.length,
  },
  cashFlow: {
    totalIn: totalCashIn,
    totalOut: totalCashOut,
    net: netCashFlow,
  },
};
```

---

## Part 3: Analytics Result Cards (`components/chat/tool-result-card.tsx`)

### SalesSummaryPeriodCard (from `get_sales_summary`)

```
┌──────────────────────────────────┐
│ 📊 สรุปยอดขาย — เดือนนี้         │
│ 5 พ.ค. - 5 พ.ค. 2569             │
│                                   │
│ จำนวน: 45 รายการ                  │
│ รวม: ฿32,500                      │
│ เฉลี่ย: ฿722/รายการ               │
│                                   │
│ เงินสด: ฿20,100 (62%)            │
│ โอน: ฿10,400 (32%)               │
│ เครดิต: ฿2,000 (6%)              │
└──────────────────────────────────┘
```
- border-l-4 border-green-400

### MarginAnalysisCard (from `get_margin_analysis`)

```
┌──────────────────────────────────┐
│ 📈 วิเคราะห์กำไร — เดือนนี้      │
│                                   │
│ รายได้: ฿32,500                   │
│ ต้นทุน: ฿21,000                   │
│ กำไรขั้นต้น: ฿11,500              │
│ มาร์จิ้น: 35%                     │
│                                   │
│ สินค้ากำไรดี: หัวเทียน (65%)      │
│ สินค้ากำไรต่ำ: น้ำมันเครื่อง (12%)│
└──────────────────────────────────┘
```
- border-l-4 border-emerald-400

### SlowMoversCard (from `get_slow_movers`)

```
┌──────────────────────────────────┐
│ 📦 สินค้าค้างสต็อก                │
│ 15 รายการ | ทุนจม ฿12,500         │
│                                   │
│ 1. วาล์วไอดี C700 — 3 ชิ้น ฿180  │
│ 2. ยางนอก 2.50 — 5 ชิ้น ฿750     │
│ ...                               │
└──────────────────────────────────┘
```
- border-l-4 border-amber-400

### TopSellersCard (from `get_top_sellers`)

```
┌──────────────────────────────────┐
│ 🏆 สินค้าขายดี — เดือนนี้        │
│                                   │
│ 1. หัวเทียน BP8ES — 45 ชิ้น ฿1,575│
│ 2. น้ำมันเครื่อง SAE40 — 30 ชิ้น │
│ ...                               │
└──────────────────────────────────┘
```
- border-l-4 border-yellow-400

### CashFlowCard (from `get_cash_flow_summary`)

```
┌──────────────────────────────────┐
│ 💰 กระแสเงินสด — เดือนนี้        │
│                                   │
│ 💚 รายได้: ฿32,500                │
│ 🔴 ซื้อสินค้า: -฿18,000          │
│ 🔴 ค่าใช้จ่าย: -฿3,200           │
│ 🔴 เบิกเงิน: -฿6,500             │
│ ─────────────────                 │
│ สุทธิ: ฿4,800                     │
└──────────────────────────────────┘
```
- border-l-4 border-cyan-400
- Net positive = green text, net negative = red text

### Add all to the ToolResultCard switch:

```typescript
case "get_sales_summary":
  return <SalesSummaryPeriodCard data={...} />;
case "get_purchase_summary":
  return <PurchaseSummaryCard data={...} />;
case "get_margin_analysis":
  return <MarginAnalysisCard data={...} />;
case "get_slow_movers":
  return <SlowMoversCard data={...} />;
case "get_top_sellers":
  return <TopSellersCard data={...} />;
case "get_cash_flow_summary":
  return <CashFlowCard data={...} />;
```

---

## Part 4: Shared Date Range Helper

Extract the `getDateRange` function into a shared utility so all 6 tools can use it. Create it at the top of `lib/chat-tools.ts` or in a separate `lib/date-utils.ts`:

```typescript
function getDateRange(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
  // Implementation from above
  // Always use Asia/Bangkok timezone
}

function buildDateFilter(fieldName: string, start: string, end: string): string {
  if (start === end) {
    return `IS_SAME({${fieldName}}, '${start}', 'day')`;
  }
  return `AND(IS_AFTER({${fieldName}}, DATEADD('${start}', -1, 'days')), IS_BEFORE({${fieldName}}, DATEADD('${end}', 1, 'days')))`;
}
```

---

## Airtable Field Reference for Analytics

### Sale Line Items (for margin/top sellers)
- `sale_id` (multipleRecordLinks → Sales)
- `quantity` (number)
- `line_total` (formula — effective_price × quantity)
- `product_cost_lookup` (lookup → Products.last_known_cost_baht)
- `product_name_lookup` (lookup → Products.display_name)

### Products (for slow movers / all-time top sellers)
- `current_stock` (number)
- `total_units_sold` (rollup — sum of Sale Line Items quantity)
- `total_revenue` (rollup — sum of Sale Line Items line_total)
- `stock_value_cost` (formula — current_stock × last_known_cost_baht)
- `category` (singleSelect)

### Daily Person Draws (for cash flow)
- `date` (date)
- `person` (singleSelect)
- `salary` (currency)
- `food` (currency)
- `other` (currency)
- `total` (formula — salary + food + other)

---

## Testing Checklist

1. **Sales summary** — "เดือนนี้ขายไปเท่าไหร่" → get_sales_summary fires, shows totals + payment breakdown
2. **Sales period** — "ยอดขายสัปดาห์ที่แล้ว" → correct date range, correct numbers
3. **Purchase summary** — "เดือนนี้ซื้อสินค้าเท่าไหร่" → shows purchase totals by supplier
4. **Margin analysis** — "กำไรเดือนนี้เท่าไหร่" or "what's our margin this month" → revenue, COGS, gross profit, margin %
5. **Slow movers** — "สินค้าอะไรค้างสต็อก" → list of products with stock but low/no sales
6. **Top sellers** — "สินค้าขายดีเดือนนี้" → ranked list by revenue or quantity
7. **Cash flow** — "กระแสเงินสดเดือนนี้" → revenue in, purchases/expenses/draws out, net
8. **English queries** — "What's our gross margin this month?" → responds in English with numbers
9. **Custom date range** — "ยอดขาย 1-15 พฤษภาคม" → correct custom range
10. **All-time top sellers** — "สินค้าขายดีตลอด" → uses Products table rollups directly

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| Timezone issues | Always use `Asia/Bangkok` timezone for date calculations. The shop is in Thailand. |
| dateTime vs date fields | Sales/Purchases use dateTime (ISO string). Expenses/Draws use date (YYYY-MM-DD). Filter formulas may differ. |
| Too many records | Sale Line Items could have thousands of records. Use `maxRecords` parameter and note if results are partial. |
| Lookup fields return arrays | `product_cost_lookup` and `product_name_lookup` are lookup fields — they return arrays like `[45]`. Access with `field[0]` or default to 0. |
| Division by zero | When computing averages or percentages, guard against dividing by zero. |
| Null/undefined fields | Many fields may be null (no sales, no cost set). Default to 0 for numeric computations. |
| Airtable formula encoding | Same Thai text encoding rules as always — manual encoding, no URLSearchParams for formulas. |

---

## After Phase 4 Works

Phase 5 is polish: navigation integration, error handling improvements, the Opus model switcher for deep analysis, and UX refinements.
