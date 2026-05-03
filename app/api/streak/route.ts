import { selectRecords } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";
import type { StreakData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await selectRecords(TABLES.DAILY_CASH_RECONCILIATION, {
    fields: ["date"],
    sort: [{ field: "date", direction: "desc" }],
    maxRecords: 60,
  });

  const dates = new Set(
    records.map((r) => r.fields.date as string)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const current = new Date(today);

  while (true) {
    const dateStr = current.toISOString().split("T")[0];
    if (dates.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekView: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    weekView.push(dates.has(dateStr));
  }

  const result: StreakData = { streak, weekView };
  return Response.json(result);
}
