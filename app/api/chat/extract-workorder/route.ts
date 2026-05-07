import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { put } from "@vercel/blob";
import { WorkOrderExtractionSchema } from "@/lib/workorder-schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageArray: string[] = body.images || (body.imageBase64 ? [body.imageBase64] : []);

    if (imageArray.length === 0) {
      return Response.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const imageBlocks = imageArray.map((img) => ({
      type: "image" as const,
      image: img,
    }));

    const pageCount = imageArray.length;
    const pageNote = pageCount > 1
      ? `นี่คือรูปถ่ายใบสั่งงานซ่อม ${pageCount} หน้า จากร้านพินิจเจริญยนต์ ให้อ่านข้อมูลจากทุกหน้ารวมกัน`
      : "นี่คือรูปถ่ายใบสั่งงานซ่อมจากร้านพินิจเจริญยนต์ (Pinit Charoen Yon auto parts shop)";

    const result = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: WorkOrderExtractionSchema,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `${pageNote}

ใบสั่งงานนี้มีส่วนที่พิมพ์ (printed) และส่วนที่เขียนด้วยมือ (handwritten by Boot the mechanic)

ให้อ่านข้อมูลที่เขียนด้วยมือ:
1. **เลขที่งาน (job_id)** — ตัวเลขที่ด้านขวาบน
2. **ตารางบันทึกเวลา** — ตาราง "วันที่ | เริ่ม | จบ | ชม. | หมายเหตุ" ที่บูทเขียน
3. **ชั่วโมงรวม** — ตัวเลขในช่อง "ชั่วโมงรวม:" ใต้ตาราง
4. **อะไหล่เพิ่มเติม** — ตาราง "ชื่ออะไหล่ | จำนวน" ที่บูทเขียนเพิ่ม (อาจว่าง)
5. **หมายเหตุ** — ข้อความในช่อง "หมายเหตุ" (อาจว่าง)
6. **คำแนะนำให้ลูกค้า** — ถ้ามี

ถ้าอ่านไม่ชัด ให้ใส่ค่าที่ใกล้เคียงที่สุด
ถ้าช่องไหนว่าง (บูทไม่ได้เขียน) ให้ข้ามไป

ลายมือบูทอาจใช้ตัวเลขไทย (๐-๙) หรือตัวเลขอารบิก (0-9) ให้แปลงเป็นตัวเลขอารบิกทั้งหมด`,
            },
          ],
        },
      ],
    });

    const imageUrls: string[] = [];
    for (let i = 0; i < imageArray.length; i++) {
      try {
        const match = imageArray[i].match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const ext = contentType.split("/")[1] || "jpg";
          const buffer = Buffer.from(match[2], "base64");
          const suffix = imageArray.length > 1 ? `-p${i + 1}` : "";
          const filename = `workorder-${result.object.job_id || "unknown"}${suffix}-${Date.now()}.${ext}`;
          const blob = await put(filename, buffer, { access: "public", contentType });
          imageUrls.push(blob.url);
        }
      } catch (uploadErr) {
        console.error(`Work order photo upload failed (page ${i + 1}):`, uploadErr);
      }
    }

    return Response.json({
      ...result.object,
      image_url: imageUrls[0] || undefined,
      image_urls: imageUrls,
    });
  } catch (err) {
    console.error("Work order extraction error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "ไม่สามารถอ่านใบสั่งงานได้",
      },
      { status: 500 }
    );
  }
}
