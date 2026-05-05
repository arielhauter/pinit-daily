import { tool } from "ai";
import { z } from "zod";
import { selectRecords } from "./airtable";
import { TABLES } from "./constants";

function sanitizeForFormula(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function extractPhotoUrl(photoField: unknown): string | null {
  if (
    Array.isArray(photoField) &&
    photoField.length > 0 &&
    photoField[0]?.url
  ) {
    return photoField[0].url as string;
  }
  return null;
}

export const chatTools = {
  lookup_product: tool({
    description:
      "ค้นหาสินค้าจากชื่อ, SKU หรือคำค้นบางส่วน (Search products by name, SKU, or partial match)",
    parameters: z.object({
      query: z.string().describe("ชื่อสินค้า, SKU, หรือคำค้น"),
    }),
    execute: async ({ query }) => {
      const words = query.split(/\s+/).filter((w) => w.length > 0);
      if (words.length === 0) return { found: 0, products: [] };

      const hasLatin = /[a-zA-Z]/;
      const wordClauses = words.map((word) => {
        const s = sanitizeForFormula(word);
        if (hasLatin.test(word)) {
          const lower = s.toLowerCase();
          return `OR(SEARCH("${lower}", LOWER({display_name})), SEARCH("${lower}", LOWER({original_name})), SEARCH("${s}", {sku}))`;
        }
        return `OR(SEARCH("${s}", {display_name}), SEARCH("${s}", {original_name}), SEARCH("${s}", {sku}))`;
      });
      const formula =
        wordClauses.length === 1
          ? wordClauses[0]
          : `AND(${wordClauses.join(", ")})`;

      const records = await selectRecords(TABLES.PRODUCTS, {
        filterByFormula: formula,
        fields: [
          "sku",
          "display_name",
          "current_stock",
          "last_known_cost_baht",
          "last_known_sell_price_baht",
          "repair_price_total",
          "category",
          "product_photo",
        ],
        sort: [{ field: "display_name", direction: "asc" }],
        maxRecords: 10,
      });

      const products = records.map((r) => ({
        id: r.id,
        sku: (r.fields.sku as string) || "",
        name: (r.fields.display_name as string) || "",
        stock: (r.fields.current_stock as number) || 0,
        cost: (r.fields.last_known_cost_baht as number) || 0,
        sellPrice: (r.fields.last_known_sell_price_baht as number) || 0,
        repairPrice: (r.fields.repair_price_total as number) || null,
        category: (r.fields.category as string) || "",
        photoUrl: extractPhotoUrl(r.fields.product_photo),
      }));

      return { found: products.length, products };
    },
  }),

  get_today_sales: tool({
    description:
      "ดูสรุปยอดขายวันนี้ — จำนวน, ยอดรวม, แยกตามวิธีชำระเงิน (Get today's sales summary)",
    parameters: z.object({}),
    execute: async () => {
      const records = await selectRecords(TABLES.SALES, {
        filterByFormula: `IS_SAME({sale_date}, TODAY(), 'day')`,
        fields: [
          "sale_id",
          "sale_date",
          "transaction_type",
          "payment_method",
          "total",
          "total_collected",
          "display_name (from product) (from line_items)",
          "created_by",
        ],
      });

      const byPaymentMethod: Record<string, { count: number; total: number }> =
        {};
      const byType: Record<string, { count: number; total: number }> = {};
      let totalRevenue = 0;

      const recentSales = records.map((r) => {
        const f = r.fields;
        const total =
          (f.total_collected as number) || (f.total as number) || 0;
        const paymentMethod = (f.payment_method as string) || "ไม่ระบุ";
        const type = (f.transaction_type as string) || "ไม่ระบุ";

        totalRevenue += total;

        if (!byPaymentMethod[paymentMethod])
          byPaymentMethod[paymentMethod] = { count: 0, total: 0 };
        byPaymentMethod[paymentMethod].count++;
        byPaymentMethod[paymentMethod].total += total;

        if (!byType[type]) byType[type] = { count: 0, total: 0 };
        byType[type].count++;
        byType[type].total += total;

        const items =
          (f["display_name (from product) (from line_items)"] as string[]) ||
          [];

        return {
          saleId: (f.sale_id as number) || 0,
          type,
          paymentMethod,
          total,
          items,
        };
      });

      const today = new Date().toISOString().split("T")[0];

      return {
        date: today,
        count: records.length,
        totalRevenue,
        byPaymentMethod,
        byType,
        recentSales: recentSales.slice(0, 10),
      };
    },
  }),

  get_repair_jobs: tool({
    description:
      "ดูรายการงานซ่อมที่ยังไม่เสร็จ หรือกรองตามสถานะ (List active repair jobs)",
    parameters: z.object({
      status_filter: z
        .string()
        .optional()
        .describe("กรองตามสถานะ เช่น กำลังซ่อม (In Progress)"),
    }),
    execute: async ({ status_filter }) => {
      let formula: string;
      if (status_filter) {
        const s = sanitizeForFormula(status_filter);
        formula = `{status} = '${s}'`;
      } else {
        formula = `AND({status} != 'จ่ายแล้ว (Paid)', {status} != 'ยกเลิก (Cancelled)')`;
      }

      const records = await selectRecords(TABLES.REPAIR_JOBS, {
        filterByFormula: formula,
        fields: [
          "job_id",
          "vehicle_description",
          "license_plate",
          "status",
          "job_type",
          "quoted_price",
          "total_collected",
          "effort_tier",
          "labor_charge",
          "quoted_date",
          "parts_cost_total",
          "parts_sell_total",
          "notes",
          "card_summary",
        ],
        sort: [{ field: "quoted_date", direction: "desc" }],
      });

      const jobs = records.map((r) => {
        const f = r.fields;
        const cardSummary = (f.card_summary as string) || "";
        const customerName = cardSummary.split("|")[0]?.trim() || "";

        return {
          id: r.id,
          jobId: (f.job_id as number) || 0,
          customer: customerName,
          vehicleDescription: (f.vehicle_description as string) || "",
          licensePlate: (f.license_plate as string) || "",
          status: (f.status as string) || "",
          jobType: (f.job_type as string[]) || [],
          quotedPrice: (f.quoted_price as number) || 0,
          totalCollected: (f.total_collected as number) || 0,
          effortTier: (f.effort_tier as string) || "",
          laborCharge: (f.labor_charge as number) || 0,
          quotedDate: (f.quoted_date as string) || "",
          partsCostTotal: (f.parts_cost_total as number) || 0,
          partsSellTotal: (f.parts_sell_total as number) || 0,
          notes: (f.notes as string) || "",
        };
      });

      return { count: jobs.length, jobs };
    },
  }),

  search_customer: tool({
    description:
      "ค้นหาลูกค้าจากชื่อหรือเบอร์โทร (Search customers by name or phone)",
    parameters: z.object({
      query: z.string().describe("ชื่อลูกค้า หรือเบอร์โทร"),
    }),
    execute: async ({ query }) => {
      const s = sanitizeForFormula(query);
      const hasLatin = /[a-zA-Z]/.test(query);

      let formula: string;
      if (hasLatin) {
        const lower = s.toLowerCase();
        formula = `OR(SEARCH("${lower}", LOWER({Name})), SEARCH("${s}", {Phone}))`;
      } else {
        formula = `OR(SEARCH("${s}", {Name}), SEARCH("${s}", {Phone}))`;
      }

      const records = await selectRecords("Customers", {
        filterByFormula: formula,
        fields: ["Name", "Phone", "credit_balance", "Sales", "Repair Jobs"],
        maxRecords: 10,
      });

      const customers = records.map((r) => ({
        id: r.id,
        name: (r.fields.Name as string) || "",
        phone: (r.fields.Phone as string) || null,
        creditBalance: (r.fields.credit_balance as number) || 0,
        salesCount: Array.isArray(r.fields.Sales)
          ? r.fields.Sales.length
          : 0,
        repairJobsCount: Array.isArray(r.fields["Repair Jobs"])
          ? (r.fields["Repair Jobs"] as string[]).length
          : 0,
      }));

      return { found: customers.length, customers };
    },
  }),
};
