export const TABLES = {
  SALES: "Sales",
  PURCHASES: "Purchases",
  PURCHASE_LINE_ITEMS: "Purchase Line Items",
  REPAIR_JOBS: "Repair Jobs",
  REPAIR_JOB_PARTS: "Repair Job Parts",
  EXPENSES: "Expenses",
  PRODUCTS: "Products",
  DAILY_CASH_RECONCILIATION: "Daily Cash Reconciliation",
  DAILY_PERSON_DRAWS: "Daily Person Draws",
} as const;

export const PAYMENT_METHODS = {
  CASH: "เงินสด (Cash)",
  TRANSFER: "โอน (Transfer)",
  CREDIT: "เครดิต (Credit)",
} as const;

export const REPAIR_STATUSES = {
  QUOTING: "รับงาน (Quoting)",
  IN_PROGRESS: "กำลังซ่อม (In Progress)",
  COMPLETE: "เสร็จแล้ว (Complete)",
  PAID: "จ่ายแล้ว (Paid)",
} as const;

export const NAME_MAP: Record<string, string> = {
  ใหม่: "Mai",
  mai: "Mai",
  Mai: "Mai",
  บู๊ท: "Boot",
  boot: "Boot",
  Boot: "Boot",
  พินิจ: "Pinit",
  pinit: "Pinit",
  Pinit: "Pinit",
  แอ๊ด: "Aed",
  aed: "Aed",
  Aed: "Aed",
  ไกล: "Kai",
  แม่: "Kai",
  kai: "Kai",
  Kai: "Kai",
};

export function normalizeName(name: string): string {
  return NAME_MAP[name.trim()] || name.trim();
}

export const VARIANCE_THRESHOLD = parseInt(
  process.env.VARIANCE_THRESHOLD || "50",
  10
);

export const SESSION_COOKIE = "pinit-session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const STREAK_MILESTONES: Record<number, string> = {
  1: "🌱 เริ่มต้นดี! (Good start!)",
  3: "💪 3 วันติดต่อกัน! (3 days in a row!)",
  7: "🔥 ครบสัปดาห์! (Full week!)",
  14: "⭐ 2 สัปดาห์! เก่งมาก! (2 weeks! Amazing!)",
  30: "🏆 ครบเดือน! ยอดเยี่ยม! (Full month! Outstanding!)",
};
