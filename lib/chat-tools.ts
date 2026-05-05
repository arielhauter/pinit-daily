import { tool } from "ai";
import { z } from "zod";
import { selectRecords, createRecord, createRecords, updateRecord, getRecord } from "./airtable";
import { TABLES } from "./constants";

function sanitizeForFormula(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cleanSelect(value: string): string {
  return value.trim().replace(/^["']+|["']+$/g, "");
}

const SALE_PAYMENT_MAP: Record<string, string> = {
  "เงินสด": "เงินสด (Cash)",
  "cash": "เงินสด (Cash)",
  "เงินสด (cash)": "เงินสด (Cash)",
  "โอน": "โอน (Transfer)",
  "transfer": "โอน (Transfer)",
  "โอน (transfer)": "โอน (Transfer)",
  "เครดิต": "เครดิต (Credit)",
  "credit": "เครดิต (Credit)",
  "เครดิต (credit)": "เครดิต (Credit)",
  "หลายช่องทาง": "หลายช่องทาง (Mixed) ",
  "mixed": "หลายช่องทาง (Mixed) ",
};

const EXPENSE_PAYMENT_MAP: Record<string, string> = {
  "เงินสด": "เงินสด (Cash)",
  "cash": "เงินสด (Cash)",
  "เงินสด (cash)": "เงินสด (Cash)",
  "โอน": "โอน (Transfer)",
  "transfer": "โอน (Transfer)",
  "โอน (transfer)": "โอน (Transfer)",
  "เครดิต": "เครดิต (Credit)",
  "credit": "เครดิต (Credit)",
};

const PURCHASE_PAYMENT_MAP: Record<string, string> = {
  "เงินสด": "เงินสด (Cash)",
  "cash": "เงินสด (Cash)",
  "เงินสด (cash)": "เงินสด (Cash)",
  "โอน": "โอน (Transfer)",
  "transfer": "โอน (Transfer)",
  "โอน (transfer)": "โอน (Transfer)",
  "บัตรเครดิต": "บัตรเครดิต (Credit Card)",
  "credit card": "บัตรเครดิต (Credit Card)",
  "บัตรเครดิต (credit card)": "บัตรเครดิต (Credit Card)",
  "shopee": "Shopee (pre-paid)",
  "shopee (pre-paid)": "Shopee (pre-paid)",
};

const REPAIR_PAYMENT_MAP: Record<string, string> = {
  "เงินสด": "เงินสด (Cash)",
  "cash": "เงินสด (Cash)",
  "เงินสด (cash)": "เงินสด (Cash)",
  "โอน": "โอน (Transfer)",
  "transfer": "โอน (Transfer)",
  "โอน (transfer)": "โอน (Transfer)",
  "เครดิต": "เครดิต (Credit)",
  "credit": "เครดิต (Credit)",
  "เครดิต (credit)": "เครดิต (Credit)",
};

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  "ค่าไฟ": "ค่าไฟ (Electricity)",
  "electricity": "ค่าไฟ (Electricity)",
  "ค่าน้ำ": "ค่าน้ำ (Water)",
  "water": "ค่าน้ำ (Water)",
  "ค่าน้ำมันรถ": "ค่าน้ำมันรถ (Fuel)",
  "fuel": "ค่าน้ำมันรถ (Fuel)",
  "ค่าอินเทอร์เน็ต": "ค่าอินเทอร์เน็ต (Internet)",
  "internet": "ค่าอินเทอร์เน็ต (Internet)",
  "ค่าซอฟต์แวร์": "ค่าซอฟต์แวร์ (Software i.e. Airtable, Fillout)",
  "software": "ค่าซอฟต์แวร์ (Software i.e. Airtable, Fillout)",
  "ค่า ai": "ค่า AI / Claude",
  "ค่า claude": "ค่า AI / Claude",
  "ai": "ค่า AI / Claude",
  "claude": "ค่า AI / Claude",
  "ค่าโทรศัพท์": "ค่าโทรศัพท์ (Cell phone plans Mai, Boot, Pinit)",
  "phone": "ค่าโทรศัพท์ (Cell phone plans Mai, Boot, Pinit)",
  "ค่าจ้างช่าง": "ค่าจ้างช่าง (Part-time labor)",
  "labor": "ค่าจ้างช่าง (Part-time labor)",
  "ค่าขนส่ง": "ค่าขนส่ง (Shipping / inbound freight)",
  "shipping": "ค่าขนส่ง (Shipping / inbound freight)",
  "ค่าเครื่องมือ": "ค่าเครื่องมือ (Tools & maintenance)",
  "tools": "ค่าเครื่องมือ (Tools & maintenance)",
  "เงินเดือน mai": "เงินเดือน Mai",
  "เงินเดือน boot": "เงินเดือน Boot",
  "เงินเดือน pinit": "เงินเดือน/เบิก Pinit",
  "ค่าอาหาร": "ค่าอาหาร/เครื่องดื่ม (Food & drinking water - shop)",
  "food": "ค่าอาหาร/เครื่องดื่ม (Food & drinking water - shop)",
  "ดอกเบี้ย": "ดอกเบี้ยเบิกเกินบัญชี (SCB overdraft interest)",
  "ค่ายื่นภาษี": "ค่ายื่นภาษี (Tax filing)",
  "tax": "ค่ายื่นภาษี (Tax filing)",
  "netflix": "Netflix",
  "ค่าฟาร์ม": "ค่าฟาร์ม (Farm subsidy - labor, transport, supplies)",
  "farm": "ค่าฟาร์ม (Farm subsidy - labor, transport, supplies)",
  "อื่นๆ": "อื่นๆ (Other)",
  "other": "อื่นๆ (Other)",
};

const REPAIR_STATUS_MAP: Record<string, string> = {
  "รับงาน": "รับงาน (Quoting)",
  "quoting": "รับงาน (Quoting)",
  "กำลังซ่อม": "กำลังซ่อม (In Progress)",
  "in progress": "กำลังซ่อม (In Progress)",
  "เสร็จแล้ว": "เสร็จแล้ว (Complete)",
  "complete": "เสร็จแล้ว (Complete)",
  "จ่ายแล้ว": "จ่ายแล้ว (Paid)",
  "paid": "จ่ายแล้ว (Paid)",
};

function normalizeSelect(value: string, map: Record<string, string>): string {
  const cleaned = cleanSelect(value);
  const lower = cleaned.toLowerCase();
  return map[lower] || map[cleaned] || cleaned;
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

function getDateRange(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const [y, m, d] = todayStr.split('-').map(Number);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const today = new Date(y, m - 1, d);

  switch (period) {
    case 'today':
      return { start: todayStr, end: todayStr };
    case 'yesterday': {
      const yest = new Date(y, m - 1, d - 1);
      return { start: fmt(yest), end: fmt(yest) };
    }
    case 'week': {
      const dow = today.getDay();
      const mon = new Date(y, m - 1, d - dow + (dow === 0 ? -6 : 1));
      return { start: fmt(mon), end: todayStr };
    }
    case 'last_week': {
      const dow = today.getDay();
      const mon = new Date(y, m - 1, d - dow + (dow === 0 ? -6 : 1) - 7);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun) };
    }
    case 'month':
      return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: todayStr };
    case 'last_month': {
      const first = new Date(y, m - 2, 1);
      const last = new Date(y, m - 1, 0);
      return { start: fmt(first), end: fmt(last) };
    }
    case 'custom':
      return { start: startDate || todayStr, end: endDate || todayStr };
    default:
      return { start: todayStr, end: todayStr };
  }
}

function buildDateFilter(fieldName: string, start: string, end: string): string {
  if (start === end) {
    return `IS_SAME({${fieldName}}, '${start}', 'day')`;
  }
  return `AND(IS_AFTER({${fieldName}}, DATEADD('${start}', -1, 'days')), IS_BEFORE({${fieldName}}, DATEADD('${end}', 1, 'days')))`;
}

export const chatTools = {
  lookup_product: tool({
    description:
      "ค้นหาสินค้าจากชื่อ, SKU หรือคำค้นบางส่วน (Search products by name, SKU, or partial match)",
    parameters: z.object({
      query: z.string().describe("ชื่อสินค้า, SKU, หรือคำค้น"),
    }),
    execute: async ({ query }) => {
      try {
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
      } catch (err) {
        return { found: 0, products: [], error: err instanceof Error ? err.message : "ค้นหาสินค้าไม่สำเร็จ" };
      }
    },
  }),

  get_today_sales: tool({
    description:
      "ดูสรุปยอดขายวันนี้ — จำนวน, ยอดรวม, แยกตามวิธีชำระเงิน (Get today's sales summary)",
    parameters: z.object({}),
    execute: async () => {
      try {
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
      } catch (err) {
        return { date: "", count: 0, totalRevenue: 0, byPaymentMethod: {}, byType: {}, error: err instanceof Error ? err.message : "ดึงข้อมูลยอดขายไม่สำเร็จ" };
      }
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
      try {
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
      } catch (err) {
        return { count: 0, jobs: [], error: err instanceof Error ? err.message : "ดึงข้อมูลงานซ่อมไม่สำเร็จ" };
      }
    },
  }),

  search_customer: tool({
    description:
      "ค้นหาลูกค้าจากชื่อหรือเบอร์โทร (Search customers by name or phone)",
    parameters: z.object({
      query: z.string().describe("ชื่อลูกค้า หรือเบอร์โทร"),
    }),
    execute: async ({ query }) => {
      try {
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
      } catch (err) {
        return { found: 0, customers: [], error: err instanceof Error ? err.message : "ค้นหาลูกค้าไม่สำเร็จ" };
      }
    },
  }),

  create_sale: tool({
    description:
      "บันทึกการขาย — สร้างรายการขายใหม่พร้อมรายการสินค้า (Create a sale with line items). IMPORTANT: Always confirm with user before calling this tool.",
    parameters: z.object({
      transaction_type: z
        .enum(["Product Sale", "Simple Repair"])
        .describe("ประเภท: Product Sale หรือ Simple Repair"),
      items: z
        .array(
          z.object({
            product_record_id: z.string().describe("Airtable record ID ของสินค้า (ได้จาก lookup_product)"),
            product_name: z.string().describe("ชื่อสินค้า (เพื่อแสดงผล)"),
            quantity: z.number().describe("จำนวน"),
            unit_price: z.number().describe("ราคาต่อชิ้น (ราคาขายปกติ หรือ override)"),
            repair_price_override: z.number().optional().describe("ราคาซ่อมต่อชิ้น (เฉพาะ Simple Repair)"),
          })
        )
        .describe("รายการสินค้า"),
      payment_method: z.string().describe("วิธีชำระ: เงินสด (Cash), โอน (Transfer), เครดิต (Credit)"),
      customer_name: z.string().optional().describe("ชื่อลูกค้า (จำเป็นถ้าเครดิต)"),
      customer_record_id: z.string().optional().describe("Airtable record ID ของลูกค้า (ถ้ามี)"),
      discount: z.number().optional().describe("ส่วนลด (฿)"),
      total_collected: z.number().optional().describe("ยอดเก็บจริง (ถ้าต่างจากยอดรวม)"),
      note: z.string().optional().describe("หมายเหตุ"),
    }),
    execute: async ({ transaction_type, items, payment_method, customer_name, customer_record_id, discount, total_collected, note }) => {
      try {
        const normalizedPayment = normalizeSelect(payment_method, SALE_PAYMENT_MAP);
        const normalizedType = cleanSelect(transaction_type);

        // Resolve customer: use provided record ID, or search/create by name
        let customerRecordId: string | null = customer_record_id || null;
        if (!customerRecordId && customer_name) {
          const s = sanitizeForFormula(customer_name);
          const customers = await selectRecords("Customers", {
            filterByFormula: `SEARCH("${s}", {Name})`,
            fields: ["Name"],
            maxRecords: 1,
          });
          if (customers.length > 0) {
            customerRecordId = customers[0].id;
          } else {
            const newCustomer = await createRecord("Customers", {
              Name: customer_name,
            });
            customerRecordId = newCustomer.id;
          }
        }

        // Compute total BEFORE creating the Sale so Automation 2 reads it immediately
        const subtotal = items.reduce(
          (sum, i) => sum + i.quantity * i.unit_price,
          0
        );
        const computedTotal = subtotal - (discount || 0);
        const collected = total_collected || computedTotal;

        const saleFields: Record<string, unknown> = {
          sale_date: new Date().toISOString(),
          transaction_type: normalizedType,
          payment_method: normalizedPayment,
          total_collected: collected,
          created_by: "Mai",
        };

        if (customerRecordId) {
          saleFields.customer = [customerRecordId];
        }
        if (discount && discount > 0) {
          saleFields.discount_baht = discount;
        }
        if (note) {
          saleFields.note = note;
        }

        const saleRecord = await createRecord(TABLES.SALES, saleFields);

        const lineItemRecords = items.map((item) => {
          const fields: Record<string, unknown> = {
            sale_id: [saleRecord.id],
            product: [item.product_record_id],
            quantity: item.quantity,
          };
          if (item.unit_price > 0) {
            fields.price_override = item.unit_price;
          }
          if (item.repair_price_override && item.repair_price_override > 0) {
            fields.repair_price_override = item.repair_price_override;
          }
          return fields;
        });

        await createRecords("Sale Line Items", lineItemRecords);

        return {
          success: true,
          saleId: saleRecord.id,
          saleNumber: saleRecord.fields.sale_id as number,
          items: items.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            lineTotal: i.quantity * i.unit_price,
          })),
          total: subtotal,
          discount: discount || 0,
          paymentMethod: normalizedPayment,
          customer: customerRecordId ? "linked" : null,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "สร้างรายการขายไม่สำเร็จ",
        };
      }
    },
  }),

  create_expense: tool({
    description:
      "บันทึกค่าใช้จ่าย (Create an expense record). IMPORTANT: Always confirm with user before calling.",
    parameters: z.object({
      expense_date: z.string().optional().describe("วันที่ (YYYY-MM-DD) ถ้าไม่ระบุใช้วันนี้"),
      category: z.string().describe("หมวดหมู่ค่าใช้จ่าย"),
      amount: z.number().describe("จำนวนเงิน (฿)"),
      payment_method: z.string().describe("วิธีชำระ"),
      description: z.string().describe("รายละเอียด"),
      note: z.string().optional().describe("หมายเหตุเพิ่มเติม"),
    }),
    execute: async ({ expense_date, category, amount, payment_method, description, note }) => {
      try {
        const normalizedCategory = normalizeSelect(category, EXPENSE_CATEGORY_MAP);
        const normalizedPayment = normalizeSelect(payment_method, EXPENSE_PAYMENT_MAP);

        const fields: Record<string, unknown> = {
          expense_date: expense_date || new Date().toISOString().split("T")[0],
          category: normalizedCategory,
          amount,
          payment_method: normalizedPayment,
          description,
        };
        if (note) {
          fields.note = note;
        }

        const record = await createRecord(TABLES.EXPENSES, fields);

        return {
          success: true,
          expenseId: record.id,
          category: normalizedCategory,
          amount,
          paymentMethod: normalizedPayment,
          description,
          date: fields.expense_date,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "บันทึกค่าใช้จ่ายไม่สำเร็จ",
        };
      }
    },
  }),

  create_purchase: tool({
    description:
      "บันทึกการซื้อสินค้า (Create a purchase record with line items). IMPORTANT: Always confirm with user before calling.",
    parameters: z.object({
      supplier_name: z.string().describe("ชื่อผู้จำหน่าย"),
      supplier_record_id: z.string().optional().describe("Airtable record ID ของผู้จำหน่าย (ถ้าค้นเจอแล้ว)"),
      payment_method: z.string().describe("วิธีชำระ: เงินสด (Cash), โอน (Transfer), บัตรเครดิต (Credit Card), Shopee (pre-paid)"),
      items: z
        .array(
          z.object({
            product_record_id: z.string().describe("Airtable record ID ของสินค้า"),
            product_name: z.string().describe("ชื่อสินค้า (เพื่อแสดงผล)"),
            quantity: z.number().describe("จำนวน"),
            unit_cost: z.number().describe("ราคาต่อหน่วย"),
          })
        )
        .describe("รายการสินค้า"),
      shipping_cost: z.number().optional().describe("ค่าจัดส่ง"),
      total_paid: z.number().describe("ยอดรวมที่จ่าย"),
      note: z.string().optional().describe("หมายเหตุ"),
    }),
    execute: async ({ supplier_name, supplier_record_id, payment_method, items, shipping_cost, total_paid, note }) => {
      try {
        const normalizedPayment = normalizeSelect(payment_method, PURCHASE_PAYMENT_MAP);
        let supplierId = supplier_record_id;

        if (!supplierId) {
          const s = sanitizeForFormula(supplier_name);
          const existing = await selectRecords("Suppliers", {
            filterByFormula: `SEARCH("${s}", {display_name})`,
            fields: ["display_name"],
            maxRecords: 1,
          });

          if (existing.length > 0) {
            supplierId = existing[0].id;
          } else {
            const newSupplier = await createRecord("Suppliers", {
              display_name: supplier_name,
            });
            supplierId = newSupplier.id;
          }
        }

        const purchaseFields: Record<string, unknown> = {
          purchase_date: new Date().toISOString(),
          supplier: [supplierId],
          payment_method: normalizedPayment,
          total_paid,
        };
        if (shipping_cost && shipping_cost > 0) {
          purchaseFields.shipping_cost = shipping_cost;
        }
        if (note) {
          purchaseFields.note = note;
        }

        const purchaseRecord = await createRecord(TABLES.PURCHASES, purchaseFields);

        const lineItemRecords = items.map((item) => ({
          purchase_id: [purchaseRecord.id],
          product: [item.product_record_id],
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }));

        await createRecords(TABLES.PURCHASE_LINE_ITEMS, lineItemRecords);

        return {
          success: true,
          purchaseId: purchaseRecord.id,
          supplier: supplier_name,
          itemCount: items.length,
          items: items.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            unitCost: i.unit_cost,
          })),
          totalPaid: total_paid,
          shippingCost: shipping_cost || 0,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "บันทึกการซื้อไม่สำเร็จ",
        };
      }
    },
  }),

  print_label: tool({
    description:
      "พิมพ์ฉลาก QR Code สำหรับสินค้า (Generate a QR code label for a product). Returns a URL that opens the label in a new tab.",
    parameters: z.object({
      sku: z.string().describe("รหัสสินค้า เช่น PD69000071"),
      size: z.enum(["40x20", "40x30", "70x30", "70x50"]).describe("ขนาดฉลาก"),
    }),
    execute: async ({ sku, size }) => {
      try {
        const sanitized = sanitizeForFormula(sku);
        const products = await selectRecords(TABLES.PRODUCTS, {
          filterByFormula: `{sku} = "${sanitized}"`,
          fields: ["sku", "display_name", "last_known_sell_price_baht", "repair_price_total", "show_repair_on_label"],
          maxRecords: 1,
        });

        if (products.length === 0) {
          return { success: false, error: `ไม่พบสินค้า SKU: ${sku}` };
        }

        const product = products[0].fields;
        const name = encodeURIComponent((product.display_name as string) || "");
        const price = (product.last_known_sell_price_baht as number) || 0;
        const repair = product.show_repair_on_label ? ((product.repair_price_total as number) || 0) : 0;
        const baseUrl = process.env.NEXT_PUBLIC_LABEL_API_URL || "https://pinit-label-api.onrender.com";
        const labelUrl = `${baseUrl}/label/${sku}/${size}?name=${name}&price=${price}&repair=${repair}`;

        return {
          success: true,
          sku,
          size,
          productName: (product.display_name as string) || "",
          labelUrl,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "สร้างฉลากไม่สำเร็จ",
        };
      }
    },
  }),

  update_stock_count: tool({
    description:
      "อัปเดตจำนวนสต็อกจากการนับจริง (Update product stock from physical count). Sets current_stock, has_been_counted, counted_date, and counted_by. IMPORTANT: Always confirm with user before calling.",
    parameters: z.object({
      product_record_id: z.string().describe("Airtable record ID ของสินค้า"),
      new_count: z.number().describe("จำนวนที่นับได้"),
      counted_by: z.string().optional().describe("ผู้นับ (default: Mai)"),
    }),
    execute: async ({ product_record_id, new_count, counted_by }) => {
      try {
        const product = await getRecord(TABLES.PRODUCTS, product_record_id);
        const currentStock = (product.fields.current_stock as number) || 0;
        const difference = new_count - currentStock;

        await updateRecord(TABLES.PRODUCTS, product_record_id, {
          current_stock: new_count,
          has_been_counted: true,
          counted_date: new Date().toISOString().split("T")[0],
          counted_by: counted_by || "Mai",
        });

        return {
          success: true,
          productName: (product.fields.display_name as string) || "",
          sku: (product.fields.sku as string) || "",
          previousStock: currentStock,
          newStock: new_count,
          difference,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "อัปเดตสต็อกไม่สำเร็จ",
        };
      }
    },
  }),

  update_repair_status: tool({
    description:
      "อัปเดตสถานะงานซ่อม (Update repair job status). Valid transitions: รับงาน→กำลังซ่อม→เสร็จแล้ว→จ่ายแล้ว. IMPORTANT: Always confirm with user before calling.",
    parameters: z.object({
      job_record_id: z.string().describe("Airtable record ID ของงานซ่อม (ได้จาก get_repair_jobs)"),
      new_status: z.string().describe("สถานะใหม่"),
      payment_method: z.string().optional().describe("วิธีชำระ (จำเป็นเมื่อเปลี่ยนเป็น จ่ายแล้ว)"),
      total_collected: z.number().optional().describe("ยอดเก็บจริง (จำเป็นเมื่อเปลี่ยนเป็น จ่ายแล้ว)"),
      notes: z.string().optional().describe("หมายเหตุ"),
    }),
    execute: async ({ job_record_id, new_status, payment_method, total_collected, notes }) => {
      try {
        const normalizedStatus = normalizeSelect(new_status, REPAIR_STATUS_MAP);
        const normalizedPayment = payment_method
          ? normalizeSelect(payment_method, REPAIR_PAYMENT_MAP)
          : undefined;

        const VALID_TRANSITIONS: Record<string, string[]> = {
          "รับงาน (Quoting)": ["กำลังซ่อม (In Progress)"],
          "กำลังซ่อม (In Progress)": ["เสร็จแล้ว (Complete)"],
          "เสร็จแล้ว (Complete)": ["จ่ายแล้ว (Paid)"],
        };

        const currentRecord = await getRecord(TABLES.REPAIR_JOBS, job_record_id);
        const currentStatus = currentRecord.fields.status as string;

        const validNext = VALID_TRANSITIONS[currentStatus];
        if (!validNext || !validNext.includes(normalizedStatus)) {
          return {
            success: false,
            error: `ไม่สามารถเปลี่ยนจาก "${currentStatus}" เป็น "${normalizedStatus}" ได้`,
            currentStatus,
            validTransitions: validNext || [],
          };
        }

        if (normalizedStatus === "จ่ายแล้ว (Paid)") {
          if (!normalizedPayment || total_collected === undefined) {
            return {
              success: false,
              error: "ต้องระบุวิธีชำระและยอดเก็บเมื่อเปลี่ยนเป็นจ่ายแล้ว",
            };
          }
        }

        const updateFields: Record<string, unknown> = {
          status: normalizedStatus,
        };

        if (normalizedStatus === "เสร็จแล้ว (Complete)") {
          updateFields.completion_date_boot = new Date().toISOString().split("T")[0];
        }

        if (normalizedStatus === "จ่ายแล้ว (Paid)") {
          updateFields.payment_method = normalizedPayment;
          updateFields.total_collected = total_collected;
        }

        if (notes) {
          updateFields.notes = notes;
        }

        await updateRecord(TABLES.REPAIR_JOBS, job_record_id, updateFields);

        return {
          success: true,
          jobId: job_record_id,
          jobNumber: currentRecord.fields.job_id as number,
          previousStatus: currentStatus,
          newStatus: normalizedStatus,
          paymentMethod: normalizedPayment || null,
          totalCollected: total_collected || null,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ",
        };
      }
    },
  }),

  get_sales_summary: tool({
    description:
      "สรุปยอดขายตามช่วงเวลา — รายได้, จำนวน, แยกตามวิธีชำระและประเภท (Sales summary by period)",
    parameters: z.object({
      period: z.enum(["today", "yesterday", "week", "last_week", "month", "last_month", "custom"]).describe("ช่วงเวลา"),
      start_date: z.string().optional().describe("วันเริ่มต้น YYYY-MM-DD (สำหรับ custom)"),
      end_date: z.string().optional().describe("วันสิ้นสุด YYYY-MM-DD (สำหรับ custom)"),
    }),
    execute: async ({ period, start_date, end_date }) => {
      try {
        const { start, end } = getDateRange(period, start_date, end_date);

        const records = await selectRecords(TABLES.SALES, {
          filterByFormula: buildDateFilter("sale_date", start, end),
          fields: ["sale_id", "sale_date", "transaction_type", "payment_method", "total", "total_collected"],
        });

        const byPaymentMethod: Record<string, { count: number; total: number }> = {};
        const byType: Record<string, { count: number; total: number }> = {};
        const byDate: Record<string, { count: number; total: number }> = {};
        let totalRevenue = 0;
        let totalCollected = 0;

        records.forEach((r) => {
          const f = r.fields;
          const total = (f.total as number) || 0;
          const collected = (f.total_collected as number) || total;
          const pm = (f.payment_method as string) || "ไม่ระบุ";
          const type = (f.transaction_type as string) || "ไม่ระบุ";
          const date = ((f.sale_date as string) || "").split("T")[0];

          totalRevenue += total;
          totalCollected += collected;

          if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, total: 0 };
          byPaymentMethod[pm].count++;
          byPaymentMethod[pm].total += collected;

          if (!byType[type]) byType[type] = { count: 0, total: 0 };
          byType[type].count++;
          byType[type].total += total;

          if (date) {
            if (!byDate[date]) byDate[date] = { count: 0, total: 0 };
            byDate[date].count++;
            byDate[date].total += collected;
          }
        });

        const dailyBreakdown =
          start !== end
            ? Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, info]) => ({ date, ...info }))
            : undefined;

        return {
          period,
          startDate: start,
          endDate: end,
          count: records.length,
          totalRevenue,
          totalCollected,
          averageSale: records.length > 0 ? Math.round(totalCollected / records.length) : 0,
          byPaymentMethod,
          byTransactionType: byType,
          dailyBreakdown,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "ดึงข้อมูลสรุปยอดขายไม่สำเร็จ" };
      }
    },
  }),

  get_purchase_summary: tool({
    description:
      "สรุปยอดซื้อตามช่วงเวลาและผู้จำหน่าย (Purchase summary by period and supplier)",
    parameters: z.object({
      period: z.enum(["today", "yesterday", "week", "last_week", "month", "last_month", "custom"]).describe("ช่วงเวลา"),
      start_date: z.string().optional().describe("วันเริ่มต้น YYYY-MM-DD"),
      end_date: z.string().optional().describe("วันสิ้นสุด YYYY-MM-DD"),
      supplier_name: z.string().optional().describe("กรองตามผู้จำหน่าย"),
    }),
    execute: async ({ period, start_date, end_date, supplier_name }) => {
      try {
        const { start, end } = getDateRange(period, start_date, end_date);

        const allRecords = await selectRecords(TABLES.PURCHASES, {
          filterByFormula: buildDateFilter("purchase_date", start, end),
          fields: ["purchase_id", "purchase_date", "supplier", "total_paid", "shipping_cost", "payment_method"],
        });

        const supplierIds = new Set<string>();
        allRecords.forEach((p) => {
          const s = p.fields.supplier as string[];
          if (s?.length) s.forEach((id) => supplierIds.add(id));
        });

        const supplierMap: Record<string, string> = {};
        for (const id of Array.from(supplierIds)) {
          try {
            const rec = await getRecord("Suppliers", id);
            supplierMap[id] = (rec.fields.display_name as string) || "ไม่ระบุ";
          } catch {
            supplierMap[id] = "ไม่ระบุ";
          }
        }

        const getSupplierName = (r: (typeof allRecords)[0]) => {
          const ids = (r.fields.supplier as string[]) || [];
          return ids.length > 0 ? supplierMap[ids[0]] || "ไม่ระบุ" : "ไม่ระบุ";
        };

        const records = supplier_name
          ? allRecords.filter((r) =>
              getSupplierName(r).toLowerCase().includes(supplier_name.toLowerCase())
            )
          : allRecords;

        const bySupplier: Record<string, { count: number; total: number }> = {};
        const byPaymentMethod: Record<string, { count: number; total: number }> = {};
        let totalSpent = 0;
        let totalShipping = 0;

        records.forEach((r) => {
          const f = r.fields;
          const paid = (f.total_paid as number) || 0;
          const shipping = (f.shipping_cost as number) || 0;
          const pm = (f.payment_method as string) || "ไม่ระบุ";
          const name = getSupplierName(r);

          totalSpent += paid;
          totalShipping += shipping;

          if (!bySupplier[name]) bySupplier[name] = { count: 0, total: 0 };
          bySupplier[name].count++;
          bySupplier[name].total += paid;

          if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, total: 0 };
          byPaymentMethod[pm].count++;
          byPaymentMethod[pm].total += paid;
        });

        return {
          period,
          startDate: start,
          endDate: end,
          count: records.length,
          totalSpent,
          totalShipping,
          bySupplier,
          byPaymentMethod,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "ดึงข้อมูลสรุปยอดซื้อไม่สำเร็จ" };
      }
    },
  }),

  get_margin_analysis: tool({
    description:
      "วิเคราะห์กำไร — รายได้, ต้นทุน, กำไรขั้นต้น, เปอร์เซ็นต์มาร์จิ้น (Margin analysis: revenue, COGS, gross profit, margin %)",
    parameters: z.object({
      period: z.enum(["today", "yesterday", "week", "last_week", "month", "last_month", "custom"]).describe("ช่วงเวลา"),
      start_date: z.string().optional().describe("วันเริ่มต้น YYYY-MM-DD"),
      end_date: z.string().optional().describe("วันสิ้นสุด YYYY-MM-DD"),
    }),
    execute: async ({ period, start_date, end_date }) => {
      try {
        const { start, end } = getDateRange(period, start_date, end_date);

        const sales = await selectRecords(TABLES.SALES, {
          filterByFormula: buildDateFilter("sale_date", start, end),
          fields: ["sale_id"],
        });

        if (sales.length === 0) {
          return {
            period,
            startDate: start,
            endDate: end,
            totalRevenue: 0,
            totalCOGS: 0,
            grossProfit: 0,
            marginPercent: 0,
            itemCount: 0,
            isPartial: false,
            topMarginProducts: [],
            worstMarginProducts: [],
          };
        }

        const saleRecordIds = new Set(sales.map((s) => s.id));

        const lineItems = await selectRecords("Sale Line Items", {
          fields: ["sale_id", "quantity", "line_total", "product_cost_lookup", "product_name_lookup"],
          maxRecords: 500,
        });

        const matched = lineItems.filter((li) => {
          const saleIds = (li.fields.sale_id as string[]) || [];
          return saleIds.some((id) => saleRecordIds.has(id));
        });

        const byProduct: Record<string, { name: string; revenue: number; cost: number; qty: number }> = {};
        let totalRevenue = 0;
        let totalCOGS = 0;

        matched.forEach((li) => {
          const f = li.fields;
          const qty = (f.quantity as number) || 0;
          const lineTotal = (f.line_total as number) || 0;
          const costArr = f.product_cost_lookup as number[];
          const nameArr = f.product_name_lookup as string[];
          const unitCost = Array.isArray(costArr) && costArr.length > 0 ? costArr[0] : 0;
          const name = Array.isArray(nameArr) && nameArr.length > 0 ? nameArr[0] : "ไม่ระบุ";

          const lineCost = unitCost * qty;
          totalRevenue += lineTotal;
          totalCOGS += lineCost;

          if (!byProduct[name]) byProduct[name] = { name, revenue: 0, cost: 0, qty: 0 };
          byProduct[name].revenue += lineTotal;
          byProduct[name].cost += lineCost;
          byProduct[name].qty += qty;
        });

        const grossProfit = totalRevenue - totalCOGS;
        const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

        const productMargins = Object.values(byProduct)
          .map((p) => ({
            name: p.name,
            revenue: Math.round(p.revenue),
            cost: Math.round(p.cost),
            profit: Math.round(p.revenue - p.cost),
            margin: p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
            quantity: p.qty,
          }))
          .sort((a, b) => b.profit - a.profit);

        return {
          period,
          startDate: start,
          endDate: end,
          totalRevenue: Math.round(totalRevenue),
          totalCOGS: Math.round(totalCOGS),
          grossProfit: Math.round(grossProfit),
          marginPercent,
          itemCount: matched.length,
          isPartial: lineItems.length >= 500,
          topMarginProducts: productMargins.slice(0, 5),
          worstMarginProducts: productMargins.slice(-5).reverse(),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "วิเคราะห์กำไรไม่สำเร็จ" };
      }
    },
  }),

  get_slow_movers: tool({
    description:
      "สินค้าค้างสต็อก — สินค้าที่มีสต็อกแต่ไม่ขายมานาน (Products with stock but low/no recent sales)",
    parameters: z.object({
      min_stock: z.number().optional().describe("สต็อกขั้นต่ำ (default: 1)"),
      limit: z.number().optional().describe("จำนวนรายการ (default: 20)"),
    }),
    execute: async ({ min_stock, limit }) => {
      try {
        const minStk = min_stock ?? 1;
        const maxItems = limit ?? 20;

        const products = await selectRecords(TABLES.PRODUCTS, {
          filterByFormula: `AND({current_stock} >= ${minStk}, {category} != 'ค่าแรง (Labor & Services)')`,
          fields: [
            "sku",
            "display_name",
            "current_stock",
            "last_known_cost_baht",
            "last_known_sell_price_baht",
            "category",
            "total_units_sold",
            "stock_value_cost",
          ],
          sort: [{ field: "total_units_sold", direction: "asc" }],
        });

        const slowMovers = products
          .filter((p) => ((p.fields.total_units_sold as number) || 0) <= 2)
          .slice(0, maxItems);

        const totalCapitalTiedUp = slowMovers.reduce(
          (sum, p) => sum + ((p.fields.stock_value_cost as number) || 0),
          0
        );

        return {
          count: slowMovers.length,
          totalCapitalTiedUp: Math.round(totalCapitalTiedUp),
          products: slowMovers.map((p) => ({
            sku: (p.fields.sku as string) || "",
            name: (p.fields.display_name as string) || "",
            stock: (p.fields.current_stock as number) || 0,
            cost: (p.fields.last_known_cost_baht as number) || 0,
            sellPrice: (p.fields.last_known_sell_price_baht as number) || 0,
            unitsSold: (p.fields.total_units_sold as number) || 0,
            capitalTiedUp: Math.round((p.fields.stock_value_cost as number) || 0),
            category: (p.fields.category as string) || "",
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "ดึงข้อมูลสินค้าค้างสต็อกไม่สำเร็จ" };
      }
    },
  }),

  get_top_sellers: tool({
    description:
      "สินค้าขายดี — อันดับสินค้าตามยอดขายหรือรายได้ (Top selling products by quantity or revenue)",
    parameters: z.object({
      period: z.enum(["week", "month", "last_month", "all_time", "custom"]).describe("ช่วงเวลา"),
      start_date: z.string().optional().describe("วันเริ่มต้น YYYY-MM-DD"),
      end_date: z.string().optional().describe("วันสิ้นสุด YYYY-MM-DD"),
      metric: z.enum(["quantity", "revenue"]).optional().describe("เรียงตาม (default: revenue)"),
      limit: z.number().optional().describe("จำนวนอันดับ (default: 10)"),
    }),
    execute: async ({ period, start_date, end_date, metric, limit }) => {
      try {
        const sortMetric = metric || "revenue";
        const maxItems = limit || 10;

        if (period === "all_time") {
          const sortField = sortMetric === "quantity" ? "total_units_sold" : "total_revenue";
          const products = await selectRecords(TABLES.PRODUCTS, {
            filterByFormula: `{total_units_sold} > 0`,
            fields: ["sku", "display_name", "total_units_sold", "total_revenue", "current_stock", "category"],
            sort: [{ field: sortField, direction: "desc" }],
            maxRecords: maxItems,
          });

          return {
            period: "all_time",
            metric: sortMetric,
            limit: maxItems,
            products: products.map((p, i) => ({
              rank: i + 1,
              name: (p.fields.display_name as string) || "",
              sku: (p.fields.sku as string) || "",
              totalQuantity: (p.fields.total_units_sold as number) || 0,
              totalRevenue: (p.fields.total_revenue as number) || 0,
              currentStock: (p.fields.current_stock as number) || 0,
              category: (p.fields.category as string) || "",
            })),
          };
        }

        const { start, end } = getDateRange(period, start_date, end_date);

        const sales = await selectRecords(TABLES.SALES, {
          filterByFormula: buildDateFilter("sale_date", start, end),
          fields: ["sale_id"],
        });

        if (sales.length === 0) {
          return { period, startDate: start, endDate: end, metric: sortMetric, limit: maxItems, products: [] };
        }

        const saleRecordIds = new Set(sales.map((s) => s.id));

        const lineItems = await selectRecords("Sale Line Items", {
          fields: ["sale_id", "quantity", "line_total", "product_name_lookup"],
          maxRecords: 500,
        });

        const matched = lineItems.filter((li) => {
          const saleIds = (li.fields.sale_id as string[]) || [];
          return saleIds.some((id) => saleRecordIds.has(id));
        });

        const byProduct: Record<string, { name: string; qty: number; revenue: number }> = {};
        matched.forEach((li) => {
          const f = li.fields;
          const nameArr = f.product_name_lookup as string[];
          const name = Array.isArray(nameArr) && nameArr.length > 0 ? nameArr[0] : "ไม่ระบุ";
          const qty = (f.quantity as number) || 0;
          const revenue = (f.line_total as number) || 0;

          if (!byProduct[name]) byProduct[name] = { name, qty: 0, revenue: 0 };
          byProduct[name].qty += qty;
          byProduct[name].revenue += revenue;
        });

        const sorted = Object.values(byProduct)
          .sort((a, b) => (sortMetric === "quantity" ? b.qty - a.qty : b.revenue - a.revenue))
          .slice(0, maxItems);

        return {
          period,
          startDate: start,
          endDate: end,
          metric: sortMetric,
          limit: maxItems,
          products: sorted.map((p, i) => ({
            rank: i + 1,
            name: p.name,
            totalQuantity: p.qty,
            totalRevenue: Math.round(p.revenue),
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "ดึงข้อมูลสินค้าขายดีไม่สำเร็จ" };
      }
    },
  }),

  update_repair_from_workorder: tool({
    description:
      "อัปเดตงานซ่อมจากใบสั่งงานที่บูทกรอก — ชั่วโมงจริง, อะไหล่เพิ่มเติม, หมายเหตุ (Update repair job from Boot's completed work order). IMPORTANT: Always confirm with user before calling.",
    parameters: z.object({
      job_id: z.number().describe("เลขที่งานซ่อม (auto-number)"),
      actual_hours_seconds: z
        .number()
        .describe("ชั่วโมงจริงรวม เป็นวินาที (เช่น 6.5 ชม. = 23400)"),
      additional_parts: z
        .array(
          z.object({
            product_name: z.string().describe("ชื่ออะไหล่"),
            quantity: z.number().describe("จำนวน"),
          })
        )
        .optional()
        .describe("อะไหล่เพิ่มเติม"),
      notes: z.string().optional().describe("หมายเหตุจากบูท"),
      boot_advice: z
        .string()
        .optional()
        .describe("คำแนะนำให้มายแจ้งลูกค้า"),
      completion_date: z
        .string()
        .optional()
        .describe("วันที่ซ่อมเสร็จ YYYY-MM-DD"),
    }),
    execute: async ({
      job_id,
      actual_hours_seconds,
      additional_parts,
      notes,
      boot_advice,
      completion_date,
    }) => {
      try {
        const jobs = await selectRecords(TABLES.REPAIR_JOBS, {
          filterByFormula: `{job_id} = ${job_id}`,
          maxRecords: 1,
          fields: ["job_id", "status", "notes"],
        });

        if (jobs.length === 0) {
          return {
            success: false,
            error: `ไม่พบงานซ่อม #${job_id}`,
          };
        }

        const jobRecord = jobs[0];

        const updateFields: Record<string, unknown> = {
          actual_hours: actual_hours_seconds,
          status: "เสร็จแล้ว (Complete)",
          completion_date_boot:
            completion_date || new Date().toISOString().split("T")[0],
        };

        if (notes) {
          updateFields.notes = notes;
        }
        if (boot_advice) {
          updateFields.boot_advice_for_mai = boot_advice;
        }

        await updateRecord(TABLES.REPAIR_JOBS, jobRecord.id, updateFields);

        const matchedParts: string[] = [];
        const unmatchedParts: string[] = [];

        if (additional_parts && additional_parts.length > 0) {
          for (const part of additional_parts) {
            const s = sanitizeForFormula(part.product_name);
            const products = await selectRecords(TABLES.PRODUCTS, {
              filterByFormula: `SEARCH("${s}", {display_name})`,
              maxRecords: 1,
              fields: ["sku", "display_name"],
            });

            if (products.length > 0) {
              await createRecord(TABLES.REPAIR_JOB_PARTS, {
                repair_job: [jobRecord.id],
                product: [products[0].id],
                quantity: part.quantity,
              });
              matchedParts.push(part.product_name);
            } else {
              unmatchedParts.push(part.product_name);
            }
          }
        }

        return {
          success: true,
          jobId: job_id,
          jobRecordId: jobRecord.id,
          actualHours: actual_hours_seconds / 3600,
          partsAdded: matchedParts.length,
          unmatchedParts,
          status: "เสร็จแล้ว (Complete)",
          notes: notes || null,
          bootAdvice: boot_advice || null,
        };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "อัปเดตงานซ่อมจากใบสั่งงานไม่สำเร็จ",
        };
      }
    },
  }),

  get_cash_flow_summary: tool({
    description:
      "สรุปกระแสเงินสด — รายได้, ค่าใช้จ่าย, ยอดซื้อ, เงินเบิก, กระแสเงินสดสุทธิ (Cash flow overview)",
    parameters: z.object({
      period: z.enum(["today", "week", "month", "last_month", "custom"]).describe("ช่วงเวลา"),
      start_date: z.string().optional().describe("วันเริ่มต้น YYYY-MM-DD"),
      end_date: z.string().optional().describe("วันสิ้นสุด YYYY-MM-DD"),
    }),
    execute: async ({ period, start_date, end_date }) => {
      try {
        const { start, end } = getDateRange(period, start_date, end_date);

        const [sales, purchases, expenses, draws] = await Promise.all([
          selectRecords(TABLES.SALES, {
            filterByFormula: buildDateFilter("sale_date", start, end),
            fields: ["total", "total_collected", "payment_method"],
          }),
          selectRecords(TABLES.PURCHASES, {
            filterByFormula: buildDateFilter("purchase_date", start, end),
            fields: ["total_paid", "shipping_cost", "payment_method"],
          }),
          selectRecords(TABLES.EXPENSES, {
            filterByFormula: buildDateFilter("expense_date", start, end),
            fields: ["amount", "category", "payment_method"],
          }),
          selectRecords(TABLES.DAILY_PERSON_DRAWS, {
            filterByFormula: buildDateFilter("date", start, end),
            fields: ["person", "salary", "food", "other", "total"],
          }),
        ]);

        let totalRevenue = 0;
        let cashSales = 0;
        let transferSales = 0;
        let creditSales = 0;

        sales.forEach((s) => {
          const collected = (s.fields.total_collected as number) || (s.fields.total as number) || 0;
          const pm = ((s.fields.payment_method as string) || "").toLowerCase();
          totalRevenue += collected;
          if (pm.includes("เงินสด")) cashSales += collected;
          else if (pm.includes("โอน")) transferSales += collected;
          else if (pm.includes("เครดิต")) creditSales += collected;
        });

        const totalPurchases = purchases.reduce(
          (sum, p) => sum + ((p.fields.total_paid as number) || 0),
          0
        );

        const expenseByCategory: Record<string, number> = {};
        let totalExpenses = 0;
        expenses.forEach((e) => {
          const amount = (e.fields.amount as number) || 0;
          const cat = (e.fields.category as string) || "อื่นๆ";
          totalExpenses += amount;
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amount;
        });

        const totalDraws = draws.reduce(
          (sum, d) => sum + ((d.fields.total as number) || 0),
          0
        );

        const totalCashIn = totalRevenue;
        const totalCashOut = totalPurchases + totalExpenses + totalDraws;
        const netCashFlow = totalCashIn - totalCashOut;

        return {
          period,
          startDate: start,
          endDate: end,
          revenue: {
            total: Math.round(totalRevenue),
            cash: Math.round(cashSales),
            transfer: Math.round(transferSales),
            credit: Math.round(creditSales),
            salesCount: sales.length,
          },
          expenses: {
            total: Math.round(totalExpenses),
            byCategory: expenseByCategory,
            count: expenses.length,
          },
          purchases: {
            total: Math.round(totalPurchases),
            count: purchases.length,
          },
          draws: {
            total: Math.round(totalDraws),
            count: draws.length,
          },
          cashFlow: {
            totalIn: Math.round(totalCashIn),
            totalOut: Math.round(totalCashOut),
            net: Math.round(netCashFlow),
          },
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "ดึงข้อมูลกระแสเงินสดไม่สำเร็จ" };
      }
    },
  }),
};
