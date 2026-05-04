import { z } from "zod";

export const PersonDrawSchema = z.object({
  name: z.string().describe(
    "Person name exactly as written on the form. Common names: ใหม่ (Mai), บู๊ท (Boot), พินิจ (Pinit), แอ๊ด (Aed), ไกล (Kai). Use the Thai name if readable, otherwise use the English name printed on the form."
  ),
  salary: z
    .number()
    .describe(
      "Total salary/draw (เงินเดือน) across all ครั้งที่ columns. 0 if empty."
    ),
  food: z
    .number()
    .describe(
      "Total food (อาหาร) across all ครั้งที่ columns. 0 if empty."
    ),
  other: z
    .number()
    .describe(
      "Total other (อื่นๆ) across all ครั้งที่ columns. 0 if empty."
    ),
});

export const SectionCItemSchema = z.object({
  who: z.string().describe("ใคร (Who) — name of person"),
  store: z
    .string()
    .describe("ร้าน (Store) — where the purchase was made"),
  description: z.string().describe("รายละเอียด (Description)"),
  amount: z.number().describe("จำนวน ฿ (Amount in baht)"),
  direction: z
    .enum(["in", "out"])
    .describe("เข้า/ออก — cash in or cash out"),
});

export const ExtractionSchema = z.object({
  date: z
    .string()
    .describe(
      "วันที่ (Date) from top of form, in YYYY-MM-DD format"
    ),
  starting_balance: z
    .number()
    .describe("ยอดเปิดร้าน (฿) — opening cash balance. This is typically a small amount under ฿5,000 — it is the cash left in the drawer from the previous day, NOT the total cash count."),

  person_draws: z.array(PersonDrawSchema).describe(
    "One entry per person who appears in Section A of the form, even if all their values are 0. Include every person row that has a name printed/written, regardless of whether they have any draws that day."
  ),

  delivery_am: z
    .number()
    .describe("ค่าส่งเงินสด — รอบเช้า (AM delivery fee)"),
  delivery_pm: z
    .number()
    .describe("ค่าส่งเงินสด — รอบเย็น (PM delivery fee)"),

  section_c_items: z
    .array(SectionCItemSchema)
    .describe("Section C line items"),

  actual_cash_count: z
    .number()
    .describe(
      "ยอดนับเงินสดจริง (Actual Cash Count) — written at the very bottom of the form, after the label 'ยอดนับเงินสดจริง'. This is the final physical cash count of money in the drawer at end of day. Do NOT confuse this with the starting balance at the top."
    ),

  extraction_confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      'How confident are you in the extraction? "high" = all values clearly readable, "medium" = some values ambiguous, "low" = significant portions unclear'
    ),
  extraction_notes: z
    .string()
    .optional()
    .describe(
      'Any issues encountered during extraction — e.g., "amount in row 3 of Section A was smudged, read as 500 but could be 800"'
    ),
});

export const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured data from a photograph of a Thai handwritten cash drawer ledger form (แบบฟอร์มลิ้นชักเงินสด).

The form has these sections:

**Header:**
- วันที่ (Date): handwritten date at top
- ยอดเปิดร้าน (฿): opening cash balance — this is typically a SMALL amount (under ฿5,000), representing leftover cash from the previous day. Do NOT confuse this with any large total.

**Section A — เบิกเงินเดือน & อาหาร & อื่นๆ (Salary Draw, Meals & Other):**
A table with rows for each person (ใหม่/Mai, บู๊ท/Boot, พินิจ/Pinit, แอ๊ด/Aed, ไกล/Kai) and sub-rows for each category (เงินเดือน/Salary, อาหาร/Food, อื่นๆ/Other). Each person has up to 5 columns (ครั้งที่ 1-5) for multiple draws throughout the day. Sum all columns for each person+category combination.

**Section B — ค่าส่งซัพพลายเออร์ (Supplier Delivery Fees):**
Two rows: morning delivery (รอบเช้า/AM) and evening delivery (รอบเย็น/PM).

**Section C — อื่นๆ (Other Cash Activity):**
Line items with: ใคร (Who), ร้าน (Store), รายละเอียด (Description), จำนวน ฿ (Amount), เข้า/ออก (In/Out direction).

**Footer:**
- ยอดนับเงินสดจริง (Actual Cash Count): the physical cash count written at the VERY BOTTOM of the form, after the label "ยอดนับเงินสดจริง". This is the total cash physically counted in the drawer at end of day. It is typically a large number (฿10,000+). Do NOT confuse this with the starting balance at the top of the form.

Rules:
- Empty cells = 0. Do not hallucinate values.
- Thai numerals (๐-๙) should be converted to Arabic numerals (0-9).
- If a value is ambiguous or smudged, extract your best guess and note the ambiguity in extraction_notes.
- Set extraction_confidence based on overall readability.
- The date on the form may be in Thai format (e.g., 2 พ.ค. 2569 or 2/5/69). Convert to YYYY-MM-DD using Buddhist Era (subtract 543 from Thai year if >= 2500, or add 2500+year if 2-digit).`;
