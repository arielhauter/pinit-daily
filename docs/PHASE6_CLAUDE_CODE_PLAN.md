# Phase 6: Work Order Photo Extraction + Audit — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** This adds Boot's completed work order photo processing.

---

## What We're Building

When Boot finishes a specialized repair, he returns the printed work order to Mai with handwritten additions:
- **Time log** — dates, start/end times, total hours worked
- **Additional parts** — parts he used beyond the original list
- **Handwritten notes** — observations, issues found, advice for customer
- **Total hours** — sum at the bottom of the time grid

Currently, Mai manually reads Boot's handwriting and types everything into Airtable Interface fields one by one. This is tedious and error-prone.

**The new flow:** Mai photographs the completed work order in the chat → Claude Vision extracts the handwritten data → Mai reviews/edits on screen → confirms → the repair job record is updated automatically.

This is the same pattern as the cash ledger close-out (Phase 1 of the original app), adapted for work orders.

---

## Files to Create / Modify

```
app/api/chat/extract-workorder/route.ts   # NEW: Claude Vision extraction endpoint
lib/workorder-schema.ts                    # NEW: Zod schema for extracted work order data
components/chat/workorder-review.tsx       # NEW: Editable review card for extracted data
lib/chat-tools.ts                          # ADD: update_repair_from_workorder tool
lib/chat-system-prompt.ts                  # UPDATE: work order photo instructions
app/chat/page.tsx                          # UPDATE: photo upload in chat
components/chat/tool-result-card.tsx       # UPDATE: work order result card
```

---

## Part 1: Work Order Photo Upload

### How it integrates with the chat

Mai can upload a work order photo in two ways:
1. **Context flow** — after viewing repair jobs, Claude asks "บูทซ่อมเสร็จแล้วหรือยัง? ถ่ายรูปใบสั่งงานได้เลยค่ะ"
2. **Direct upload** — Mai takes a photo and sends it to the chat

### Photo upload in chat (`app/chat/page.tsx`)

Add a photo upload button next to the QR scanner button in the input bar:

```
┌────────────────────────┬───┬───┬───┐
│ พิมพ์ข้อความ...        │📷│📋│ ➤ │
└────────────────────────┴───┴───┴───┘
                          QR  WO  Send
```

Use the same two-button camera pattern from the existing app (Android compatibility):

```tsx
const [showWorkOrderUpload, setShowWorkOrderUpload] = useState(false);

// Two file inputs for Android compatibility
<input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  className="hidden"
  onChange={handleWorkOrderPhoto}
/>
<input
  ref={galleryInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleWorkOrderPhoto}
/>
```

### Photo handling

When Mai selects/takes a photo:
1. Compress the image client-side (max 1200px, JPEG 0.7 quality — same as cash ledger)
2. Upload to Vercel Blob via the existing `/api/upload` endpoint
3. Send the blob URL to the extraction endpoint
4. Show the extraction results in an editable review card

```typescript
const handleWorkOrderPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Compress image
  const compressed = await compressImage(file, 1200, 0.7);
  
  // Upload to Vercel Blob
  const formData = new FormData();
  formData.append('file', compressed);
  const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
  const { url: imageUrl } = await uploadRes.json();

  // Send to chat as a user message with the image
  append({
    role: 'user',
    content: `📋 ถ่ายรูปใบสั่งงานซ่อม: ${imageUrl}`,
  });
};
```

**Image compression function** (reuse from the existing close-out system if available, or create):

```typescript
async function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}
```

---

## Part 2: Work Order Extraction Schema (`lib/workorder-schema.ts`)

Define the Zod schema for what Claude Vision should extract from the photographed work order:

```typescript
import { z } from 'zod';

export const WorkOrderExtractionSchema = z.object({
  // Job identification (printed on the form — used to match to existing repair job)
  job_id: z.number().describe('เลขที่งานซ่อม (printed at top of work order, e.g., 13)'),
  
  // Time log entries (Boot writes by hand in the time grid)
  time_entries: z.array(z.object({
    date: z.string().describe('วันที่ (DD/MM/YYYY or DD/MM/YY)'),
    start_time: z.string().describe('เวลาเริ่ม (HH:MM)'),
    end_time: z.string().describe('เวลาจบ (HH:MM)'),
    hours: z.number().describe('จำนวนชั่วโมง'),
    notes: z.string().optional().describe('หมายเหตุ'),
  })).describe('ตารางบันทึกเวลาที่บูทเขียน'),
  
  total_hours: z.number().describe('ชั่วโมงรวมทั้งหมด'),
  
  // Additional parts (Boot writes by hand if he used parts not on the original list)
  additional_parts: z.array(z.object({
    name: z.string().describe('ชื่ออะไหล่'),
    quantity: z.number().describe('จำนวน'),
  })).describe('อะไหล่เพิ่มเติมที่บูทเขียน (ถ้ามี)'),
  
  // Handwritten notes
  notes: z.string().optional().describe('หมายเหตุที่บูทเขียน'),
  
  // Boot's advice for Mai to tell customer
  advice_for_customer: z.string().optional().describe('คำแนะนำให้มายแจ้งลูกค้า (ถ้าบูทเขียนเพิ่ม)'),
  
  // Extraction confidence
  confidence: z.enum(['high', 'medium', 'low']).describe('ความมั่นใจในการอ่าน: high=ชัดเจน, medium=บางส่วนไม่ชัด, low=อ่านยาก'),
});

export type WorkOrderExtraction = z.infer<typeof WorkOrderExtractionSchema>;
```

---

## Part 3: Extraction Endpoint (`app/api/chat/extract-workorder/route.ts`)

This endpoint receives an image URL and uses Claude Vision to extract the handwritten data.

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { WorkOrderExtractionSchema } from '@/lib/workorder-schema';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { imageUrl } = await req.json();

  const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: WorkOrderExtractionSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageUrl,
          },
          {
            type: 'text',
            text: `นี่คือรูปถ่ายใบสั่งงานซ่อมจากร้านพินิจเจริญยนต์ (Pinit Charoen Yon auto parts shop)
            
ใบสั่งงานนี้มีส่วนที่พิมพ์ (ข้อมูลจากระบบ) และส่วนที่บูท (ช่างซ่อม) เขียนด้วยมือ

กรุณาอ่านข้อมูลที่เขียนด้วยมือ:

1. **เลขที่งาน (job_id)** — ตัวเลขใหญ่ด้านขวาบน
2. **ตารางบันทึกเวลา** — ตาราง "วันที่ | เริ่ม | จบ | ชม. | หมายเหตุ" ที่บูทเขียน
3. **ชั่วโมงรวม** — ตัวเลขในช่อง "ชั่วโมงรวม:" ใต้ตาราง
4. **อะไหล่เพิ่มเติม** — ตาราง "ชื่ออะไหล่ | จำนวน" ที่บูทเขียนเพิ่ม (อาจว่าง)
5. **หมายเหตุ** — ข้อความในช่อง "หมายเหตุ" (อาจว่าง)

ถ้าอ่านไม่ชัด ให้ใส่ค่าที่ใกล้เคียงที่สุดและตั้ง confidence เป็น "medium" หรือ "low"
ถ้าช่องไหนว่าง (บูทไม่ได้เขียน) ให้ข้ามไป

ลายมือบูทเป็นภาษาไทย อาจมีตัวเลขอารบิกหรือไทย (๐-๙)`,
          },
        ],
      },
    ],
  });

  return Response.json(result.object);
}
```

---

## Part 4: Work Order Review Component (`components/chat/workorder-review.tsx`)

An editable review card that shows the extracted data and lets Mai correct any misreads before confirming.

```typescript
'use client';

import { useState } from 'react';
import type { WorkOrderExtraction } from '@/lib/workorder-schema';

interface WorkOrderReviewProps {
  data: WorkOrderExtraction;
  onConfirm: (data: WorkOrderExtraction) => void;
  onCancel: () => void;
}
```

### Layout:

```
┌──────────────────────────────────────┐
│ 📋 ใบสั่งงาน #13                     │
│ ความมั่นใจ: 🟢 สูง                   │
│                                      │
│ ── บันทึกเวลา ──                     │
│ 20/04  09:00-12:00  3 ชม.            │  ← editable
│ 21/04  13:00-16:30  3.5 ชม.          │  ← editable
│ รวม: 6.5 ชม.                         │  ← editable
│                                      │
│ ── อะไหล่เพิ่มเติม ──                │
│ ลูกสูบ × 1                           │  ← editable
│ ซีลวาล์ว × 2                         │  ← editable
│                                      │
│ ── หมายเหตุ ──                       │
│ เปลี่ยนลูกสูบเพิ่ม สึกหรอมาก        │  ← editable
│                                      │
│ [✅ ยืนยันและอัปเดต]  [❌ ยกเลิก]     │
└──────────────────────────────────────┘
```

### Key features:

1. **All fields are editable** — Mai taps to edit any value
2. **Confidence indicator** — 🟢 high, 🟡 medium, 🔴 low
3. **Time entries** — each row editable (date, start, end, hours)
4. **Additional parts** — editable list, can add/remove entries
5. **Notes** — editable textarea
6. **Confirm button** — sends confirmed data back to the chat flow
7. **Cancel button** — discards extraction

### Styling:
- bg-slate-800, border-l-4 border-orange-400
- Editable fields: bg-slate-700 with subtle border, tap to edit
- Confidence colors: high=green-400, medium=yellow-400, low=red-400

### Confirm action:
When Mai taps confirm, use the data-card-action pattern:
```tsx
<button
  data-card-action={`ยืนยันใบสั่งงาน ${JSON.stringify(confirmedData)}`}
  className="bg-green-700 text-green-100 px-4 py-2 rounded-lg cursor-pointer"
>
  ✅ ยืนยันและอัปเดต
</button>
```

Wait — JSON in a data attribute won't work well. Instead, store the confirmed data in a ref/state and use a different approach:

**Better approach:** When Mai confirms, call a function that sends a structured message to the chat:

```tsx
const handleConfirm = () => {
  // Store the confirmed data in a way the chat can access
  window.dispatchEvent(new CustomEvent('workorder-confirm', { 
    detail: JSON.stringify(editedData) 
  }));
};
```

In page.tsx, listen for this event and send the data as a message:
```tsx
useEffect(() => {
  const handler = (e: Event) => {
    const data = (e as CustomEvent).detail;
    append({ 
      role: 'user', 
      content: `ยืนยันข้อมูลใบสั่งงาน: ${data}` 
    });
  };
  window.addEventListener('workorder-confirm', handler);
  return () => window.removeEventListener('workorder-confirm', handler);
}, [append]);
```

Claude will receive the confirmed data and call `update_repair_from_workorder`.

---

## Part 5: Update Repair Job Tool (`lib/chat-tools.ts`)

### Tool 17: `update_repair_from_workorder`

**Description:** `อัปเดตงานซ่อมจากใบสั่งงานที่บูทกรอก — ชั่วโมงจริง, อะไหล่เพิ่มเติม, หมายเหตุ (Update repair job from Boot's completed work order). IMPORTANT: Only call after Mai confirms the extracted data.`

**Parameters:**
```typescript
z.object({
  job_id: z.number().describe('เลขที่งานซ่อม'),
  actual_hours_seconds: z.number().describe('ชั่วโมงจริงรวม เป็นวินาที (เช่น 6.5 ชม. = 23400)'),
  additional_parts: z.array(z.object({
    product_name: z.string().describe('ชื่ออะไหล่'),
    quantity: z.number().describe('จำนวน'),
  })).optional().describe('อะไหล่เพิ่มเติม'),
  notes: z.string().optional().describe('หมายเหตุจากบูท'),
  boot_advice: z.string().optional().describe('คำแนะนำให้มายแจ้งลูกค้า'),
  completion_date: z.string().optional().describe('วันที่ซ่อมเสร็จ YYYY-MM-DD'),
})
```

**Execute logic:**

1. **Find the repair job by job_id (auto-number):**
```typescript
const jobs = await selectRecords('Repair Jobs', {
  filterByFormula: `{job_id} = ${job_id}`,
  maxRecords: 1,
});
if (jobs.length === 0) {
  return { success: false, error: `ไม่พบงานซ่อม #${job_id}` };
}
const jobRecord = jobs[0];
```

2. **Update the repair job record:**
```typescript
const updateFields: Record<string, any> = {
  actual_hours: actual_hours_seconds, // duration field — value in seconds
  status: 'เสร็จแล้ว (Complete)',
  completion_date_boot: completion_date || new Date().toISOString().split('T')[0],
};

if (notes) {
  updateFields.notes = notes;
}
if (boot_advice) {
  updateFields.boot_advice_for_mai = boot_advice;
}

await updateRecord('Repair Jobs', jobRecord.id, updateFields);
```

3. **Handle additional parts (if any):**
For each additional part, search Products → create Repair Job Parts record → link to job:

```typescript
if (additional_parts && additional_parts.length > 0) {
  for (const part of additional_parts) {
    // Search for the product
    const products = await selectRecords('Products', {
      filterByFormula: `SEARCH("${part.product_name}", {display_name})`,
      maxRecords: 1,
      fields: ['sku', 'display_name'],
    });
    
    if (products.length > 0) {
      // Create Repair Job Parts record
      await createRecord('Repair Job Parts', {
        repair_job: [jobRecord.id],
        product: [products[0].id],
        quantity: part.quantity,
      });
    } else {
      // Product not found — note it for Mai to handle
      unmatchedParts.push(part.product_name);
    }
  }
}
```

4. **Return:**
```typescript
return {
  success: true,
  jobId: job_id,
  jobRecordId: jobRecord.id,
  actualHours: actual_hours_seconds / 3600, // convert to hours for display
  partsAdded: matchedParts.length,
  unmatchedParts: unmatchedParts, // parts that couldn't be found in Products
  status: 'เสร็จแล้ว (Complete)',
  notes: notes || null,
};
```

**Important Airtable field notes:**
- `actual_hours` is a **duration** field — Airtable expects the value in **seconds** (e.g., 6.5 hours = 23400 seconds)
- `completion_date_boot` is a **date** field — YYYY-MM-DD
- `notes` is **richText**
- `boot_advice_for_mai` is **richText**
- `Repair Job Parts` table fields: `repair_job` (link to Repair Jobs), `product` (link to Products), `quantity` (number)

---

## Part 6: System Prompt Update (`lib/chat-system-prompt.ts`)

Add:

```
WORK ORDER PHOTO EXTRACTION (📋):
When Mai sends a photo of Boot's completed work order:
1. The system extracts handwritten data using AI Vision (job ID, time entries, additional parts, notes)
2. Show Mai the extracted data in an editable review card
3. Mai reviews and corrects any misreads
4. After Mai confirms, call update_repair_from_workorder to update the repair job

IMPORTANT: 
- The work order photo contains BOTH printed text (from the system) and handwritten text (from Boot)
- We only need the HANDWRITTEN parts — time log, additional parts, notes
- The job_id (printed number at top) is used to match to the existing repair job
- Always let Mai review before updating — Boot's handwriting can be hard to read
- If additional parts can't be matched to products in the system, tell Mai which ones need to be added manually
- Convert total hours to seconds for the actual_hours field (e.g., 6.5 hours = 23400 seconds)

When Mai mentions a completed repair or says "บูทซ่อมเสร็จแล้ว":
- Ask her to photograph the work order
- Or ask for the job number so she can update manually
```

---

## Part 7: Chat Integration Flow

### The complete flow:

1. Mai says "บูทซ่อมเสร็จ งาน 13" or taps a repair job card
2. Claude asks: "ถ่ายรูปใบสั่งงานได้เลยค่ะ 📷 หรือจะอัปเดตเองทีละช่อง?"
3. Mai takes a photo using the 📋 button → image uploads → extraction runs
4. Claude shows the extraction result as text: "อ่านได้ดังนี้: 6.5 ชม., อะไหล่เพิ่ม: ลูกสูบ ×1, หมายเหตุ: สึกหรอมาก"
5. Claude asks: "ถูกต้องไหมคะ? หรือต้องแก้ไขอะไร?"
6. Mai confirms: "ใช่" or corrects: "ชั่วโมงเป็น 7 ไม่ใช่ 6.5"
7. Claude calls `update_repair_from_workorder` with the confirmed data
8. Result card shows: "✅ อัปเดตงาน #13 — 6.5 ชม., เพิ่มอะไหล่ 1 รายการ, สถานะ: เสร็จแล้ว"

### Simplified approach (recommended for v1):

Instead of building a complex editable review component, use Claude's conversational ability:

1. Extract the data via the API endpoint
2. Claude presents the data as TEXT in the chat (not a custom component)
3. Mai reads and confirms or corrects via text
4. Claude calls the update tool

This avoids building the complex `workorder-review.tsx` component and leverages what's already working — the conversational confirmation flow from Phase 2.

**If taking this simpler approach:** skip Part 4 (workorder-review.tsx) entirely. Instead, in page.tsx, when a work order photo is uploaded:

```typescript
const handleWorkOrderPhoto = async (file: File) => {
  // Compress + upload to Vercel Blob
  const compressed = await compressImage(file, 1200, 0.7);
  const base64 = await toBase64(compressed);
  
  // Send to extraction endpoint
  const res = await fetch('/api/chat/extract-workorder', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: base64 }),
  });
  const extraction = await res.json();
  
  // Inject extraction result into the chat
  append({
    role: 'user', 
    content: `📋 ถ่ายรูปใบสั่งงานซ่อม งาน #${extraction.job_id}\n\nข้อมูลที่อ่านได้:\n- ชั่วโมงรวม: ${extraction.total_hours} ชม.\n- อะไหล่เพิ่ม: ${extraction.additional_parts?.map((p: any) => `${p.name} ×${p.quantity}`).join(', ') || 'ไม่มี'}\n- หมายเหตุ: ${extraction.notes || 'ไม่มี'}\n\nถูกต้องไหม?`
  });
};
```

Claude sees this as a user message with the extracted data and asks for confirmation before calling the update tool.

---

## Part 8: Work Order Upload Button

Add a 📋 button next to the QR scanner button. Use the two-button Android pattern:

```tsx
{/* Work order upload options */}
{showWorkOrderUpload && (
  <div className="absolute bottom-16 right-3 bg-slate-800 rounded-lg shadow-lg p-2 space-y-1 z-40">
    <button
      onClick={() => cameraInputRef.current?.click()}
      className="block w-full text-left text-sm text-slate-200 px-3 py-2 rounded hover:bg-slate-700"
    >
      📷 ถ่ายรูปใบสั่งงาน
    </button>
    <button
      onClick={() => galleryInputRef.current?.click()}
      className="block w-full text-left text-sm text-slate-200 px-3 py-2 rounded hover:bg-slate-700"
    >
      🖼️ เลือกรูปจากแกลเลอรี
    </button>
  </div>
)}
```

---

## Testing Checklist

1. **Photo upload** — tap 📋 → take photo or choose from gallery → image compresses and uploads
2. **Extraction** — work order photo → Claude Vision extracts job_id, time entries, parts, notes
3. **Review flow** — extracted data shown in chat → Mai confirms or corrects
4. **Update repair job** — after confirmation → repair job updated in Airtable with actual_hours, notes, additional parts
5. **Parts matching** — additional parts matched to Products by name → Repair Job Parts created
6. **Unmatched parts** — if a part name doesn't match any product, Claude tells Mai
7. **Duration field** — actual_hours stored correctly as seconds in Airtable (6.5 hours = 23400)
8. **Status update** — repair job status changes to เสร็จแล้ว (Complete) after work order processing
9. **Android camera** — two-button pattern works on Android Chrome
10. **Confidence indicator** — low confidence extraction shows warning to Mai

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| Duration field format | Airtable duration fields expect SECONDS (integer). 6.5 hours = 23400 seconds. |
| Thai numerals | Boot might write ๑-๙ instead of 1-9. Claude Vision should handle this but verify. |
| Blurry photos | Compression to 1200px/0.7 quality should be readable. If not, try 1600px/0.8. |
| Partial handwriting | Boot doesn't always fill every section. Empty sections should result in null/undefined, not errors. |
| Part name mismatch | Boot writes shorthand ("น้ำมัน 10W-30") but Products has full names. Search should be fuzzy. |
| Double update | If Mai processes the same work order twice, it should update (not duplicate) the repair job data. |
| Base64 vs URL | If using Vercel Blob upload, pass the URL. If sending directly, pass base64. Match the extraction endpoint's expected format. |

---

## After Phase 6

The app is feature-complete for daily operations. Future enhancements:
- Voice input for Thai (speech-to-text)
- LINE bot integration
- Receipt printing from chat
- Audit dashboard for Mint
- Inventory reorder suggestions based on slow movers + sales velocity
- Customer relationship features (birthday reminders, credit collection)
