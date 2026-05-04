import { NextRequest } from "next/server";
import { selectRecords } from "@/lib/airtable";
import { TABLES, PAYMENT_METHODS } from "@/lib/constants";
import type { ActivitySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseCurrency(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[฿,\s]/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return Response.json({ error: "Missing date parameter" }, { status: 400 });
  }

  try {
    const [sales, purchases, repairs, expenses, receivedItems] =
      await Promise.all([
        selectRecords(TABLES.SALES, {
          filterByFormula: `IS_SAME({sale_date}, '${date}', 'day')`,
          fields: [
            "sale_date",
            "total",
            "total_collected",
            "payment_method",
            "transaction_type",
          ],
        }),
        selectRecords(TABLES.PURCHASES, {
          filterByFormula: `IS_SAME({purchase_date}, '${date}', 'day')`,
          fields: [
            "purchase_date",
            "total",
            "total_paid",
            "supplier",
            "payment_method",
          ],
        }),
        selectRecords(TABLES.REPAIR_JOBS, {
          filterByFormula: `OR(IS_SAME({quoted_date}, '${date}', 'day'),IS_SAME({start_date}, '${date}', 'day'),IS_SAME({completion_date_boot}, '${date}', 'day'))`,
          fields: ["status", "quoted_price", "total_collected"],
        }),
        selectRecords(TABLES.EXPENSES, {
          filterByFormula: `IS_SAME({expense_date}, '${date}', 'day')`,
          fields: ["expense_date", "amount", "category", "payment_method"],
        }),
        selectRecords(TABLES.PURCHASE_LINE_ITEMS, {
          filterByFormula: `IS_SAME({received_at}, '${date}', 'day')`,
          fields: ["product", "quantity", "total_units_received"],
        }),
      ]);

    let salesTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let creditTotal = 0;

    for (const record of sales) {
      const f = record.fields;
      const amount = parseCurrency(f.total_collected) || parseCurrency(f.total);
      salesTotal += amount;

      const method = (f.payment_method as string) || "";
      if (method === PAYMENT_METHODS.CASH) {
        cashTotal += amount;
      } else if (method === PAYMENT_METHODS.TRANSFER) {
        transferTotal += amount;
      } else if (method === PAYMENT_METHODS.CREDIT) {
        creditTotal += amount;
      }
    }

    let purchasesTotal = 0;
    for (const record of purchases) {
      purchasesTotal += parseCurrency(record.fields.total);
    }

    const repairsByStatus: Record<string, number> = {};
    let totalQuoted = 0;
    for (const record of repairs) {
      const status = (record.fields.status as string) || "Unknown";
      repairsByStatus[status] = (repairsByStatus[status] || 0) + 1;
      totalQuoted += parseCurrency(record.fields.quoted_price);
    }

    let expensesTotal = 0;
    for (const record of expenses) {
      expensesTotal += parseCurrency(record.fields.amount);
    }

    let itemCount = 0;
    let unitCount = 0;
    for (const record of receivedItems) {
      itemCount++;
      unitCount += parseCurrency(record.fields.total_units_received) || parseCurrency(record.fields.quantity);
    }

    const summary: ActivitySummary = {
      sales: {
        count: sales.length,
        total: salesTotal,
        cash_total: cashTotal,
        transfer_total: transferTotal,
        credit_total: creditTotal,
      },
      purchases: {
        count: purchases.length,
        total: purchasesTotal,
      },
      repairs: {
        count: repairs.length,
        by_status: repairsByStatus,
        total_quoted: totalQuoted,
      },
      expenses: {
        count: expenses.length,
        total: expensesTotal,
      },
      inventory_received: {
        item_count: itemCount,
        unit_count: unitCount,
      },
    };

    return Response.json(summary);
  } catch (err) {
    console.error("Activity fetch error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch activity data" },
      { status: 500 }
    );
  }
}
