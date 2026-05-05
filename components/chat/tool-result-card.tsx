"use client";

interface ToolResultCardProps {
  toolName: string;
  state: string;
  result?: unknown;
  onAction?: (message: string) => void;
}

function formatBaht(n: number): string {
  return `฿${n.toLocaleString()}`;
}

function ProductCards({ data, onAction }: { data: { found: number; products: Array<{
  id: string; sku: string; name: string; stock: number;
  cost: number; sellPrice: number; repairPrice: number | null;
  category: string; photoUrl: string | null;
}> }; onAction?: (message: string) => void }) {
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
          onPointerDown={(e) => {
            e.stopPropagation();
            console.log("onAction is:", typeof onAction);
            if (onAction) {
              const msg = `ขายสินค้า ${p.name} (${p.sku}) ราคา ฿${p.sellPrice}`;
              console.log("Sending:", msg);
              onAction(msg);
            } else {
              alert("ERROR: onAction is undefined");
            }
          }}
          className={`bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3 relative z-10 ${p.stock > 0 && onAction ? "cursor-pointer active:bg-slate-700" : ""}`}
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
          {p.stock > 0 && onAction && (
            <div className="text-xs text-sky-400 mt-2">แตะเพื่อขาย</div>
          )}
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

function RepairJobsCard({ data, onAction }: { data: { count: number; jobs: Array<{
  id: string; jobId: number; customer: string; vehicleDescription: string;
  licensePlate: string; status: string; jobType: string[];
  quotedPrice: number; quotedDate: string;
}> }; onAction?: (message: string) => void }) {

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
          onPointerDown={(e) => {
            e.stopPropagation();
            if (onAction) {
              onAction(`อัปเดตสถานะงานซ่อม #${job.jobId}`);
            }
          }}
          className={`bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3 relative z-10 ${onAction ? "cursor-pointer active:bg-slate-700" : ""}`}
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
          {onAction && nextStatus[job.status] && (
            <div className="text-xs text-orange-400 mt-2">
              แตะเพื่อเปลี่ยนเป็น {nextStatus[job.status]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CustomerCards({ data, onAction }: { data: { found: number; customers: Array<{
  id: string; name: string; phone: string | null;
  creditBalance: number; salesCount: number; repairJobsCount: number;
}> }; onAction?: (message: string) => void }) {

  if (data.found === 0) {
    return <p className="text-slate-400 text-sm">ไม่พบลูกค้า</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">พบ {data.found} ลูกค้า</p>
      {data.customers.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (onAction) {
              onAction(`ดูประวัติลูกค้า ${c.name}`);
            }
          }}
          className={`bg-slate-800 border-l-4 border-purple-400 rounded-r-lg p-3 relative z-10 ${onAction ? "cursor-pointer active:bg-slate-700" : ""}`}
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

function SaleConfirmationCard({ data, onAction }: { data: {
  success: boolean; error?: string; saleNumber?: number;
  items?: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  total?: number; discount?: number; paymentMethod?: string;
}; onAction?: (message: string) => void }) {

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
      {onAction && (
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            onAction("ต้องการบันทึกการขาย");
          }}
          className="mt-2 text-xs bg-green-800 text-green-200 px-3 py-1 rounded-full relative z-10 cursor-pointer"
        >
          📗 ขายต่อ
        </button>
      )}
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

function RepairStatusConfirmationCard({ data }: { data: {
  success: boolean; error?: string; currentStatus?: string; validTransitions?: string[];
  jobNumber?: number; previousStatus?: string; newStatus?: string;
  paymentMethod?: string | null; totalCollected?: number | null;
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
    </div>
  );
}

export function ToolResultCard({ toolName, state, result, onAction }: ToolResultCardProps) {
  if (state !== "result") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <span className="animate-pulse">⏳</span>
        <span>กำลังดำเนินการ...</span>
      </div>
    );
  }

  const data = result as Record<string, unknown>;

  switch (toolName) {
    case "lookup_product":
      return <ProductCards data={data as Parameters<typeof ProductCards>[0]["data"]} onAction={onAction} />;
    case "get_today_sales":
      return <SalesSummaryCard data={data as Parameters<typeof SalesSummaryCard>[0]["data"]} />;
    case "get_repair_jobs":
      return <RepairJobsCard data={data as Parameters<typeof RepairJobsCard>[0]["data"]} onAction={onAction} />;
    case "search_customer":
      return <CustomerCards data={data as Parameters<typeof CustomerCards>[0]["data"]} onAction={onAction} />;
    case "create_sale":
      return <SaleConfirmationCard data={data as Parameters<typeof SaleConfirmationCard>[0]["data"]} onAction={onAction} />;
    case "create_expense":
      return <ExpenseConfirmationCard data={data as Parameters<typeof ExpenseConfirmationCard>[0]["data"]} />;
    case "create_purchase":
      return <PurchaseConfirmationCard data={data as Parameters<typeof PurchaseConfirmationCard>[0]["data"]} />;
    case "update_repair_status":
      return <RepairStatusConfirmationCard data={data as Parameters<typeof RepairStatusConfirmationCard>[0]["data"]} />;
    default:
      return (
        <pre className="text-xs text-slate-400 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
  }
}
