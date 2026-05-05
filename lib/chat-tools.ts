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
};
