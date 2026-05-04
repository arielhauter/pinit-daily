"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

type Props = {
  categories: string[];
  onCreated: (record: { id: string; display_name: string }) => void;
  onClose: () => void;
};

export function CreateProductForm({
  categories,
  onCreated,
  onClose,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [repairPrice, setRepairPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = displayName.trim() && category;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/inventory/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          category,
          current_stock: stock,
          last_known_cost_baht: cost || undefined,
          last_known_sell_price_baht: sellPrice || undefined,
          repair_price_total: repairPrice || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Create failed");
      }

      const result = await res.json();
      showToast("✅ สร้างสินค้าใหม่แล้ว (Product created!)", "success");
      onCreated({
        id: result.id,
        display_name: displayName.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Create failed"
      );
      showToast("❌ เกิดข้อผิดพลาด (Error — please try again)", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-blue-700 space-y-4 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold">
            ➕ สร้างสินค้าใหม่
          </h3>
          <p className="text-xs text-slate-400">
            Create New Product
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-sm text-slate-300">
          ชื่อสินค้า (Product Name){" "}
          <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="เช่น หัวเทียน BP8ES NGK"
          className="w-full h-10 bg-surface-dark text-white rounded-lg border border-slate-600 px-3 text-sm mt-1"
        />
      </div>

      <div>
        <label className="text-sm text-slate-300">
          หมวดหมู่ (Category){" "}
          <span className="text-red-400">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 bg-surface-dark text-white rounded-lg border border-slate-600 px-2 text-sm mt-1"
        >
          <option value="">เลือกหมวดหมู่...</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-slate-300">
          จำนวนสต็อก (Stock Count){" "}
          <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => setStock(Math.max(0, stock - 1))}
            className="w-12 h-12 bg-surface-light rounded-lg text-white text-xl flex items-center justify-center hover:bg-slate-500 active:bg-slate-400"
          >
            -
          </button>
          <input
            type="number"
            value={stock}
            onChange={(e) =>
              setStock(parseInt(e.target.value) || 0)
            }
            className="w-24 h-12 bg-surface-dark text-white text-center rounded-lg border border-slate-600 text-xl"
          />
          <button
            onClick={() => setStock(stock + 1)}
            className="w-12 h-12 bg-surface-light rounded-lg text-white text-xl flex items-center justify-center hover:bg-slate-500 active:bg-slate-400"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">
            ราคาทุน (Cost)
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              value={cost || ""}
              onChange={(e) =>
                setCost(parseFloat(e.target.value) || 0)
              }
              placeholder="0"
              className="w-full h-9 bg-surface-dark text-white rounded-lg border border-slate-600 px-2 text-sm"
            />
            <span className="text-slate-500 text-xs">฿</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">
            ราคาขาย (Sell)
          </label>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              value={sellPrice || ""}
              onChange={(e) =>
                setSellPrice(parseFloat(e.target.value) || 0)
              }
              placeholder="0"
              className="w-full h-9 bg-surface-dark text-white rounded-lg border border-slate-600 px-2 text-sm"
            />
            <span className="text-slate-500 text-xs">฿</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400">
          ราคาซ่อมรวมค่าแรง (Repair Price)
        </label>
        <div className="flex items-center gap-1 mt-1">
          <input
            type="number"
            value={repairPrice || ""}
            onChange={(e) =>
              setRepairPrice(parseFloat(e.target.value) || 0)
            }
            placeholder="0"
            className="w-full h-9 bg-surface-dark text-white rounded-lg border border-slate-600 px-2 text-sm"
          />
          <span className="text-slate-500 text-xs">฿</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400">
          หมายเหตุ (Notes)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="หมายเหตุเพิ่มเติม..."
          className="w-full bg-surface-dark text-white rounded-lg border border-slate-600 px-2 py-2 text-sm resize-none h-16 mt-1"
        />
      </div>

      <div className="text-xs text-emerald-400">
        ☑ นับแล้ว (auto-checked for new products)
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={handleCreate}
        disabled={!canSave || saving}
        className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 transition-colors"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>{" "}
            กำลังสร้าง...
          </span>
        ) : (
          "💾 สร้างและบันทึก (Create & Save)"
        )}
      </button>

      <div className="text-xs text-slate-500 text-center">
        SKU จะถูกสร้างอัตโนมัติ (SKU will be auto-generated)
      </div>
    </div>
  );
}
