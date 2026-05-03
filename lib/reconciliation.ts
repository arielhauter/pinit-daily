import type { ExtractionResult, ActivitySummary, ReconciliationResult } from "./types";

export function computeReconciliation(
  extraction: ExtractionResult,
  activity: ActivitySummary
): ReconciliationResult {
  const section_c_in = extraction.section_c_items
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + item.amount, 0);

  const total_cash_in = activity.sales.cash_total + section_c_in;

  const total_draws = extraction.person_draws.reduce(
    (sum, p) => sum + p.salary,
    0
  );

  const total_food = extraction.person_draws.reduce(
    (sum, p) => sum + p.food,
    0
  );

  const total_other_personal = extraction.person_draws.reduce(
    (sum, p) => sum + p.other,
    0
  );

  const total_delivery = extraction.delivery_am + extraction.delivery_pm;

  const section_c_out = extraction.section_c_items
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + item.amount, 0);

  const refunds = 0;

  const total_cash_out =
    total_draws +
    total_food +
    total_other_personal +
    total_delivery +
    refunds +
    section_c_out;

  const expected_balance =
    extraction.starting_balance + total_cash_in - total_cash_out;

  const variance = extraction.actual_cash_count - expected_balance;

  return {
    starting_balance: extraction.starting_balance,
    total_cash_in,
    total_cash_out,
    expected_balance,
    actual_cash_count: extraction.actual_cash_count,
    variance,
    breakdown: {
      person_draws: extraction.person_draws.map((p) => ({
        name: p.name,
        salary: p.salary,
        food: p.food,
        other: p.other,
        total: p.salary + p.food + p.other,
      })),
      total_draws,
      total_food,
      total_other_personal,
      delivery_cash_paid: {
        am: extraction.delivery_am,
        pm: extraction.delivery_pm,
        total: total_delivery,
      },
      refunds,
      section_c: {
        in: section_c_in,
        out: section_c_out,
        items: extraction.section_c_items,
      },
    },
  };
}
