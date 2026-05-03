"use client";

import { formatBaht } from "@/lib/utils";
import { VarianceBadge } from "./variance-badge";
import type { ReconciliationResult } from "@/lib/types";

type ReconciliationProps = {
  result: ReconciliationResult;
};

export function Reconciliation({ result }: ReconciliationProps) {
  const { breakdown } = result;

  return (
    <div className="bg-surface rounded-xl p-4 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-1">
        💵 กระทบยอดเงินสด
      </h2>
      <p className="text-xs text-slate-400 mb-4">Cash Reconciliation</p>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-white">
          <span>ยอดเปิดร้าน (Starting)</span>
          <span className="font-semibold">
            {formatBaht(result.starting_balance)}
          </span>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="text-emerald-400 font-semibold mb-2">
            ＋ เงินเข้า (Cash In)
          </div>
          <div className="flex justify-between text-slate-300 pl-3">
            <span>ยอดขายเงินสด (Cash Sales)</span>
            <span>
              {formatBaht(
                result.total_cash_in - breakdown.section_c.in
              )}
            </span>
          </div>
          {breakdown.section_c.in > 0 && (
            <div className="flex justify-between text-slate-300 pl-3">
              <span>เงินสดเข้าอื่น (Other In)</span>
              <span>{formatBaht(breakdown.section_c.in)}</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-400 font-semibold pl-3 mt-1 border-t border-slate-700 pt-1">
            <span>รวมเข้า (Total In)</span>
            <span>{formatBaht(result.total_cash_in)}</span>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="text-red-400 font-semibold mb-2">
            － เงินออก (Cash Out)
          </div>

          {breakdown.total_draws > 0 && (
            <div className="pl-3 mb-1">
              <div className="text-slate-400 text-xs mb-1">
                เบิกส่วนตัว (Draws)
              </div>
              <div className="text-slate-300 text-xs">
                {breakdown.person_draws
                  .filter((p) => p.salary > 0)
                  .map((p) => `${p.name} ${formatBaht(p.salary)}`)
                  .join(" · ")}
              </div>
            </div>
          )}

          {breakdown.total_food > 0 && (
            <div className="pl-3 mb-1">
              <div className="text-slate-400 text-xs mb-1">
                อาหาร (Food)
              </div>
              <div className="text-slate-300 text-xs">
                {breakdown.person_draws
                  .filter((p) => p.food > 0)
                  .map((p) => `${p.name} ${formatBaht(p.food)}`)
                  .join(" · ")}
              </div>
            </div>
          )}

          {breakdown.total_other_personal > 0 && (
            <div className="pl-3 mb-1">
              <div className="text-slate-400 text-xs mb-1">
                อื่นๆส่วนตัว (Other)
              </div>
              <div className="text-slate-300 text-xs">
                {breakdown.person_draws
                  .filter((p) => p.other > 0)
                  .map((p) => `${p.name} ${formatBaht(p.other)}`)
                  .join(" · ")}
              </div>
            </div>
          )}

          {breakdown.delivery_cash_paid.total > 0 && (
            <div className="pl-3 mb-1">
              <div className="text-slate-400 text-xs mb-1">
                จ่ายค่าส่ง (Delivery Cash Paid)
              </div>
              <div className="text-slate-300 text-xs">
                {breakdown.delivery_cash_paid.am > 0 &&
                  `เช้า ${formatBaht(breakdown.delivery_cash_paid.am)}`}
                {breakdown.delivery_cash_paid.am > 0 &&
                  breakdown.delivery_cash_paid.pm > 0 &&
                  " · "}
                {breakdown.delivery_cash_paid.pm > 0 &&
                  `เย็น ${formatBaht(breakdown.delivery_cash_paid.pm)}`}
              </div>
            </div>
          )}

          {breakdown.section_c.out > 0 && (
            <div className="flex justify-between text-slate-300 pl-3">
              <span>อื่นๆ (Other Out)</span>
              <span>{formatBaht(breakdown.section_c.out)}</span>
            </div>
          )}

          <div className="flex justify-between text-red-400 font-semibold pl-3 mt-1 border-t border-slate-700 pt-1">
            <span>รวมออก (Total Out)</span>
            <span>{formatBaht(result.total_cash_out)}</span>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3 space-y-2">
          <div className="text-white font-semibold mb-2">── ผลลัพธ์ ──</div>
          <div className="flex justify-between text-slate-300">
            <span>ยอดที่ควรจะเป็น (Expected)</span>
            <span className="font-semibold">
              {formatBaht(result.expected_balance)}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>ยอดนับจริง (Actual Count)</span>
            <span className="font-semibold">
              {formatBaht(result.actual_cash_count)}
            </span>
          </div>
          <VarianceBadge variance={result.variance} />
        </div>
      </div>
    </div>
  );
}
