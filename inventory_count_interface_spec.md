# Inventory Count Interface — Spec

> **Working title:** นับสต็อก (Stock Count)
> **Users:** Mint (primary, currently doing the initial count), Mai (ongoing counts)
> **Platform:** New page in the existing `pinit-daily` Next.js app (Vercel)
> **Trigger:** User navigates to `/inventory` from the app home or direct URL
> **Status:** Spec — ready to build

---

## 1. Why Build This

Mint and Mai are in the middle of a **first-ever physical inventory count** of ~300 products in the shop. They're currently doing it in the Airtable mobile app — searching for products, updating stock counts, taking photos, marking items as counted, then switching to a separate View to print QR labels. It works, but it's clunky:

- **Searching in Airtable is slow** — the Products table has 2,473 records with long URLs in formula fields. The mobile app lags.
- **Too many steps across too many screens** — update stock → take photo → check "counted" → navigate to print view → tap print button → wait for label API → print. That's 6+ taps across 2 views.
- **No save confirmation** — Airtable auto-saves, but Mint can't tell if her edits persisted or if the app glitched. She created a workaround formula (`Last Modified by Mint`) just to verify saves.
- **No progress visibility** — how many of 300 have been counted? How many remain? Which categories are done?

A custom interface can collapse this entire workflow into a single screen with instant search, inline editing, one-tap label printing, and clear progress tracking.

---

## 2. User Flow

### Entry: Search or Create

The screen opens with a prominent search bar and a "Create New" button. No product list loads by default — with 2,473 products, rendering a list on mobile is wasteful. Search-first.

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  📦 นับสต็อก — Inventory Count                    │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │ 🔍 ค้นหาสินค้า... (Search products)       │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  [ ➕ สินค้าใหม่ (New Product) ]                   │
│                                                   │
│  ── ความคืบหน้า (Progress) ──                     │
│                                                   │
│  นับแล้ว: 47 / 312 สินค้าที่มีสต็อก (15%)        │
│  [████░░░░░░░░░░░░░░░░░░░░░░░░░░]                │
│                                                   │
│  หมวดหมู่:                                        │
│  ✅ น้ำมันเครื่อง (12/12)                          │
│  🔄 อะไหล่เลื่อยยนต์ (8/24)                       │
│  ⬜ ผ้าเบรก (0/18)                                │
│  ⬜ หัวเทียน (0/9)                                 │
│  ... (collapsible)                                │
│                                                   │
│  ── ล่าสุดที่นับ (Recently Counted) ──             │
│  หัวเทียน BP8ES — 28 ชิ้น — 2 นาทีที่แล้ว        │
│  น้ำมันเครื่อง Honda 1L — 15 ชิ้น — 5 นาทีที่แล้ว │
│  ...                                              │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Search behavior:**
- Searches `display_name` and `original_name` fields simultaneously
- Debounced (300ms) — results appear as you type
- Minimum 2 characters to trigger search
- Returns max 20 results, sorted by relevance
- Each result shows: `display_name`, `category`, `current_stock`, `has_been_counted` status, and a thumbnail if `Product Photo` exists

### Product Found → Inline Edit Card

When the user taps a search result, the product expands into an **edit card** — all fields editable inline, no separate screen.

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  [product photo thumbnail]                │    │
│  │                                           │    │
│  │  PD69002125                               │    │
│  │  โซ่ 12"-หัวโต (25T) STIHL               │    │
│  │  อะไหล่เลื่อยยนต์ (Chainsaw Parts)        │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  จำนวนสต็อก (Stock Count):                        │
│  ┌─────────┐                                      │
│  │  [  28 ]│  [ - ]  [ + ]                       │
│  └─────────┘                                      │
│  ระบบเดิม: 0 → ปรับเป็น: 28                       │
│                                                   │
│  หมวดหมู่ (Category):                             │
│  [ อะไหล่เลื่อยยนต์ (Chainsaw Parts)  ▼ ]        │
│                                                   │
│  ราคาทุน (Cost):            ราคาขาย (Sell):       │
│  ┌─────────┐                ┌─────────┐           │
│  │ [  230 ]│ ฿              │ [  310 ]│ ฿        │
│  └─────────┘                └─────────┘           │
│                                                   │
│  ราคาซ่อมรวมค่าแรง (Repair Price):                │
│  ┌─────────┐                                      │
│  │ [      ]│ ฿                                   │
│  └─────────┘                                      │
│                                                   │
│  หมายเหตุ (Notes):                                │
│  ┌───────────────────────────────────────────┐    │
│  │ [                                        ]│    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  📷 รูปสินค้า (Product Photo):                    │
│  ┌──────────────┐                                 │
│  │ [current img] │  [ 📷 ถ่ายใหม่ ]               │
│  └──────────────┘  [ Take new photo ]             │
│                                                   │
│  ☐ → ☑ นับแล้ว (Counted) ✓                       │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  💾 บันทึก (Save)                         │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  🏷 พิมพ์ฉลาก (Print Label):                     │
│  [ 40×20 ] [ 40×30 ] [ 70×30 ] [ 70×50 ]         │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Field behaviors:**

- **Stock Count:** Number input with +/- stepper buttons. Shows the old value ("ระบบเดิม: 0") and the new value for visual confirmation. Large tap target for the number — Mint is doing this on a phone while holding products.
- **Sell Price:** Number input. Pre-filled with `last_known_sell_price_baht`. Editable.
- **Category:** Dropdown/select. Pre-filled with current category. Options loaded from the existing category values in Airtable.
- **Product Photo:** Shows current photo thumbnail if one exists. "Take new photo" button opens the camera. New photo replaces the existing one.
- **Counted checkbox:** Tapping this checks `has_been_counted`. It's visually prominent — a large toggle, not a tiny checkbox.
- **Save button:** Writes all changes to Airtable via API. On success: green flash + "✅ บันทึกแล้ว" toast, and the card collapses back to the search results. On failure: red flash + retry button.
- **Print Label buttons:** Each opens the existing Render.com label API URL in a new tab (same URLs already in the Airtable `print_40x20`, `print_40x30`, etc. formula fields). The label renders as a PNG in the browser, and Mint prints from there.

**Save confirmation UX:**
- The Save button shows a loading spinner while the API call is in flight.
- On success: button turns green, shows "✅ บันทึกแล้ว (Saved!)" for 2 seconds.
- The "Recently Counted" list on the main screen updates immediately.
- If the user navigates away without saving, show a warning: "มีข้อมูลที่ยังไม่บันทึก (Unsaved changes)".

### Product Not Found → Create New

If the search returns no results, or the user taps "สินค้าใหม่ (New Product)":

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  ➕ สร้างสินค้าใหม่ (Create New Product)           │
│                                                   │
│  ชื่อสินค้า (Product Name): *                     │
│  ┌───────────────────────────────────────────┐    │
│  │ [                                        ]│    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  หมวดหมู่ (Category): *                           │
│  [ เลือกหมวดหมู่...                      ▼ ]      │
│                                                   │
│  จำนวนสต็อก (Stock Count): *                      │
│  ┌─────────┐                                      │
│  │  [    ] │  [ - ]  [ + ]                       │
│  └─────────┘                                      │
│                                                   │
│  ราคาทุน (Cost):            ราคาขาย (Sell):       │
│  ┌─────────┐                ┌─────────┐           │
│  │ [      ]│ ฿              │ [      ]│ ฿        │
│  └─────────┘                └─────────┘           │
│                                                   │
│  ราคาซ่อมรวมค่าแรง (Repair Price Total):          │
│  ┌─────────┐                                      │
│  │ [      ]│ ฿                                   │
│  └─────────┘                                      │
│                                                   │
│  หมายเหตุ (Notes):                                │
│  ┌───────────────────────────────────────────┐    │
│  │ [                                        ]│    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  📷 รูปสินค้า (Product Photo):                    │
│  [ 📷 ถ่ายรูป (Take Photo) ]                      │
│                                                   │
│  ☑ นับแล้ว (auto-checked for new products)        │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  💾 สร้างและบันทึก (Create & Save)         │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ⚡ SKU จะถูกสร้างอัตโนมัติ                       │
│     (SKU will be auto-generated)                  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Create behavior:**
- Required fields: `display_name`, `current_stock`, `category`
- SKU: **Not set by this interface.** The existing Airtable automation generates the SKU when a record is created. The interface creates the record without a SKU, and the automation fills it in.
- `has_been_counted`: Auto-checked for new products (you just counted it — you're holding it).
- On successful create: show the edit card view of the new product (now with the auto-generated SKU), and the print label buttons become active.
- If Mint needs to print a label immediately after creation, she may need to wait a few seconds for the Airtable automation to generate the SKU (since the label API needs the SKU). The UI should handle this: poll for SKU every 2 seconds, show "⏳ กำลังสร้าง SKU..." until it appears, then enable the print buttons.

---

## 3. Progress Tracking

The progress section on the main screen gives Mint real-time visibility into the count.

**Overall progress:**
- Numerator: count of products where `has_been_counted` = checked AND `current_stock` > 0
- Denominator: count of products where `current_stock` > 0 (estimated — products with stock are the ones that need counting)
- Note: Products with `current_stock` = 0 AND `has_been_counted` = unchecked are *not* in the denominator — they're catalog items not physically present. But if someone counts a product and sets stock to 0, that still counts as "counted."

Actually, simpler: 
- **Counted:** count of products where `has_been_counted` = checked
- **Total in scope:** This needs to be a configurable number or based on a View filter. For the initial count, it's approximately 300 (the products physically in the shop). We can use: count of products where `current_stock` > 0 OR `has_been_counted` = checked.

**Per-category progress:**
- Group by `category`, show counted/total per category
- Categories with 100% completion get a ✅
- Categories with partial completion get a 🔄 with count
- Categories with 0% get ⬜

**Recently counted:**
- Last 10 products where `has_been_counted` was marked, sorted by `Last Modified` desc
- Shows: display_name, stock count, time ago
- This is Mint's "verification list" — she can glance and confirm her recent edits saved

---

## 4. Technical Architecture

This is a new page in the existing `pinit-daily` Next.js app. Same stack, same Airtable API connection.

### 4.1 New Files

```
app/
├── inventory/
│   └── page.tsx              # Main inventory count page
├── api/
│   ├── products/
│   │   ├── search/
│   │   │   └── route.ts      # GET: Search products by keyword
│   │   ├── [sku]/
│   │   │   └── route.ts      # PATCH: Update product fields
│   │   ├── create/
│   │   │   └── route.ts      # POST: Create new product
│   │   └── progress/
│   │       └── route.ts      # GET: Count progress stats
│   └── ...existing routes
components/
├── inventory/
│   ├── search-bar.tsx        # Search input with debounce
│   ├── product-card.tsx      # Inline edit card for existing product
│   ├── create-product.tsx    # New product form
│   ├── progress-bar.tsx      # Overall + per-category progress
│   ├── recent-counted.tsx    # Recently counted list
│   ├── label-buttons.tsx     # Print label button row
│   └── photo-upload.tsx      # Camera/photo component
```

### 4.2 API Routes

**GET `/api/products/search?q=หัวเทียน`**

```typescript
// Search products by display_name and original_name
const results = await airtable.select('Products', {
  filterByFormula: `OR(
    SEARCH(LOWER("${query}"), LOWER({display_name})),
    SEARCH(LOWER("${query}"), LOWER({original_name}))
  )`,
  fields: [
    'sku', 'display_name', 'original_name', 'category',
    'current_stock', 'last_known_sell_price_baht',
    'last_known_cost_baht', 'has_been_counted', 'Product Photo',
  ],
  maxRecords: 20,
  sort: [{ field: 'display_name', direction: 'asc' }],
});
```

**PATCH `/api/products/[sku]`**

```typescript
// Update product fields — only send changed fields
const updateFields: Record<string, any> = {};
if (data.current_stock !== undefined) updateFields.current_stock = data.current_stock;
if (data.last_known_sell_price_baht !== undefined) updateFields.last_known_sell_price_baht = data.last_known_sell_price_baht;
if (data.last_known_cost_baht !== undefined) updateFields.last_known_cost_baht = data.last_known_cost_baht;
if (data.repair_price_total !== undefined) updateFields.repair_price_total = data.repair_price_total;
if (data.category !== undefined) updateFields.category = data.category;
if (data.has_been_counted !== undefined) updateFields.has_been_counted = data.has_been_counted;
if (data.notes !== undefined) updateFields.notes = data.notes;
// Product Photo requires Airtable attachment format
if (data.product_photo) updateFields['Product Photo'] = [{ url: data.product_photo }];

// Look up record by SKU first, then update by record ID
const records = await airtable.select('Products', {
  filterByFormula: `{sku} = "${sku}"`,
  maxRecords: 1,
});
const recordId = records[0].id;
await airtable.update('Products', recordId, updateFields);
```

**POST `/api/products/create`**

```typescript
const record = await airtable.create('Products', {
  display_name: data.display_name,
  current_stock: data.current_stock,
  category: data.category,
  last_known_sell_price_baht: data.sell_price || null,
  last_known_cost_baht: data.cost || null,
  repair_price_total: data.repair_price || null,
  notes: data.notes || null,
  has_been_counted: true,
  // Product Photo if provided
  ...(data.product_photo ? { 'Product Photo': [{ url: data.product_photo }] } : {}),
});
// Return the record — the SKU will be generated by Airtable automation
// Frontend polls for SKU if it needs to print labels
return record;
```

**GET `/api/products/progress`**

```typescript
// Get count progress — uses Airtable's aggregation
const [counted, total] = await Promise.all([
  airtable.select('Products', {
    filterByFormula: `{has_been_counted} = TRUE()`,
    fields: ['category'],
    // We only need the count and category grouping
  }),
  airtable.select('Products', {
    filterByFormula: `OR({current_stock} > 0, {has_been_counted} = TRUE())`,
    fields: ['category'],
  }),
]);

// Group by category
const categoryProgress = groupBy(total, 'category').map(cat => ({
  category: cat.name,
  counted: counted.filter(r => r.category === cat.name).length,
  total: cat.records.length,
}));

return { counted: counted.length, total: total.length, categories: categoryProgress };
```

### 4.3 Photo Upload

Product photos need to go through an intermediary because Airtable's attachment API requires a publicly accessible URL. Options:

1. **Vercel Blob** (simplest) — upload photo to Vercel Blob Storage, get a URL, pass that URL to Airtable's attachment field.
2. **Base64 inline** — send base64 to API route, which uploads to Vercel Blob, then writes to Airtable. This keeps the frontend simple.

For v1, use Vercel Blob. The free tier includes 1GB storage, which is more than enough for product photos.

```typescript
// In the API route
import { put } from '@vercel/blob';

const blob = await put(`products/${sku}.jpg`, photoBuffer, {
  access: 'public',
  contentType: 'image/jpeg',
});

// Then write to Airtable
await airtable.update('Products', recordId, {
  'Product Photo': [{ url: blob.url }],
});
```

### 4.4 Label Printing

The label API already exists on Render.com. The URL format is:

```
https://pinit-label-api.onrender.com/label/{sku}/{size}?name={encoded_name}&price={price}
```

Sizes: `40x20`, `40x30`, `70x30`, `70x50`

The interface constructs these URLs client-side and opens them in a new tab via `window.open()`. The Render service returns a PNG that Mint prints from the browser.

**No changes needed to the label API.** The URLs are the same ones in the Airtable formula fields — we're just making them accessible from a faster interface.

**Label printing after creating a new product:** The label URL requires a SKU, which is generated by an Airtable automation. After creating a new product, the frontend polls `GET /api/products/[recordId]` every 2 seconds (up to 5 attempts) until the `sku` field is populated, then enables the print buttons.

---

## 5. Airtable Fields Reference

Verified from the Products table CSV export (May 2026):

| Field | Type | Used in this interface |
|-------|------|----------------------|
| `sku` | Auto-generated by automation | Display only (read) |
| `display_name` | Text | Search + edit + create |
| `original_name` | Text | Search only |
| `category` | Single select | Edit + create + progress grouping |
| `current_stock` | Number | Edit + create |
| `last_known_cost_baht` | Currency | Edit + create |
| `last_known_sell_price_baht` | Currency | Edit + create |
| `repair_price_total` | Currency | Edit + create |
| `notes` | Long text | Edit + create |
| `has_been_counted` | Checkbox | Edit + create + progress |
| `Product Photo` | Attachment | Edit + create (camera upload) |
| `print_40x20` | Formula (URL) | Label print button |
| `print_40x30` | Formula (URL) | Label print button |
| `print_70x30` | Formula (URL) | Label print button |
| `print_70x50` | Formula (URL) | Label print button |
| `Last Modified` | Auto | Recently counted sorting |
| `Last Modified By` | Auto | Verification (existing Mint formula) |

**Fields NOT used in this interface** (exist in table but not needed here): `margin_pct`, `repair_price_total`, `implied_labor_charge`, `is_repair_product`, `sourced_via`, `supplier_primary`, `vehicle_compatibility`, `engine_size_cc`, `fuel_system`, `part_type`, `is_restock_item`, `lead_time_days`, `notes`, `image_url`, `last_synced_at`, `barcode`, `stock_value_*`, `sell_through_rate`, `show_repair_on_label`, and various linked/rollup fields.

---

## 6. Performance Considerations

- **Search must be fast.** Airtable's `filterByFormula` with `SEARCH()` on 2,473 records is acceptable but not instant (~500ms-1s). For v1 this is fine. If it's too slow, we can cache product names in memory on the server (refresh every 5 minutes) and do the fuzzy match server-side, only hitting Airtable for the full record on selection.
- **Progress stats are expensive.** Fetching all products to count them hits Airtable's pagination (100 records per page). Cache the progress result for 30 seconds to avoid re-querying on every page load.
- **Don't fetch all products on page load.** The page should load empty (just the search bar + progress stats) and populate results only on search. This is why search-first is the right pattern.

---

## 7. Build Plan

This is a 1-day build on top of the existing `pinit-daily` app.

| Step | What | Est. Time |
|------|------|-----------|
| 1 | Build `/api/products/search` route | 30 min |
| 2 | Build search bar component with debounce | 30 min |
| 3 | Build product edit card (inline editing) | 1 hr |
| 4 | Build `/api/products/[sku]` PATCH route | 30 min |
| 5 | Build save flow with confirmation UX | 30 min |
| 6 | Build create new product form + POST route | 45 min |
| 7 | Build progress bar + category breakdown | 45 min |
| 8 | Build label print buttons (construct URLs, window.open) | 15 min |
| 9 | Build photo upload (camera → Vercel Blob → Airtable) | 45 min |
| 10 | Build recently counted list | 15 min |
| 11 | Add navigation from app home to /inventory | 10 min |
| 12 | Test on Mint's Android phone | 30 min |
| **Total** | | **~6 hours** |

### Testing Checklist

- [ ] Search returns relevant results for Thai product names
- [ ] Search returns results when typing partial names (e.g., "หัวเทียน" matches "หัวเทียน BP8ES NGK")
- [ ] Stock count edit saves correctly to Airtable
- [ ] Sell price edit saves correctly
- [ ] Category change saves correctly
- [ ] Photo upload works from Android camera
- [ ] Photo appears in Airtable Product Photo field after save
- [ ] has_been_counted checkbox persists
- [ ] Save confirmation shows clearly (green flash + toast)
- [ ] Print label buttons open correct URL in new tab
- [ ] Label PNG renders correctly with updated name/price
- [ ] New product creation works and SKU auto-generates
- [ ] Print buttons enable after SKU is generated for new product
- [ ] Progress bar updates after counting a product
- [ ] Recently counted list shows latest items
- [ ] Unsaved changes warning works when navigating away
- [ ] Page loads fast on mobile (< 2 seconds)

---

## 8. Future Enhancements

- **QR code scanning** — scan existing QR labels to jump directly to that product's edit card (instead of searching by name). Uses the same `html5-qrcode` library planned for the future sales form.
- **Batch mode** — count multiple products in sequence without returning to search. "Scan → count → next → scan → count → next" rapid-fire flow.
- **Stock discrepancy report** — after the initial count, show products where counted stock ≠ previous system stock. Export as CSV or display inline.
- **Offline support** — cache product list for offline counting, sync when back online. Useful if the inventory room has poor signal.

---

*Created: May 2026*
*Author: Ari + Claude*
*Part of: pinit-daily (Vercel)*
*Dependencies: Existing Airtable Products table, existing Render.com label API*
*Next step: Build it*
