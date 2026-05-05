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
        <div key={p.id} className="bg-slate-800 border-l-4 border-sky-400 rounded-r-lg p-3">
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

  if (data.count === 0) {
    return <p className="text-slate-400 text-sm">ไม่มีงานซ่อมที่กำลังดำเนินการ</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">งานซ่อม {data.count} รายการ</p>
      {data.jobs.slice(0, 5).map((job) => (
        <div key={job.id} className="bg-slate-800 border-l-4 border-orange-400 rounded-r-lg p-3">
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
        <div key={c.id} className="bg-slate-800 border-l-4 border-purple-400 rounded-r-lg p-3">
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

export function ToolResultCard({ toolName, state, result }: ToolResultCardProps) {
  if (state !== "result") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <span className="animate-pulse">⏳</span>
        <span>กำลังค้นหา...</span>
      </div>
    );
  }

  const data = result as Record<string, unknown>;

  switch (toolName) {
    case "lookup_product":
      return <ProductCards data={data as Parameters<typeof ProductCards>[0]["data"]} />;
    case "get_today_sales":
      return <SalesSummaryCard data={data as Parameters<typeof SalesSummaryCard>[0]["data"]} />;
    case "get_repair_jobs":
      return <RepairJobsCard data={data as Parameters<typeof RepairJobsCard>[0]["data"]} />;
    case "search_customer":
      return <CustomerCards data={data as Parameters<typeof CustomerCards>[0]["data"]} />;
    default:
      return (
        <pre className="text-xs text-slate-400 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
  }
}
