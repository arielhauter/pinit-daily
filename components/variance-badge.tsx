"use client";

import { cn, formatBaht } from "@/lib/utils";
import { VARIANCE_THRESHOLD } from "@/lib/constants";

type VarianceBadgeProps = {
  variance: number;
};

export function VarianceBadge({ variance }: VarianceBadgeProps) {
  const absVariance = Math.abs(variance);
  const isExact = variance === 0;
  const isMinor = absVariance <= VARIANCE_THRESHOLD;

  let bgColor: string;
  let textColor: string;
  let icon: string;
  let messageTh: string;
  let messageEn: string;

  if (isExact) {
    bgColor = "bg-emerald-900/50 border-emerald-500";
    textColor = "text-emerald-400";
    icon = "✅";
    messageTh = "ยอดตรง!";
    messageEn = "Cash matches!";
  } else if (isMinor) {
    bgColor = "bg-yellow-900/50 border-yellow-500";
    textColor = "text-yellow-400";
    icon = "⚠️";
    messageTh =
      variance > 0
        ? `เกินเล็กน้อย ${formatBaht(absVariance)}`
        : `ขาดเล็กน้อย ${formatBaht(absVariance)}`;
    messageEn = `Minor variance`;
  } else {
    bgColor = "bg-red-900/50 border-red-500";
    textColor = "text-red-400";
    icon = "❌";
    messageTh =
      variance > 0
        ? `เกินมาก ${formatBaht(absVariance)}`
        : `ขาดมาก ${formatBaht(absVariance)}`;
    messageEn = "Large variance — please check";
  }

  return (
    <div
      className={cn(
        "rounded-lg p-3 border text-center mt-2",
        bgColor,
        isExact && "animate-pulse"
      )}
    >
      <div className={cn("text-lg font-bold", textColor)}>
        {icon} ผลต่าง (Variance): {formatBaht(variance)}
      </div>
      <div className={cn("text-sm", textColor)}>
        {messageTh}
      </div>
      <div className="text-xs text-slate-400">{messageEn}</div>
    </div>
  );
}
