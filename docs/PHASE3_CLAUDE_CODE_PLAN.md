# Phase 3: QR Scanner + Labels + Stock Count — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** It builds on the working Phase 1 + Phase 2 chat.

---

## What We're Building

Three features that integrate into the existing chat:

1. **QR Scanner** — camera-based QR code reader that scans product SKUs and injects them into the chat
2. **Print Label** tool — generates a label URL and opens it in a new browser tab
3. **Update Stock Count** tool — sets a product's stock level from a physical count

These complete the 📦 สต็อก (Stock) flow and add QR scanning to the 📗 ขาย (Sale) flow.

---

## New Dependencies

```bash
npm install html5-qrcode
```

---

## Files to Create / Modify

```
components/chat/qr-scanner.tsx       # NEW: Camera QR scanner component
lib/chat-tools.ts                     # ADD: print_label + update_stock_count tools
lib/chat-system-prompt.ts             # UPDATE: QR and stock flow instructions
app/chat/page.tsx                     # UPDATE: QR scanner trigger + label opening
```

---

## Part 1: QR Scanner Component (`components/chat/qr-scanner.tsx`)

A React component that opens the device camera, scans QR codes, and returns the decoded value.

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}
```

### Behavior:
- Opens rear camera (`facingMode: "environment"`)
- When a QR code is detected, calls `onScan(decodedText)` with the raw string (e.g., "PD69000071")
- Shows a close button to dismiss without scanning
- Auto-closes after successful scan
- Shows camera preview in a fixed overlay on top of the chat

### Key Implementation Notes:

**Use `Html5Qrcode` (not `Html5QrcodeScanner`)** — the scanner version renders its own UI which conflicts with our dark theme. Use the lower-level `Html5Qrcode` class for full control:

```typescript
const html5QrCode = new Html5Qrcode("qr-reader");

html5QrCode.start(
  { facingMode: "environment" },
  {
    fps: 10,
    qrbox: { width: 250, height: 250 },
  },
  (decodedText) => {
    // Success
    html5QrCode.stop();
    onScan(decodedText);
  },
  (errorMessage) => {
    // Ignore scan errors (normal during scanning)
  }
);
```

**Cleanup on unmount:**
```typescript
useEffect(() => {
  return () => {
    html5QrCode.stop().catch(() => {});
  };
}, []);
```

**UI Layout:**
```
┌─────────────────────────────────┐
│  ╳ ปิด                          │  ← Close button (top right)
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │     Camera Preview        │  │  ← Live camera feed
│  │     ┌─────────────┐      │  │
│  │     │  QR Target   │      │  │  ← Scan area overlay
│  │     └─────────────┘      │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  📷 สแกน QR Code               │  ← Status text
│  หันกล้องไปที่ QR Code บนฉลาก    │
└─────────────────────────────────┘
```

**Styling:**
- Fixed overlay: `fixed inset-0 z-50 bg-black/90`
- Camera container: centered, rounded
- Close button: absolute top-right, white text on semi-transparent bg
- Status text below camera in Thai

**Android camera note from build history:**
The existing app uses two separate buttons for camera access (Take Photo with `capture="environment"` + Choose Photo without). But for QR scanning, we only need the live camera feed via `getUserMedia`, which `html5-qrcode` handles internally. No need for the two-button pattern here.

---

## Part 2: QR Scanner Integration in Chat (`app/chat/page.tsx`)

### Add Scanner State

```typescript
const [showScanner, setShowScanner] = useState(false);
```

### Scanner Trigger — Camera Button in Input Bar

Add a camera icon button next to the text input:

```
┌────────────────────────┬───┬───┐
│ พิมพ์ข้อความ...        │📷│ ➤ │
└────────────────────────┴───┴───┘
```

```tsx
<button
  type="button"
  onClick={() => setShowScanner(true)}
  className="text-slate-400 hover:text-white px-2"
  disabled={isLoading}
>
  📷
</button>
```

### Scanner Result Handler

When the scanner returns a value:

```typescript
const handleQrScan = (value: string) => {
  setShowScanner(false);
  // Inject the scanned SKU into the chat
  append({ role: 'user', content: `สแกนได้: ${value}` });
};
```

Claude will see "สแกนได้: PD69000071" and call `lookup_product` with that SKU.

### Render Scanner Overlay

```tsx
{showScanner && (
  <QrScanner
    onScan={handleQrScan}
    onClose={() => setShowScanner(false)}
  />
)}
```

### Label Opening

The `print_label` tool returns a URL. When Claude calls this tool, the result includes a `labelUrl` field. We need to open this URL in a new tab.

Add this to the global document click handler (the same pattern we use for card actions):

In `tool-result-card.tsx`, the label tool result card should have:
```tsx
data-label-url={data.labelUrl}
```

In `page.tsx`, extend the global click handler:
```typescript
useEffect(() => {
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Card actions (existing)
    const card = target.closest('[data-card-action]');
    if (card) {
      const message = card.getAttribute('data-card-action');
      if (message) {
        append({ role: 'user', content: message });
      }
      return;
    }
    
    // Label printing
    const label = target.closest('[data-label-url]');
    if (label) {
      const url = label.getAttribute('data-label-url');
      if (url) {
        window.open(url, '_blank');
      }
    }
  };
  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}, [append]);
```

---

## Part 3: New Tools (`lib/chat-tools.ts`)

### Tool 9: `print_label`

**Description:** `พิมพ์ฉลาก QR Code สำหรับสินค้า (Generate a QR code label for a product). Returns a URL that opens the label in a new tab.`

**Parameters:**
```typescript
z.object({
  sku: z.string().describe('SKU ของสินค้า เช่น PD69000071'),
  size: z.enum(['40x20', '40x30', '70x30', '70x50']).describe('ขนาดฉลาก'),
})
```

**Execute logic:**

The label API is already running at Render.com. The URL format is:
```
https://pinit-label-api.onrender.com/label/{sku}/{size}?name={display_name}&price={sell_price}&repair={repair_price}
```

```typescript
execute: async ({ sku, size }) => {
  // Look up the product to get name and prices
  const products = await selectRecords('Products', {
    filterByFormula: `{sku} = "${sku}"`,
    fields: ['sku', 'display_name', 'last_known_sell_price_baht', 'repair_price_total', 'show_repair_on_label'],
    maxRecords: 1,
  });

  if (products.length === 0) {
    return { success: false, error: `ไม่พบสินค้า SKU: ${sku}` };
  }

  const product = products[0].fields;
  const name = encodeURIComponent(product.display_name || '');
  const price = product.last_known_sell_price_baht || 0;
  const repair = product.show_repair_on_label ? (product.repair_price_total || 0) : 0;

  const baseUrl = process.env.NEXT_PUBLIC_LABEL_API_URL || 'https://pinit-label-api.onrender.com';
  const labelUrl = `${baseUrl}/label/${sku}/${size}?name=${name}&price=${price}&repair=${repair}`;

  return {
    success: true,
    sku,
    size,
    productName: product.display_name,
    labelUrl,
  };
}
```

**Return shape:**
```typescript
{
  success: boolean;
  sku: string;
  size: string;
  productName: string;
  labelUrl: string;  // URL to open in new tab
}
```

### Tool 10: `update_stock_count`

**Description:** `อัปเดตจำนวนสต็อกจากการนับจริง (Update product stock from physical count). Sets current_stock, has_been_counted, counted_date, and counted_by.`

**Parameters:**
```typescript
z.object({
  product_record_id: z.string().describe('Airtable record ID ของสินค้า'),
  new_count: z.number().describe('จำนวนที่นับได้'),
  counted_by: z.string().optional().describe('ผู้นับ (default: Mai)'),
})
```

**Execute logic:**

```typescript
execute: async ({ product_record_id, new_count, counted_by }) => {
  // Get current stock for comparison
  const product = await getRecord('Products', product_record_id);
  const currentStock = product.fields.current_stock || 0;
  const difference = new_count - currentStock;

  // Update the product
  await updateRecord('Products', product_record_id, {
    current_stock: new_count,
    has_been_counted: true,
    counted_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    counted_by: counted_by || 'Mai',
  });

  return {
    success: true,
    productName: product.fields.display_name,
    sku: product.fields.sku,
    previousStock: currentStock,
    newStock: new_count,
    difference: difference,
  };
}
```

**Return shape:**
```typescript
{
  success: boolean;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  difference: number;  // positive = found more, negative = missing
}
```

---

## Part 4: New Tool Result Cards (`components/chat/tool-result-card.tsx`)

### LabelCard (from `print_label`)

```
┌──────────────────────────────────┐
│ 🏷 ฉลาก: หัวเทียน BP8ES         │
│ ขนาด: 40x30                      │
│ [🖨 เปิดฉลาก]                    │  ← clickable, opens URL
└──────────────────────────────────┘
```

- border-l-4 border-sky-400
- The "เปิดฉลาก" button has `data-label-url={data.labelUrl}`
- `cursor-pointer` on the button

```tsx
function LabelCard({ data }: { data: {
  success: boolean; error?: string;
  sku?: string; size?: string; productName?: string; labelUrl?: string;
}}) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ พิมพ์ฉลากไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">🏷 ฉลาก: {data.productName}</div>
      <div className="text-xs text-slate-400 mt-1">SKU: {data.sku} | ขนาด: {data.size}</div>
      <button
        data-label-url={data.labelUrl}
        className="mt-2 text-sm bg-sky-800 text-sky-200 px-3 py-1 rounded-full cursor-pointer active:bg-sky-700"
      >
        🖨 เปิดฉลาก
      </button>
    </div>
  );
}
```

### StockCountCard (from `update_stock_count`)

```
┌──────────────────────────────────┐
│ ✅ อัปเดตสต็อกเรียบร้อย!         │
│ หัวเทียน BP8ES                    │
│ เดิม: 28 → ใหม่: 25 (ขาด 3)     │
│ [🏷 พิมพ์ฉลาก] [📷 สแกนต่อ]     │
└──────────────────────────────────┘
```

- border-l-4 border-purple-400
- If difference < 0: show "ขาด X" in orange
- If difference > 0: show "เกิน X" in green
- If difference = 0: show "ตรง ✓" in green
- "พิมพ์ฉลาก" button: `data-card-action={`พิมพ์ฉลาก ${data.sku} ขนาด 40x30`}`
- "สแกนต่อ" button: triggers QR scanner (use `data-scan-trigger="true"`)

For the scan trigger, add to the global click handler in page.tsx:
```typescript
// Scan trigger
const scanTrigger = target.closest('[data-scan-trigger]');
if (scanTrigger) {
  setShowScanner(true);
}
```

```tsx
function StockCountCard({ data }: { data: {
  success: boolean; error?: string;
  productName?: string; sku?: string;
  previousStock?: number; newStock?: number; difference?: number;
}}) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ อัปเดตสต็อกไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }

  const diff = data.difference || 0;
  const diffText = diff < 0 ? `ขาด ${Math.abs(diff)}` : diff > 0 ? `เกิน ${diff}` : 'ตรง ✓';
  const diffColor = diff < 0 ? 'text-orange-300' : 'text-green-300';

  return (
    <div className="bg-slate-800 border-l-4 border-purple-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ อัปเดตสต็อกเรียบร้อย!</div>
      <div className="text-sm text-slate-100 mt-1">{data.productName}</div>
      <div className="text-sm text-slate-300 mt-1">
        เดิม: {data.previousStock} → ใหม่: {data.newStock}
        <span className={`ml-2 ${diffColor}`}>({diffText})</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          data-card-action={`พิมพ์ฉลาก ${data.sku} ขนาด 40x30`}
          className="text-xs bg-sky-800 text-sky-200 px-3 py-1 rounded-full cursor-pointer"
        >
          🏷 พิมพ์ฉลาก
        </button>
        <button
          data-scan-trigger="true"
          className="text-xs bg-slate-700 text-slate-200 px-3 py-1 rounded-full cursor-pointer"
        >
          📷 สแกนต่อ
        </button>
      </div>
    </div>
  );
}
```

### Add to the switch statement in ToolResultCard:

```typescript
case "print_label":
  return <LabelCard data={data as Parameters<typeof LabelCard>[0]["data"]} />;
case "update_stock_count":
  return <StockCountCard data={data as Parameters<typeof StockCountCard>[0]["data"]} />;
```

---

## Part 5: System Prompt Update (`lib/chat-system-prompt.ts`)

Add these sections:

```
QR SCANNER:
- The chat has a 📷 button in the input bar that opens a QR scanner.
- When a user scans a QR code, you receive a message like "สแกนได้: PD69000071"
- Call lookup_product with the scanned SKU to show the product details.
- If in a sale flow, continue with quantity and payment after showing the product.
- If in a stock count flow, show current stock and ask for the physical count.

STOCK COUNT FLOW (📦 สต็อก):
When user taps 📦 สต็อก or says they want to count stock:
1. Ask them to scan a QR code or type a product name/SKU
2. Call lookup_product to show the product and current stock
3. Ask "นับได้กี่ชิ้น?" (How many did you count?)
4. Show the difference: ขาด (missing), เกิน (over), or ตรง (exact match)
5. Confirm before updating: "อัปเดตสต็อกจาก X เป็น Y ไหมคะ?"
6. Call update_stock_count after confirmation
7. After updating, ask: "สแกนต่อ หรือ พิมพ์ฉลาก?"

LABEL PRINTING:
- When user asks to print a label, or after a stock count, use the print_label tool.
- Default label size is 40x30 unless user specifies otherwise.
- Available sizes: 40x20 (เล็ก), 40x30 (กลาง), 70x30 (ยาว), 70x50 (ใหญ่)
- The label URL opens in a new browser tab automatically.
- After printing, ask if they want to print another size or continue with other tasks.
```

---

## Part 6: Product Card — Add Label Button

Update the existing ProductCard in `tool-result-card.tsx` to include a label print button:

```tsx
{/* Add inside the product card, after the "แตะเพื่อขาย" text */}
<button
  data-card-action={`พิมพ์ฉลาก ${p.sku} ขนาด 40x30`}
  className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full cursor-pointer mt-1 inline-block"
  onClick={(e) => e.stopPropagation()} // prevent triggering the card's sale action
>
  🏷 พิมพ์ฉลาก
</button>
```

This way every product card has a quick label print button.

---

## Testing Checklist

1. **QR Scanner opens** — tap 📷 in input bar → camera opens
2. **QR scan works** — scan a product QR code → "สแกนได้: PD69000071" appears in chat → product card renders
3. **QR scan in sale flow** — tap 📗 ขาย → scan QR → product found → continue to quantity/payment
4. **QR scanner closes** — tap ╳ → scanner dismisses
5. **Stock count flow** — tap 📦 สต็อก → scan or search product → enter count → see difference → confirm → verify in Airtable (current_stock, has_been_counted, counted_date, counted_by all updated)
6. **Print label** — after stock count or from product card → label URL opens in new tab → label renders correctly
7. **Label sizes** — ask Claude for different sizes → correct URL generated
8. **Stock count card buttons** — "พิมพ์ฉลาก" opens label, "สแกนต่อ" opens scanner
9. **Product card label button** — tap 🏷 on product card → label prints (doesn't trigger sale flow)
10. **Scanner on Android** — test on Android Chrome (rear camera)
11. **Scanner permission** — first time asks for camera permission → grant → works

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| html5-qrcode import error in SSR | The component must be `'use client'` and use dynamic import or conditional `typeof window` check |
| Camera not stopping on unmount | Always call `html5QrCode.stop()` in the useEffect cleanup |
| Multiple scanner instances | Use a ref to store the Html5Qrcode instance, check if already running before starting |
| Label URL encoding | Product names with Thai characters need `encodeURIComponent` in the URL |
| Scanner overlay z-index | Must be z-50 or higher to appear above the chat messages |
| Product card label button triggering sale | Use `onClick={(e) => e.stopPropagation()}` on the label button to prevent bubbling to the card's sale action |
| update_stock_count field names | `has_been_counted` (checkbox), `counted_date` (date: YYYY-MM-DD), `counted_by` (singleLineText) |
| NEXT_PUBLIC_LABEL_API_URL | This env var is already set in Vercel: `https://pinit-label-api.onrender.com` |

---

## After Phase 3 Works

Phase 4 adds analytics/Oracle mode tools: sales summaries with date ranges, margin analysis, slow movers, top sellers, and cash flow summary.
