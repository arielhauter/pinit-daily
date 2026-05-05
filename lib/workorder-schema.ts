import { z } from "zod";

export const WorkOrderExtractionSchema = z.object({
  job_id: z.number().describe("เลขที่งานซ่อม (printed at top of work order)"),
  time_entries: z
    .array(
      z.object({
        date: z.string().describe("วันที่ (DD/MM/YYYY or DD/MM/YY)"),
        start_time: z.string().describe("เวลาเริ่ม (HH:MM)"),
        end_time: z.string().describe("เวลาจบ (HH:MM)"),
        hours: z.number().describe("จำนวนชั่วโมง"),
        notes: z.string().optional().describe("หมายเหตุ"),
      })
    )
    .describe("ตารางบันทึกเวลาที่บูทเขียน"),
  total_hours: z.number().describe("ชั่วโมงรวมทั้งหมด"),
  additional_parts: z
    .array(
      z.object({
        name: z.string().describe("ชื่ออะไหล่"),
        quantity: z.number().describe("จำนวน"),
      })
    )
    .describe("อะไหล่เพิ่มเติมที่บูทเขียน (ถ้ามี)"),
  notes: z.string().optional().describe("หมายเหตุที่บูทเขียน"),
  advice_for_customer: z
    .string()
    .optional()
    .describe("คำแนะนำให้มายแจ้งลูกค้า"),
});

export type WorkOrderExtraction = z.infer<typeof WorkOrderExtractionSchema>;
