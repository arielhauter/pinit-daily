"use client";

import { ActivityCard } from "./activity-card";
import type { ActivitySummary } from "@/lib/types";

type ActivityGridProps = {
  activity: ActivitySummary;
};

export function ActivityGrid({ activity }: ActivityGridProps) {
  const repairDetail = Object.entries(activity.repairs.by_status)
    .map(([status, count]) => `${count} ${status.split(" (")[0]}`)
    .join(", ");

  return (
    <div className="grid grid-cols-3 gap-3">
      <ActivityCard
        icon="📗"
        titleTh="ขาย"
        titleEn="Sales"
        count={activity.sales.count}
        countLabel="รายการ"
        total={activity.sales.total}
        hasActivity={activity.sales.count > 0}
        delay={0}
      />
      <ActivityCard
        icon="📘"
        titleTh="ซื้อ"
        titleEn="Purchases"
        count={activity.purchases.count}
        countLabel="รายการ"
        total={activity.purchases.total}
        hasActivity={activity.purchases.count > 0}
        delay={100}
      />
      <ActivityCard
        icon="📙"
        titleTh="ซ่อม"
        titleEn="Repairs"
        count={activity.repairs.count}
        countLabel="งาน"
        total={activity.repairs.total_quoted}
        hasActivity={activity.repairs.count > 0}
        detail={repairDetail || undefined}
        delay={200}
      />
      <ActivityCard
        icon="📦"
        titleTh="รับของ"
        titleEn="Received"
        count={activity.inventory_received.item_count}
        countLabel="ชิ้น"
        hasActivity={activity.inventory_received.item_count > 0}
        detail={
          activity.inventory_received.unit_count > 0
            ? `${activity.inventory_received.unit_count} หน่วย`
            : undefined
        }
        delay={300}
      />
      <ActivityCard
        icon="💸"
        titleTh="จ่าย"
        titleEn="Expenses"
        count={activity.expenses.count}
        countLabel="รายการ"
        total={activity.expenses.total}
        hasActivity={activity.expenses.count > 0}
        delay={400}
      />
      <ActivityCard
        icon="💰"
        titleTh="เงินสด"
        titleEn="Cash Sales"
        count={activity.sales.count}
        countLabel=""
        total={activity.sales.cash_total}
        hasActivity={activity.sales.cash_total > 0}
        delay={500}
      />
    </div>
  );
}
