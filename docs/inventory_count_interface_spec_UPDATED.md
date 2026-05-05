# Inventory Count Interface — Spec

> **Working title:** นับสต็อก (Stock Count)
> **Users:** Mint (primary, currently doing the initial count), Mai (ongoing counts)
> **Platform:** `/inventory` route in the existing `pinit-daily` Next.js app (Vercel)
> **Trigger:** User navigates to `/inventory` from the app home or direct URL
> **Status:** ✅ BUILT AND DEPLOYED — Live at pinit-daily.vercel.app/inventory (May 2026)
>
> ### Build History
> - **May 4-5, 2026:** Built and deployed as part of the pinit-daily app.
> - Several field name and search encoding issues resolved during build (see §7).

---

## 1. Why Build This

Mint and Mai are in the middle of a **first-ever physical inventory count** of ~300 products in the shop. They're currently doing it in the Airtable mobile app — searching for products, updating stock counts, taking photos, marking items as counted, then switching to a separate View to print QR labels. It works, but it's clunky:

- **Searching in Airtable is slow** — the Products table has 2,473 records with long URLs in formula fields. The mobile app lags.
- **Too many steps across too many screens** — update stock → take photo → check "counted" → navigate to print view → tap print button → wait for label API → print. That's 6+ taps across 2 views.
- **No save confirmation** — Airtable auto-saves, but Mint can't tell if her edits persisted or if the app glitched.
- **No progress visibility** — how many of 300 have been counted? How many remain? Which categories are done?

The custom interface collapses this entire workflow into a single screen with instant search, inline editing, one-tap label printing, and clear progress tracking.

---

## 2. What Was Built

### Features (All Working)

- **Search** — multi-word Thai + case-insensitive English + partial SKU search, debounced 300ms, max 20 results
- **Inline edit card** — expands on tap, editable: stock count (stepper), cost, sell price, repair price, display name, notes, counted checkbox
- **Create new product** — form with category dropdown, stock stepper, price fields, auto-counted badge
- **SKU polling after create** — polls every 2 seconds for 30 seconds after product creation, with retry button, transitions to print-ready state when SKU arrives
- **Print labels** — 4 size buttons (40×20, 40×30, 70×30, 70×50) opening Render.com label API with SKU, name, sell price, and conditional repair price
- **Product photo** — two-button camera (📷 Take Photo with `capture="environment"` + 🖼️ Choose Photo without) for Android compatibility. Compressed client-side, uploaded to Vercel Blob.
- **Progress tracking** — counted/total by category, progress bar, recently counted list (last 10)
- **Toast notifications** — full-width bottom toast for save/create confirmations (green success, red error)

### UI Design
- Same dark theme as close-out system (slate-900 bg, slate-800 cards, sky-400 accent)
- Thai-primary labels with English subtitles
- Mobile-first (max-w-md container)
- Font: Sarabun (Google Fonts)

---

## 3. Technical Architecture

### 3.1 Files Created

```
app/
├── inventory/
│   └── page.tsx                      # Main inventory count page (search + progress + recent)
└── api/
    ├── inventory/
    │   ├── search/route.ts           # GET: Product search (?q=)
    │   ├── update/route.ts           # POST: Update product fields by record ID
    │   ├── create/route.ts           # POST: Create new product
    │   ├── progress/route.ts         # GET: Count progress + recently counted
    │   └── record/route.ts           # GET: Single product by ?id= (for SKU polling)
    └── upload/route.ts               # POST: Upload base64 image to Vercel Blob

components/
├── inventory/
│   ├── product-edit-card.tsx         # Inline edit card (stock, prices, photo, labels, display_name)
│   └── create-product-form.tsx       # New product form with SKU polling + print-ready transition
├── toast.tsx                         # Toast notification context + provider
└── providers.tsx                     # Client wrapper for toast provider
```

### 3.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inventory/search?q=term` | GET | Multi-word product search across display_name, original_name, and SKU |
| `/api/inventory/update` | POST | Update product fields by Airtable record ID |
| `/api/inventory/create` | POST | Create new product record |
| `/api/inventory/progress` | GET | Counted/total by category + last 10 recently counted |
| `/api/inventory/record?id=recXXX` | GET | Single product lookup by record ID (used for SKU polling) |
| `/api/upload` | POST | Upload base64 image to Vercel Blob, return public URL |

### 3.3 Search Implementation

The search was the most complex piece, with several iterations to handle Thai text correctly.

**Final implementation:**
- Query is split on spaces into individual words
- Each word generates an OR clause searching across `display_name`, `original_name`, and `sku`
- Multiple words are joined with AND (all words must match)
- Thai-only words: `SEARCH("term", {display_name})` — no `LOWER()` (breaks Thai in Airtable)
- Words with Latin characters: `SEARCH("term", LOWER({display_name}))` — `LOWER()` for case-insensitive English
- SKU field: `SEARCH("term", {sku})` — no `LOWER()` (barcode field type)
- The `filterByFormula` is built manually (not via `URLSearchParams`) because `URLSearchParams.toString()` double-encodes Thai characters

**Example:** Searching "เสื้อสูบ w125i" builds:
```
AND(
  OR(SEARCH("เสื้อสูบ", {display_name}), SEARCH("เสื้อสูบ", {original_name}), SEARCH("เสื้อสูบ", {sku})),
  OR(SEARCH("w125i", LOWER({display_name})), SEARCH("w125i", LOWER({original_name})), SEARCH("w125i", {sku}))
)
```

### 3.4 Label Printing

Uses the existing Render.com label API. URL format:
```
NEXT_PUBLIC_LABEL_API_URL + "/label/" + encodeURIComponent(sku) + "/" + size
  + "?name=" + encodeURIComponent(display_name)
  + "&price=" + sell_price
  + (repair_price > 0 && show_repair_on_label ? "&repair=" + repair_price : "")
```

Four sizes: `40x20`, `40x30`, `70x30`, `70x50`. Buttons only shown when product has a SKU.

### 3.5 SKU Polling After Create

When a new product is created:
1. Record is created in Airtable (no SKU yet — generated by Airtable automation)
2. Form transitions to "Generating SKU..." spinner state
3. Polls `GET /api/inventory/record?id={recordId}` every 2 seconds
4. Up to 15 attempts (30 seconds total)
5. When `sku` field is populated → transitions to print-ready state showing product name, SKU, and 4 label buttons
6. If timeout → shows "SKU not ready" with a "🔄 Try Again" button to restart polling
7. "Done" button closes and resets form

### 3.6 Photo Upload

- Two buttons for Android compatibility: "📷 ถ่ายรูป (Take Photo)" with `capture="environment"` and "🖼️ เลือกรูป (Choose Photo)" without
- Images compressed client-side (max 1200px, JPEG quality 0.7)
- Uploaded to Vercel Blob via `/api/upload` → returns public URL
- URL passed to Airtable as attachment: `[{url: "https://..."}]`
- Product photos stored in `product_photo` field (attachment type)

---

## 4. Airtable Fields Used

Products table fields accessed by this interface:

| Field | Type | Read/Write | Notes |
|-------|------|-----------|-------|
| `sku` | Barcode | Read | Auto-generated by Airtable automation. `LOWER()` doesn't work on this field type. |
| `display_name` | Text | Read + Write | Primary search target. Editable in edit card. |
| `original_name` | Text | Read | Secondary search target. Many records have this empty. |
| `category` | Single select | Read + Write | Used for progress grouping and create form dropdown. |
| `current_stock` | Number | Read + Write | Stepper input (+/- buttons). |
| `last_known_cost_baht` | Number | Read + Write | Cost price. |
| `last_known_sell_price_baht` | Number | Read + Write | Sell price. Used in label URL. |
| `repair_price_total` | Number | Read + Write | Repair price including labor. |
| `has_been_counted` | Checkbox | Read + Write | Marks product as physically counted. |
| `counted_date` | Date | Write | Set to today when counted. **Created during build** — didn't exist before. |
| `counted_by` | Text | Write | Set to "app" when counted. **Created during build** — didn't exist before. |
| `product_photo` | Attachment | Read + Write | Product photo. Field name is `product_photo` (lowercase), not `Product Photo`. |
| `show_repair_on_label` | Checkbox | Read | Controls whether repair price appears on printed label. |
| `notes` | Long text | Read + Write | Product notes. |

---

## 5. Environment Variables

All existing — no new env vars needed beyond what the close-out system already uses:

```
AIRTABLE_API_KEY=pat...               # Same token as close-out
AIRTABLE_BASE_ID=app...               # Same base
NEXT_PUBLIC_LABEL_API_URL=https://pinit-label-api.onrender.com  # Label printing API
BLOB_READ_WRITE_TOKEN=...             # Vercel Blob for photo uploads
```

---

## 6. Known Limitations & Future Enhancements

### Current Limitations
- **No QR scanning** — products found via text search only. QR scanning planned for the AI chat interface (Phase 3 of that build).
- **No batch mode** — each product is searched and edited individually.
- **No offline support** — requires internet connection.
- **Photo upload occasionally fails** — large photos from high-res cameras can exceed size limits even after compression. Graceful error shown.
- **No unsaved changes warning** — if user navigates away mid-edit, changes are lost silently.

### Future Enhancements
- **QR code scanning** — scan existing QR labels to jump to product edit card (uses `html5-qrcode` library, planned for AI chat interface)
- **Batch counting mode** — scan → count → next → scan → count → next rapid-fire flow
- **Stock discrepancy report** — after initial count, show products where counted ≠ system stock
- **Offline support** — cache product list, sync when online

---

## 7. Build Issues & Resolutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Field `Product Photo` not found | Airtable field name is `product_photo` (lowercase) | Changed to `product_photo` in search route |
| Field `counted_date` not found | Field didn't exist in Products table | Created the field in Airtable (Date type) |
| Field `counted_by` not found | Field didn't exist in Products table | Created the field in Airtable (Single line text) |
| Thai search returning empty | `URLSearchParams` double-encodes Thai text | Built query string manually with `encodeURIComponent()` |
| `LOWER()` breaking Thai search | Airtable `LOWER()` doesn't work with Thai characters | Removed `LOWER()` for Thai words, kept for Latin |
| Case-sensitive English search | "w125i" didn't match "W125i" | Added `LOWER()` for words containing Latin chars |
| Partial SKU search failing | Pure-digit queries missed `hasLatin` regex, excluded SKU from search | Added SKU search to both Latin and non-Latin paths |
| Dynamic route `[recordId]` not matching | Next.js 14 couldn't resolve the bracketed directory | Replaced with query param: `/api/inventory/record?id=` |
| SKU polling always timing out | Next.js caching fetch responses | Added `cache: 'no-store'` to ALL Airtable fetches |
| Photo 413 error | Base64 too large for request body | Client-side compression (max 1200px, quality 0.7) |
| Photo 422 INVALID_ATTACHMENT_OBJECT | Airtable rejects base64 data URLs | Upload to Vercel Blob → pass public URL to Airtable |
| Android camera not available | Removing `capture` made some devices show gallery only | Two buttons: Take Photo (with capture) + Choose Photo (without) |
| Category create error | Extra quotes wrapping category value | Strip quotes with regex |
| Recently counted list stale | Airtable responses cached by Next.js | `cache: 'no-store'` on all fetches |

---

*Created: May 2026*
*Author: Ari + Claude*
*Built: May 4-5, 2026*
*Deployed: pinit-daily.vercel.app/inventory*
*Part of: pinit-daily Next.js app*
*Dependencies: Airtable Products table, Render.com label API, Vercel Blob*
