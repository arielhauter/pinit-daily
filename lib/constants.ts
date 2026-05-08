export const TABLES = {
  SALES: "Sales",
  SALE_LINE_ITEMS: "Sale Line Items",
  PURCHASES: "Purchases",
  PURCHASE_LINE_ITEMS: "Purchase Line Items",
  REPAIR_JOBS: "Repair Jobs",
  REPAIR_JOB_PARTS: "Repair Job Parts",
  EXPENSES: "Expenses",
  PRODUCTS: "Products",
  CUSTOMERS: "Customers",
  VEHICLES: "Vehicles",
  DAILY_CASH_RECONCILIATION: "Daily Cash Reconciliation",
  DAILY_PERSON_DRAWS: "Daily Person Draws",
  ACTIVITY_LOG: "Activity Log",
  CHAT_SESSIONS: "Chat Sessions",
} as const;

export const EFFORT_TIER_MAP: Record<string, string> = {
  "1": "Tier 1 — งานเร็ว (Quick)",
  "tier 1": "Tier 1 — งานเร็ว (Quick)",
  "quick": "Tier 1 — งานเร็ว (Quick)",
  "งานเร็ว": "Tier 1 — งานเร็ว (Quick)",
  "2": "Tier 2 — งานปกติ (Standard)",
  "tier 2": "Tier 2 — งานปกติ (Standard)",
  "standard": "Tier 2 — งานปกติ (Standard)",
  "งานปกติ": "Tier 2 — งานปกติ (Standard)",
  "3": "Tier 3 — งานฝีมือ (Skilled)",
  "tier 3": "Tier 3 — งานฝีมือ (Skilled)",
  "skilled": "Tier 3 — งานฝีมือ (Skilled)",
  "งานฝีมือ": "Tier 3 — งานฝีมือ (Skilled)",
  "4": "Tier 4 — งานซับซ้อน (Complex)",
  "tier 4": "Tier 4 — งานซับซ้อน (Complex)",
  "complex": "Tier 4 — งานซับซ้อน (Complex)",
  "งานซับซ้อน": "Tier 4 — งานซับซ้อน (Complex)",
  "5": "Tier 5 — งานใหญ่ (Major)",
  "tier 5": "Tier 5 — งานใหญ่ (Major)",
  "major": "Tier 5 — งานใหญ่ (Major)",
  "งานใหญ่": "Tier 5 — งานใหญ่ (Major)",
};

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

export const DAILY_COST_CAP_CENTS = parseInt(
  process.env.DAILY_COST_CAP_CENTS || "500",
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
