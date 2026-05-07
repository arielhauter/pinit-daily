"use client";

interface ToolResultCardProps {
  toolName: string;
  state: string;
  result?: unknown;
}

function formatBaht(n: number): string {
  return `฿${n.toLocaleString()}`;
}

function ProductCards({ data }: { data: { found: number; products: Array<{
  id: string; sku: string; name: string; stock: number;
  cost: number; sellPrice: number; repairPrice: number | null;
  category: string; photoUrl: string | null;
}> } }) {
  if (data.found === 0) {
    return <p className="text-slate-400 text-sm">ไม่พบสินค้า</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">พบ {data.found} รายการ</p>
      {data.products.map((p) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          data-card-action={`ขายสินค้า ${p.name} (${p.sku}) ราคา ฿${p.sellPrice}`}
          className={`bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3 ${p.stock > 0 ? "cursor-pointer active:bg-slate-700" : ""}`}
        >
          <div className="font-medium text-slate-100">📦 {p.name}</div>
          <div className="text-xs text-slate-400 mt-1">SKU: {p.sku}</div>
          <div className="text-sm text-slate-300 mt-1">
            สต็อก: {p.stock} ชิ้น
          </div>
          <div className="text-sm text-slate-300">
            ราคาขาย: {formatBaht(p.sellPrice)}
            {p.cost > 0 && <span className="ml-2 text-slate-400">ต้นทุน: {formatBaht(p.cost)}</span>}
          </div>
          {p.repairPrice != null && p.repairPrice > 0 && (
            <div className="text-sm text-orange-300">
              ราคาซ่อม: {formatBaht(p.repairPrice)}
            </div>
          )}
          {p.stock > 0 && (
            <div className="text-xs text-sky-400 mt-2">แตะเพื่อขาย</div>
          )}
          <button
            data-card-action={`พิมพ์ฉลาก ${p.sku} ขนาด 40x30`}
            className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full cursor-pointer mt-1 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            🏷 พิมพ์ฉลาก
          </button>
        </div>
      ))}
    </div>
  );
}

function SalesSummaryCard({ data }: { data: {
  date: string; count: number; totalRevenue: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  byType: Record<string, { count: number; total: number }>;
} }) {
  return (
    <div className="bg-slate-800 border-l-4 border-green-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📊 สรุปยอดขายวันนี้</div>
      <div className="text-sm text-slate-300 mt-2">
        จำนวน: {data.count} รายการ
      </div>
      <div className="text-sm text-slate-100 font-medium">
        รวม: {formatBaht(data.totalRevenue)}
      </div>
      {Object.keys(data.byPaymentMethod).length > 0 && (
        <div className="mt-2 space-y-1">
          {Object.entries(data.byPaymentMethod).map(([method, info]) => (
            <div key={method} className="text-xs text-slate-400">
              {method}: {info.count} รายการ ({formatBaht(info.total)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayExpensesCard({ data }: { data: {
  count: number; error?: string;
  expenses: Array<{ id: string; expenseId: unknown; category: unknown; amount: unknown; paymentMethod: unknown; description: unknown }>;
} }) {
  if (data.error) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ ดึงข้อมูลค่าใช้จ่ายไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{String(data.error)}</div>
      </div>
    );
  }
  if (data.count === 0) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-400 rounded-r-lg p-3">
        <div className="font-medium text-slate-300">💸 ไม่มีค่าใช้จ่ายวันนี้</div>
      </div>
    );
  }
  const total = data.expenses.reduce((sum, e) => sum + ((e.amount as number) || 0), 0);
  return (
    <div className="bg-slate-800 border-l-4 border-red-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">💸 ค่าใช้จ่ายวันนี้ — {data.count} รายการ ({formatBaht(total)})</div>
      <div className="mt-1 space-y-1">
        {data.expenses.map((e, i) => (
          <div key={e.id} className="text-sm text-slate-300">
            {i + 1}. {String(e.category || "")} — {formatBaht((e.amount as number) || 0)} {String(e.paymentMethod || "")}
            {e.description ? <span className="text-slate-500"> ({String(e.description)})</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RepairJobsCard({ data }: { data: { count: number; jobs: Array<{
  id: string; jobId: number; customer: string; vehicleDescription: string;
  licensePlate: string; status: string; jobType: string[];
  quotedPrice: number; quotedDate: string;
}> } }) {
  const statusColor: Record<string, string> = {
    "รับงาน (Quoting)": "bg-blue-500",
    "กำลังซ่อม (In Progress)": "bg-yellow-500",
    "เสร็จแล้ว (Complete)": "bg-green-500",
  };

  const nextStatus: Record<string, string> = {
    "รับงาน (Quoting)": "กำลังซ่อม",
    "กำลังซ่อม (In Progress)": "เสร็จแล้ว",
    "เสร็จแล้ว (Complete)": "จ่ายแล้ว",
  };

  if (data.count === 0) {
    return <p className="text-slate-400 text-sm">ไม่มีงานซ่อมที่กำลังดำเนินการ</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">งานซ่อม {data.count} รายการ</p>
      {data.jobs.slice(0, 5).map((job) => (
        <div
          key={job.id}
          role="button"
          tabIndex={0}
          data-card-action={`อัปเดตสถานะงานซ่อม #${job.jobId}`}
          className="bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3 cursor-pointer active:bg-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-100">🔧 #{job.jobId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusColor[job.status] || "bg-slate-600"}`}>
              {job.status}
            </span>
          </div>
          {job.customer && (
            <div className="text-sm text-slate-300 mt-1">{job.customer}</div>
          )}
          {job.licensePlate && (
            <div className="text-xs text-slate-400">{job.vehicleDescription} • {job.licensePlate}</div>
          )}
          <div className="text-sm text-slate-300 mt-1">
            ราคาเสนอ: {formatBaht(job.quotedPrice)}
          </div>
          {nextStatus[job.status] && (
            <div className="text-xs text-orange-400 mt-2">
              แตะเพื่อเปลี่ยนเป็น {nextStatus[job.status]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CustomerCards({ data }: { data: { found: number; customers: Array<{
  id: string; name: string; phone: string | null;
  creditBalance: number; salesCount: number; repairJobsCount: number;
}> } }) {
  if (data.found === 0) {
    return <p className="text-slate-400 text-sm">ไม่พบลูกค้า</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">พบ {data.found} ลูกค้า</p>
      {data.customers.map((c) => (
        <div
          key={c.id}
          className="bg-slate-800 border-l-4 border-purple-400 rounded-r-lg p-3"
        >
          <div className="font-medium text-slate-100">👤 {c.name}</div>
          {c.phone && (
            <div className="text-xs text-slate-400 mt-1">📱 {c.phone}</div>
          )}
          {c.creditBalance > 0 && (
            <div className="text-sm text-red-300 mt-1">
              ยอดเครดิต: {formatBaht(c.creditBalance)}
            </div>
          )}
          <div className="text-xs text-slate-400 mt-1">
            ซื้อ {c.salesCount} ครั้ง | ซ่อม {c.repairJobsCount} ครั้ง
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleConfirmationCard({ data }: { data: {
  success: boolean; error?: string; saleNumber?: number;
  items?: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  total?: number; discount?: number; paymentMethod?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ บันทึกไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-green-500 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ บันทึกการขายเรียบร้อย!</div>
      {data.items?.map((item, i) => (
        <div key={i} className="text-sm text-slate-300 mt-1">
          {item.name} × {item.quantity} = {formatBaht(item.lineTotal)}
        </div>
      ))}
      {(data.discount ?? 0) > 0 && (
        <div className="text-sm text-slate-400 mt-1">ส่วนลด: -{formatBaht(data.discount!)}</div>
      )}
      <div className="text-sm text-slate-300 mt-1">
        ชำระ: {data.paymentMethod}
      </div>
      <button
        data-card-action="ต้องการบันทึกการขาย"
        className="mt-2 text-xs bg-green-800 text-green-200 px-3 py-1 rounded-full cursor-pointer"
      >
        📗 ขายต่อ
      </button>
    </div>
  );
}

function ExpenseConfirmationCard({ data }: { data: {
  success: boolean; error?: string;
  category?: string; amount?: number; paymentMethod?: string; description?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ บันทึกไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-red-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ บันทึกค่าใช้จ่ายเรียบร้อย!</div>
      <div className="text-sm text-slate-300 mt-1">
        {data.category} {formatBaht(data.amount || 0)} ({data.paymentMethod})
      </div>
      {data.description && (
        <div className="text-xs text-slate-400 mt-1">{data.description}</div>
      )}
    </div>
  );
}

function PurchaseConfirmationCard({ data }: { data: {
  success: boolean; error?: string;
  supplier?: string; itemCount?: number; totalPaid?: number;
  items?: Array<{ name: string; quantity: number; unitCost: number }>;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ บันทึกไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-blue-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ บันทึกการซื้อเรียบร้อย!</div>
      <div className="text-sm text-slate-300 mt-1">
        ผู้จำหน่าย: {data.supplier}
      </div>
      {data.items?.map((item, i) => (
        <div key={i} className="text-xs text-slate-400">
          {item.name} × {item.quantity} @ {formatBaht(item.unitCost)}
        </div>
      ))}
      <div className="text-sm text-slate-300 mt-1">
        รวม: {formatBaht(data.totalPaid || 0)}
      </div>
    </div>
  );
}

function LabelCard({ data }: { data: {
  success: boolean; error?: string;
  sku?: string; size?: string; productName?: string; labelUrl?: string;
}}) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ พิมพ์ฉลากไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">🏷 {data.productName}</div>
      <div className="text-xs text-slate-400 mt-1">SKU: {data.sku} | ขนาด: {data.size}</div>
      <button
        data-label-url={data.labelUrl}
        className="mt-2 text-sm bg-sky-800 text-sky-200 px-3 py-1 rounded-full cursor-pointer active:bg-sky-700"
      >
        🖨 เปิดฉลาก
      </button>
    </div>
  );
}

function StockCountCard({ data }: { data: {
  success: boolean; error?: string;
  productName?: string; sku?: string;
  previousStock?: number; newStock?: number; difference?: number;
}}) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ อัปเดตสต็อกไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }

  const diff = data.difference || 0;
  const diffText = diff < 0 ? `ขาด ${Math.abs(diff)}` : diff > 0 ? `เกิน ${diff}` : 'ตรง ✓';
  const diffColor = diff < 0 ? 'text-orange-300' : 'text-green-300';

  return (
    <div className="bg-slate-800 border-l-4 border-purple-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ อัปเดตสต็อกเรียบร้อย!</div>
      <div className="text-sm text-slate-100 mt-1">{data.productName}</div>
      <div className="text-sm text-slate-300 mt-1">
        เดิม: {data.previousStock} → ใหม่: {data.newStock}
        <span className={`ml-2 ${diffColor}`}>({diffText})</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          data-card-action={`พิมพ์ฉลาก ${data.sku} ขนาด 40x30`}
          className="text-xs bg-sky-800 text-sky-200 px-3 py-1 rounded-full cursor-pointer"
        >
          🏷 พิมพ์ฉลาก
        </button>
        <button
          data-scan-trigger="true"
          className="text-xs bg-slate-700 text-slate-200 px-3 py-1 rounded-full cursor-pointer"
        >
          📷 สแกนต่อ
        </button>
      </div>
    </div>
  );
}

function RepairStatusConfirmationCard({ data }: { data: {
  success: boolean; error?: string; currentStatus?: string; validTransitions?: string[];
  jobNumber?: number; previousStatus?: string; newStatus?: string;
  paymentMethod?: string | null; totalCollected?: number | null;
  workorderUrl?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ อัปเดตไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
        {data.validTransitions && data.validTransitions.length > 0 && (
          <div className="text-xs text-slate-400 mt-1">
            สถานะถัดไปที่เป็นไปได้: {data.validTransitions.join(", ")}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ อัปเดตสถานะเรียบร้อย!</div>
      <div className="text-sm text-slate-300 mt-1">
        งาน #{data.jobNumber}: {data.previousStatus} → {data.newStatus}
      </div>
      {data.paymentMethod && (
        <div className="text-xs text-slate-400 mt-1">
          ชำระ: {data.paymentMethod} | เก็บ: {formatBaht(data.totalCollected || 0)}
        </div>
      )}
      {data.workorderUrl && (
        <button
          data-label-url={data.workorderUrl}
          className="mt-2 text-sm bg-orange-800 text-orange-200 px-3 py-1 rounded-full cursor-pointer"
        >
          🖨 พิมพ์ใบสั่งงาน
        </button>
      )}
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  today: "วันนี้",
  yesterday: "เมื่อวาน",
  week: "สัปดาห์นี้",
  last_week: "สัปดาห์ที่แล้ว",
  month: "เดือนนี้",
  last_month: "เดือนที่แล้ว",
  all_time: "ทั้งหมด",
  custom: "กำหนดเอง",
};

function pLabel(period: string, startDate?: string, endDate?: string): string {
  if (period === "custom" && startDate && endDate) return `${startDate} — ${endDate}`;
  return PERIOD_LABELS[period] || period;
}

function SalesSummaryPeriodCard({ data }: { data: {
  period: string; startDate: string; endDate: string;
  count: number; totalCollected: number; averageSale: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
} }) {
  return (
    <div className="bg-slate-800 border-l-4 border-green-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📊 สรุปยอดขาย — {pLabel(data.period, data.startDate, data.endDate)}</div>
      <div className="text-sm text-slate-300 mt-2">จำนวน: {data.count} รายการ</div>
      <div className="text-sm text-slate-100 font-medium">รวม: {formatBaht(data.totalCollected)}</div>
      <div className="text-xs text-slate-400">เฉลี่ย: {formatBaht(data.averageSale)}/รายการ</div>
      {Object.keys(data.byPaymentMethod).length > 0 && (
        <div className="mt-2 space-y-1">
          {Object.entries(data.byPaymentMethod).map(([method, info]) => {
            const pct = data.totalCollected > 0 ? Math.round((info.total / data.totalCollected) * 100) : 0;
            return (
              <div key={method} className="text-xs text-slate-400">
                {method}: {formatBaht(info.total)} ({pct}%)
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PurchaseSummaryPeriodCard({ data }: { data: {
  period: string; startDate: string; endDate: string;
  count: number; totalSpent: number; totalShipping: number;
  bySupplier: Record<string, { count: number; total: number }>;
} }) {
  return (
    <div className="bg-slate-800 border-l-4 border-blue-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📘 สรุปยอดซื้อ — {pLabel(data.period, data.startDate, data.endDate)}</div>
      <div className="text-sm text-slate-300 mt-2">จำนวน: {data.count} รายการ</div>
      <div className="text-sm text-slate-100 font-medium">รวม: {formatBaht(data.totalSpent)}</div>
      {data.totalShipping > 0 && (
        <div className="text-xs text-slate-400">ค่าจัดส่ง: {formatBaht(data.totalShipping)}</div>
      )}
      {Object.keys(data.bySupplier).length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs text-slate-500">แยกตามผู้จำหน่าย:</div>
          {Object.entries(data.bySupplier)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([supplier, info]) => (
              <div key={supplier} className="text-xs text-slate-400">
                {supplier}: {info.count} ครั้ง ({formatBaht(info.total)})
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function MarginAnalysisCard({ data }: { data: {
  period: string; startDate: string; endDate: string;
  totalRevenue: number; totalCOGS: number; grossProfit: number; marginPercent: number;
  itemCount: number; isPartial?: boolean;
  topMarginProducts: Array<{ name: string; profit: number; margin: number; quantity: number }>;
  worstMarginProducts: Array<{ name: string; profit: number; margin: number; quantity: number }>;
} }) {
  const profitColor = data.grossProfit >= 0 ? "text-green-300" : "text-red-300";
  return (
    <div className="bg-slate-800 border-l-4 border-amber-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📈 วิเคราะห์กำไร — {pLabel(data.period, data.startDate, data.endDate)}</div>
      <div className="text-sm text-slate-300 mt-2">รายได้: {formatBaht(data.totalRevenue)}</div>
      <div className="text-sm text-slate-300">ต้นทุน: {formatBaht(data.totalCOGS)}</div>
      <div className={`text-sm font-medium ${profitColor}`}>
        กำไรขั้นต้น: {formatBaht(data.grossProfit)} ({data.marginPercent}%)
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {data.itemCount} รายการ{data.isPartial ? " (ข้อมูลบางส่วน)" : ""}
      </div>
      {data.topMarginProducts.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-slate-500">กำไรสูงสุด:</div>
          {data.topMarginProducts.slice(0, 3).map((p, i) => (
            <div key={i} className="text-xs text-slate-400">
              {i + 1}. {p.name} — {formatBaht(p.profit)} ({p.margin}%)
            </div>
          ))}
        </div>
      )}
      {data.worstMarginProducts.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-slate-500">กำไรต่ำสุด:</div>
          {data.worstMarginProducts.slice(0, 3).map((p, i) => (
            <div key={i} className="text-xs text-orange-400">
              {i + 1}. {p.name} — {formatBaht(p.profit)} ({p.margin}%)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlowMoversCard({ data }: { data: {
  count: number; totalCapitalTiedUp: number;
  products: Array<{ name: string; stock: number; unitsSold: number; capitalTiedUp: number }>;
} }) {
  return (
    <div className="bg-slate-800 border-l-4 border-red-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📦 สินค้าค้างสต็อก</div>
      <div className="text-sm text-slate-300 mt-2">{data.count} รายการ</div>
      <div className="text-sm text-red-300">ทุนจม: {formatBaht(data.totalCapitalTiedUp)}</div>
      {data.products.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.products.slice(0, 10).map((p, i) => (
            <div key={i} className="text-xs text-slate-400">
              {p.name} — สต็อก: {p.stock} | ขายแล้ว: {p.unitsSold} | ทุน: {formatBaht(p.capitalTiedUp)}
            </div>
          ))}
          {data.products.length > 10 && (
            <div className="text-xs text-slate-500">...และอีก {data.products.length - 10} รายการ</div>
          )}
        </div>
      )}
    </div>
  );
}

function TopSellersCard({ data }: { data: {
  period: string; startDate?: string; endDate?: string;
  metric: string;
  products: Array<{ rank: number; name: string; totalQuantity: number; totalRevenue: number }>;
} }) {
  return (
    <div className="bg-slate-800 border-l-4 border-yellow-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">🏆 สินค้าขายดี — {pLabel(data.period, data.startDate, data.endDate)}</div>
      {data.products.length === 0 ? (
        <div className="text-sm text-slate-400 mt-2">ไม่มีข้อมูลในช่วงนี้</div>
      ) : (
        <div className="mt-2 space-y-1">
          {data.products.map((p) => (
            <div key={p.rank} className="text-xs text-slate-300">
              <span className="text-yellow-400">{p.rank}.</span> {p.name} — {p.totalQuantity} ชิ้น {formatBaht(p.totalRevenue)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CashFlowCard({ data }: { data: {
  period: string; startDate: string; endDate: string;
  revenue: { total: number; cash: number; transfer: number; credit: number; salesCount: number };
  expenses: { total: number; byCategory: Record<string, number>; count: number };
  purchases: { total: number; count: number };
  draws: { total: number; count: number };
  cashFlow: { totalIn: number; totalOut: number; net: number };
} }) {
  const netColor = data.cashFlow.net >= 0 ? "text-green-300" : "text-red-300";
  return (
    <div className="bg-slate-800 border-l-4 border-emerald-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">💰 กระแสเงินสด — {pLabel(data.period, data.startDate, data.endDate)}</div>
      <div className="mt-2">
        <div className="text-xs text-slate-500">เงินเข้า:</div>
        <div className="text-sm text-green-300">ขาย: {formatBaht(data.revenue.total)} ({data.revenue.salesCount} รายการ)</div>
        {data.revenue.cash > 0 && <div className="text-xs text-slate-400 ml-2">เงินสด: {formatBaht(data.revenue.cash)}</div>}
        {data.revenue.transfer > 0 && <div className="text-xs text-slate-400 ml-2">โอน: {formatBaht(data.revenue.transfer)}</div>}
        {data.revenue.credit > 0 && <div className="text-xs text-slate-400 ml-2">เครดิต: {formatBaht(data.revenue.credit)}</div>}
      </div>
      <div className="mt-2">
        <div className="text-xs text-slate-500">เงินออก:</div>
        <div className="text-sm text-red-300">ซื้อสินค้า: {formatBaht(data.purchases.total)} ({data.purchases.count} ครั้ง)</div>
        <div className="text-sm text-red-300">ค่าใช้จ่าย: {formatBaht(data.expenses.total)} ({data.expenses.count} รายการ)</div>
        {data.draws.total > 0 && (
          <div className="text-sm text-red-300">เบิก: {formatBaht(data.draws.total)} ({data.draws.count} ครั้ง)</div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700">
        <div className={`text-sm font-medium ${netColor}`}>
          กระแสเงินสดสุทธิ: {formatBaht(data.cashFlow.net)}
        </div>
      </div>
    </div>
  );
}

function WorkOrderUpdateCard({ data }: { data: {
  success: boolean; error?: string;
  jobId?: number; actualHours?: number; partsAdded?: number;
  unmatchedParts?: string[]; status?: string; notes?: string | null;
  bootAdvice?: string | null;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ อัปเดตใบสั่งงานไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ อัปเดตงานซ่อม #{data.jobId} เรียบร้อย!</div>
      <div className="text-sm text-slate-300 mt-1">
        ⏱ ชั่วโมงจริง: {data.actualHours} ชม.
      </div>
      <div className="text-sm text-slate-300">
        📊 สถานะ: {data.status}
      </div>
      {data.partsAdded && data.partsAdded > 0 && (
        <div className="text-sm text-slate-300">
          🔩 อะไหล่เพิ่ม: {data.partsAdded} รายการ
        </div>
      )}
      {data.unmatchedParts && data.unmatchedParts.length > 0 && (
        <div className="text-sm text-yellow-300 mt-1">
          ⚠️ ไม่พบในระบบ: {data.unmatchedParts.join(", ")}
        </div>
      )}
      {data.bootAdvice && (
        <div className="text-sm text-sky-300 mt-1">
          💬 แจ้งลูกค้า: {data.bootAdvice}
        </div>
      )}
    </div>
  );
}

function RepairJobCreationCard({ data }: { data: {
  success: boolean; error?: string;
  jobId?: number | null; jobRecordId?: string;
  customer?: string; vehicle?: string; licensePlate?: string | null;
  jobType?: string[]; effortTier?: string; estimatedHours?: number;
  tierRate?: number; suggestedLabor?: number;
  partsSellTotal?: number; partsCostTotal?: number; suggestedTotal?: number;
  needsQuoteConfirmation?: boolean; unmatchedParts?: string[];
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ สร้างงานซ่อมไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3">
      <div className="font-medium text-slate-100">📋 งานซ่อมใหม่ #{data.jobId}</div>
      <div className="text-sm text-slate-300 mt-1">👤 {data.customer}</div>
      <div className="text-sm text-slate-300">🏍 {data.vehicle}{data.licensePlate ? ` (${data.licensePlate})` : ""}</div>
      <div className="text-sm text-slate-300">🔧 {data.jobType?.join(", ")}</div>
      <div className="text-sm text-slate-300">⏱ {data.effortTier} — {data.estimatedHours} ชม.</div>
      <div className="mt-2 pt-2 border-t border-slate-700">
        <div className="text-xs text-slate-400">💰 ราคาแนะนำ:</div>
        <div className="text-sm text-slate-300">อะไหล่: {formatBaht(data.partsSellTotal || 0)}{(data.partsCostTotal || 0) > 0 && <span className="text-slate-500"> (ต้นทุน: {formatBaht(data.partsCostTotal || 0)})</span>}</div>
        <div className="text-sm text-slate-300">ค่าแรง: {formatBaht(data.suggestedLabor || 0)}</div>
        <div className="text-sm text-slate-100 font-medium">รวม: {formatBaht(data.suggestedTotal || 0)}</div>
      </div>
      {data.unmatchedParts && data.unmatchedParts.length > 0 && (
        <div className="text-sm text-yellow-300 mt-1">⚠️ ไม่พบในระบบ: {data.unmatchedParts.join(", ")}</div>
      )}
      {data.needsQuoteConfirmation && (
        <div className="text-xs text-orange-400 mt-2">⏳ รอยืนยันราคา</div>
      )}
    </div>
  );
}

function RepairQuoteFinalizedCard({ data }: { data: {
  success: boolean; error?: string;
  jobId?: number | null; jobRecordId?: string;
  laborCharge?: number; quotedPrice?: number;
  workorderUrl?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ ยืนยันราคาไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-green-500 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ ยืนยันราคางานซ่อม #{data.jobId}!</div>
      <div className="text-sm text-slate-300 mt-1">ค่าแรง: {formatBaht(data.laborCharge || 0)}</div>
      <div className="text-sm text-slate-100 font-medium">ราคาเสนอ: {formatBaht(data.quotedPrice || 0)}</div>
      {data.workorderUrl && (
        <button
          data-label-url={data.workorderUrl}
          className="mt-2 text-sm bg-orange-800 text-orange-200 px-3 py-1 rounded-full cursor-pointer"
        >
          🖨 พิมพ์ใบสั่งงาน
        </button>
      )}
    </div>
  );
}

function ProductUpdateCard({ data }: { data: {
  success: boolean; error?: string;
  productName?: string; sku?: string;
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ แก้ไขสินค้าไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }

  const fieldLabels: Record<string, string> = {
    last_known_sell_price_baht: "ราคาขาย",
    last_known_cost_baht: "ต้นทุน",
    repair_price_total: "ราคาซ่อม",
    display_name: "ชื่อสินค้า",
    show_repair_on_label: "แสดงราคาซ่อมบนฉลาก",
  };

  return (
    <div className="bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ แก้ไข {data.productName} เรียบร้อย!</div>
      <div className="text-xs text-slate-500">{data.sku}</div>
      {data.changes?.map((c, i) => (
        <div key={i} className="text-sm text-slate-300 mt-1">
          {fieldLabels[c.field] || c.field}:{" "}
          <span className="text-slate-500">{typeof c.oldValue === "boolean" ? (c.oldValue ? "เปิด" : "ปิด") : String(c.oldValue ?? "-")}</span>
          {" → "}
          <span className="text-white">{typeof c.newValue === "boolean" ? (c.newValue ? "เปิด" : "ปิด") : String(c.newValue)}</span>
        </div>
      ))}
      <button
        className="mt-2 text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        data-card-action={`พิมพ์ฉลาก ${data.sku} ขนาด 40x30`}
      >
        🏷 พิมพ์ฉลากใหม่
      </button>
    </div>
  );
}

function DeleteConfirmationCard({ data }: { data: {
  success: boolean; error?: string;
  table?: string; recordId?: string; reason?: string; warning?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ ลบไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-red-400 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ ลบรายการเรียบร้อย!</div>
      {data.warning && (
        <div className="text-sm text-yellow-300 mt-1">⚠️ {data.warning}</div>
      )}
    </div>
  );
}

function PendingReceivingCard({ data }: { data: {
  pendingCount?: number; error?: string;
  items?: { id: string; productName: string; quantity: number; totalUnitsReceived: number; unitCost: number; currentStock: number; purchaseId: string | null }[];
} }) {
  if (data.error) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ ดึงรายการรอรับไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  if (!data.items || data.items.length === 0) {
    return (
      <div className="bg-slate-800 border-l-4 border-teal-500 rounded-r-lg p-3">
        <div className="font-medium text-slate-300">📦 ไม่มีรายการรอรับค่ะ</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-teal-500 rounded-r-lg p-3">
      <div className="font-medium text-teal-300">📦 รายการรอรับ — {data.pendingCount} รายการ</div>
      <div className="mt-1 space-y-1">
        {data.items.slice(0, 15).map((item, i) => (
          <div key={item.id} className="text-sm text-slate-300">
            {i + 1}. {item.productName} × {item.quantity}
            {item.unitCost > 0 && <span className="text-slate-500"> ({formatBaht(item.unitCost)}/ชิ้น)</span>}
            <span className="text-slate-500"> | สต็อก: {item.currentStock}</span>
          </div>
        ))}
        {data.items.length > 15 && (
          <div className="text-xs text-slate-500">...และอีก {data.items.length - 15} รายการ</div>
        )}
      </div>
      <button
        data-card-action="รับสินค้าทั้งหมด"
        className="mt-2 text-sm bg-teal-800 text-teal-200 px-3 py-1 rounded-full cursor-pointer"
      >
        ✅ รับทั้งหมด ({data.pendingCount} รายการ)
      </button>
    </div>
  );
}

function ReceivingConfirmCard({ data }: { data: {
  success: boolean; error?: string;
  receivedCount?: number; adjustedCount?: number; note?: string;
} }) {
  if (!data.success) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ ยืนยันรับสินค้าไม่สำเร็จ</div>
        <div className="text-sm text-slate-400 mt-1">{data.error}</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800 border-l-4 border-teal-500 rounded-r-lg p-3">
      <div className="font-medium text-green-300">✅ รับสินค้า {data.receivedCount} รายการเรียบร้อย!</div>
      <div className="text-sm text-slate-300 mt-1">{data.note}</div>
      {data.adjustedCount && data.adjustedCount > 0 && (
        <div className="text-sm text-yellow-300">📝 ปรับจำนวน {data.adjustedCount} รายการ</div>
      )}
    </div>
  );
}

export function ToolResultCard({ toolName, state, result }: ToolResultCardProps) {
  if (state !== "result") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <span className="animate-pulse">⏳</span>
        <span>กำลังดำเนินการ...</span>
      </div>
    );
  }

  const data = result as Record<string, unknown>;

  if (data && typeof data === 'object' && 'error' in data && ('success' in data ? data.success === false : true)) {
    return (
      <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
        <div className="font-medium text-red-300">❌ เกิดข้อผิดพลาด</div>
        <div className="text-sm text-slate-400 mt-1">{String(data.error)}</div>
      </div>
    );
  }

  switch (toolName) {
    case "lookup_product":
      return <ProductCards data={data as Parameters<typeof ProductCards>[0]["data"]} />;
    case "get_today_sales":
      return <SalesSummaryCard data={data as Parameters<typeof SalesSummaryCard>[0]["data"]} />;
    case "get_today_expenses":
      return <TodayExpensesCard data={data as Parameters<typeof TodayExpensesCard>[0]["data"]} />;
    case "get_repair_jobs":
      return <RepairJobsCard data={data as Parameters<typeof RepairJobsCard>[0]["data"]} />;
    case "search_customer":
      return <CustomerCards data={data as Parameters<typeof CustomerCards>[0]["data"]} />;
    case "create_sale":
      return <SaleConfirmationCard data={data as Parameters<typeof SaleConfirmationCard>[0]["data"]} />;
    case "create_expense":
      return <ExpenseConfirmationCard data={data as Parameters<typeof ExpenseConfirmationCard>[0]["data"]} />;
    case "create_purchase":
      return <PurchaseConfirmationCard data={data as Parameters<typeof PurchaseConfirmationCard>[0]["data"]} />;
    case "update_repair_status":
      return <RepairStatusConfirmationCard data={data as Parameters<typeof RepairStatusConfirmationCard>[0]["data"]} />;
    case "print_label":
      return <LabelCard data={data as Parameters<typeof LabelCard>[0]["data"]} />;
    case "update_stock_count":
      return <StockCountCard data={data as Parameters<typeof StockCountCard>[0]["data"]} />;
    case "get_sales_summary":
      return <SalesSummaryPeriodCard data={data as Parameters<typeof SalesSummaryPeriodCard>[0]["data"]} />;
    case "get_purchase_summary":
      return <PurchaseSummaryPeriodCard data={data as Parameters<typeof PurchaseSummaryPeriodCard>[0]["data"]} />;
    case "get_margin_analysis":
      return <MarginAnalysisCard data={data as Parameters<typeof MarginAnalysisCard>[0]["data"]} />;
    case "get_slow_movers":
      return <SlowMoversCard data={data as Parameters<typeof SlowMoversCard>[0]["data"]} />;
    case "get_top_sellers":
      return <TopSellersCard data={data as Parameters<typeof TopSellersCard>[0]["data"]} />;
    case "get_cash_flow_summary":
      return <CashFlowCard data={data as Parameters<typeof CashFlowCard>[0]["data"]} />;
    case "update_repair_from_workorder":
      return <WorkOrderUpdateCard data={data as Parameters<typeof WorkOrderUpdateCard>[0]["data"]} />;
    case "create_repair_job":
      return <RepairJobCreationCard data={data as Parameters<typeof RepairJobCreationCard>[0]["data"]} />;
    case "finalize_repair_quote":
      return <RepairQuoteFinalizedCard data={data as Parameters<typeof RepairQuoteFinalizedCard>[0]["data"]} />;
    case "update_product":
      return <ProductUpdateCard data={data as Parameters<typeof ProductUpdateCard>[0]["data"]} />;
    case "delete_record":
      return <DeleteConfirmationCard data={data as Parameters<typeof DeleteConfirmationCard>[0]["data"]} />;
    case "get_pending_receiving":
      return <PendingReceivingCard data={data as Parameters<typeof PendingReceivingCard>[0]["data"]} />;
    case "confirm_receiving":
      return <ReceivingConfirmCard data={data as Parameters<typeof ReceivingConfirmCard>[0]["data"]} />;
    default:
      return (
        <pre className="text-xs text-slate-400 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
  }
}
