export type PersonDraw = {
  name: string;
  salary: number;
  food: number;
  other: number;
};

export type SectionCItem = {
  who: string;
  store: string;
  description: string;
  amount: number;
  direction: "in" | "out";
};

export type ExtractionResult = {
  date: string;
  starting_balance: number;
  person_draws: PersonDraw[];
  delivery_am: number;
  delivery_pm: number;
  section_c_items: SectionCItem[];
  actual_cash_count: number;
  extraction_confidence: "high" | "medium" | "low";
  extraction_notes?: string;
};

export type ActivitySummary = {
  sales: {
    count: number;
    total: number;
    cash_total: number;
    transfer_total: number;
    credit_total: number;
  };
  purchases: {
    count: number;
    total: number;
  };
  repairs: {
    count: number;
    by_status: Record<string, number>;
    total_quoted: number;
  };
  expenses: {
    count: number;
    total: number;
  };
  inventory_received: {
    item_count: number;
    unit_count: number;
  };
};

export type PersonDrawBreakdown = {
  name: string;
  salary: number;
  food: number;
  other: number;
  total: number;
};

export type ReconciliationResult = {
  starting_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  expected_balance: number;
  actual_cash_count: number;
  variance: number;
  breakdown: {
    person_draws: PersonDrawBreakdown[];
    total_draws: number;
    total_food: number;
    total_other_personal: number;
    delivery_cash_paid: { am: number; pm: number; total: number };
    refunds: number;
    section_c: { in: number; out: number; items: SectionCItem[] };
  };
};

export type StreakData = {
  streak: number;
  weekView: boolean[];
};

export type InventoryProduct = {
  id: string;
  sku: string;
  display_name: string;
  original_name: string;
  category: string;
  current_stock: number;
  last_known_cost_baht: number;
  last_known_sell_price_baht: number;
  repair_price_total: number;
  notes: string;
  has_been_counted: boolean;
  photo_url: string | null;
  counted_date: string | null;
  counted_by: string | null;
  show_repair_on_label: boolean;
};

export type CategoryProgress = {
  category: string;
  counted: number;
  total: number;
};

export type RecentlyCountedItem = {
  id: string;
  display_name: string;
  current_stock: number;
  counted_date: string | null;
};

export type InventoryProgress = {
  counted: number;
  total: number;
  categories: CategoryProgress[];
  recentlyCounted: RecentlyCountedItem[];
};

export type ReconcilePayload = {
  date: string;
  extraction: ExtractionResult;
  activity: ActivitySummary;
  reconciliation: ReconciliationResult;
  note: string;
  imageBase64?: string;
};
