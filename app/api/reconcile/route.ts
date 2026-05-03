import { createRecord, createRecords } from "@/lib/airtable";
import { TABLES, normalizeName, VARIANCE_THRESHOLD } from "@/lib/constants";
import type { ReconcilePayload } from "@/lib/types";

export const dynamic = "force-dynamic";

function sumSectionC(
  items: { amount: number; direction: string }[],
  dir: "in" | "out"
): number {
  return items
    .filter((item) => item.direction === dir)
    .reduce((sum, item) => sum + item.amount, 0);
}

export async function POST(request: Request) {
  const data: ReconcilePayload = await request.json();

  const drawsToCreate = data.extraction.person_draws
    .filter((p) => p.salary > 0 || p.food > 0 || p.other > 0)
    .map((person) => ({
      date: data.date,
      person: normalizeName(person.name),
      salary: person.salary,
      food: person.food,
      other: person.other,
    }));

  let drawRecordIds: string[] = [];
  if (drawsToCreate.length > 0) {
    const drawRecords = await createRecords(
      TABLES.DAILY_PERSON_DRAWS,
      drawsToCreate
    );
    drawRecordIds = drawRecords.map((r) => r.id);
  }

  const reconciliationFields: Record<string, unknown> = {
    date: data.date,
    starting_balance: data.extraction.starting_balance,
    total_cash_sales: data.activity.sales.cash_total,
    total_cash_refunds: 0,
    delivery_cash_paid:
      data.extraction.delivery_am + data.extraction.delivery_pm,
    other_cash_in: sumSectionC(data.extraction.section_c_items, "in"),
    other_cash_out: sumSectionC(data.extraction.section_c_items, "out"),
    actual_count: data.extraction.actual_cash_count,
    notes: data.note || "",
    section_c_detail: JSON.stringify(data.extraction.section_c_items),
    extraction_confidence: data.extraction.extraction_confidence,
    entered_via: "app",
  };

  if (drawRecordIds.length > 0) {
    reconciliationFields.person_draws = drawRecordIds;
  }

  await createRecord(TABLES.DAILY_CASH_RECONCILIATION, reconciliationFields);

  const streak = await calculateStreak(data.date);

  return Response.json({ success: true, streak });
}

async function calculateStreak(fromDate: string): Promise<number> {
  const { selectRecords: select } = await import("@/lib/airtable");
  const records = await select(TABLES.DAILY_CASH_RECONCILIATION, {
    fields: ["date"],
    sort: [{ field: "date", direction: "desc" }],
    maxRecords: 60,
  });

  const dates = new Set(
    records.map((r) => r.fields.date as string)
  );

  let streak = 0;
  const current = new Date(fromDate + "T00:00:00");

  while (true) {
    const dateStr = current.toISOString().split("T")[0];
    if (dates.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
