"use client";

import { useState, useRef } from "react";
import { useToast } from "@/components/toast";
import { compressImage } from "@/lib/compress-image";
import type { InventoryProduct } from "@/lib/types";

type Props = {
  product: InventoryProduct;
  onSave: (updated: InventoryProduct) => void;
  onClose: () => void;
};

export function ProductEditCard({ product, onSave, onClose }: Props) {
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(product.display_name);
  const [stock, setStock] = useState(product.current_stock);
  const [cost, setCost] = useState(product.last_known_cost_baht);
  const [sellPrice, setSellPrice] = useState(
    product.last_known_sell_price_baht
  );
  const [repairPrice, setRepairPrice] = useState(
    product.repair_price_total
  );
  const [notes, setNotes] = useState(product.notes);
  const [counted, setCounted] = useState(product.has_been_counted);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    product.photo_url
  );
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "success" | "error"
  >("idle");

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    const compressed = await compressImage(file);
    setPhotoBase64(compressed);
  }

  async function handleSave() {
    setSaving(true);
    setSaveState("idle");

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: product.id,
          fields: {
            display_name: displayName,
            current_stock: stock,
            last_known_cost_baht: cost,
            last_known_sell_price_baht: sellPrice,
            repair_price_total: repairPrice,
            notes,
            has_been_counted: counted,
            counted_date: counted ? today : product.counted_date,
            counted_by: counted ? "app" : product.counted_by,
            ...(photoBase64 ? { product_photo: photoBase64 } : {}),
          },
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveState("success");
      showToast("✅ บันทึกแล้ว (Saved!)", "success");
      onSave({
        ...product,
        display_name: displayName,
        current_stock: stock,
        last_known_cost_baht: cost,
        last_known_sell_price_baht: sellPrice,
        repair_price_total: repairPrice,
        notes,
        has_been_counted: counted,
        counted_date: counted ? today : product.counted_date,
      });

      setTimeout(onClose, 1500);
    } catch {
      setSaveState("error");
      showToast("❌ เกิดข้อผิดพลาด (Error — please try again)", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-emerald-700 space-y-4 animate-slide-up">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          {product.sku && (
            <div className="text-xs text-slate-500 font-mono">
              {product.sku}
            </div>
          )}
          {product.category && (
            <div className="text-xs text-slate-400">
              {product.category}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-lg ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-xs text-slate-400">
          ชื่อสินค้า (Product Name)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full h-10 bg-surface-dark text-white rounded-lg border border-slate-600 px-3 text-sm mt-1 font-bold"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400">
          รูปสินค้า (Product Photo)
        </label>
        <div className="flex items-center gap-3 mt-1">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt={product.display_name}
              className="w-20 h-20 object-contain rounded-lg bg-surface-dark flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-surface-dark flex items-center justify-center text-slate-600 flex-shrink-0">
              📦
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="bg-surface-light text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs transition-colors"
            >
              📷 ถ่ายรูป (Take Photo)
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="bg-surface-light text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs transition-colors"
            >
              🖼️ เลือกรูป (Choose Photo)
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-300">
          จำนวนสต็อก (Stock Count)
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
            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
            className="w-24 h-12 bg-surface-dark text-white text-center rounded-lg border border-slate-600 text-xl"
          />
          <button
            onClick={() => setStock(stock + 1)}
            className="w-12 h-12 bg-surface-light rounded-lg text-white text-xl flex items-center justify-center hover:bg-slate-500 active:bg-slate-400"
          >
            +
          </button>
        </div>
        {product.current_stock !== stock && (
          <div className="text-xs text-yellow-400 mt-1">
            ระบบเดิม: {product.current_stock} → ปรับเป็น: {stock}
          </div>
        )}
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

      <button
        onClick={() => setCounted(!counted)}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
          counted
            ? "bg-emerald-600/20 border border-emerald-600 text-emerald-400"
            : "bg-surface-dark border border-slate-600 text-slate-400"
        }`}
      >
        {counted
          ? "☑ นับแล้ว (Counted) ✓"
          : "☐ ยังไม่นับ (Not counted)"}
      </button>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${
          saveState === "success"
            ? "bg-emerald-600"
            : saveState === "error"
              ? "bg-red-600"
              : "bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600"
        }`}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> กำลังบันทึก...
          </span>
        ) : saveState === "success" ? (
          "✅ บันทึกแล้ว (Saved!)"
        ) : saveState === "error" ? (
          "❌ บันทึกไม่สำเร็จ — กดลองใหม่ (Retry)"
        ) : (
          "💾 บันทึก (Save)"
        )}
      </button>

      {product.sku && (
        <div>
          <div className="text-xs text-slate-400 mb-2">
            🏷 พิมพ์ฉลาก (Print Label)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["40x20", "40x30", "70x30", "70x50"] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  const base = process.env.NEXT_PUBLIC_LABEL_API_URL || "https://pinit-label-api.onrender.com";
                  let url =
                    base + "/label/" +
                    encodeURIComponent(product.sku) +
                    "/" + size +
                    "?name=" + encodeURIComponent(product.display_name) +
                    "&price=" + sellPrice;
                  if (repairPrice > 0 && product.show_repair_on_label) {
                    url += "&repair=" + repairPrice;
                  }
                  window.open(url, "_blank");
                }}
                className="py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-xs transition-colors"
              >
                {size.replace("x", "×")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
