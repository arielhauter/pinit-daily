"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { compressImage } from "@/lib/compress-image";

type Props = {
  categories: string[];
  onCreated: (record: { id: string; display_name: string }) => void;
  onClose: () => void;
};

type Phase = "form" | "polling-sku" | "print-ready" | "timeout";

type SkuResult = {
  sku: string;
  display_name: string;
  last_known_sell_price_baht: number;
  repair_price_total: number;
  show_repair_on_label: boolean;
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [skuResult, setSkuResult] = useState<SkuResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const pollForSku = useCallback(
    (recordId: string, attempt: number) => {
      if (attempt >= 5) {
        setPhase("timeout");
        return;
      }

      pollRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/inventory/${recordId}`);
          if (!res.ok) throw new Error("Fetch failed");
          const data = await res.json();

          if (data.sku) {
            setSkuResult(data);
            setPhase("print-ready");
            return;
          }
        } catch {
          // continue polling
        }
        pollForSku(recordId, attempt + 1);
      }, 2000);
    },
    []
  );

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    const compressed = await compressImage(file);
    setPhotoBase64(compressed);
  }

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
          ...(photoBase64 ? { product_photo: photoBase64 } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Create failed");
      }

      const result = await res.json();
      showToast("สร้างสินค้าใหม่แล้ว (Product created!)", "success");
      onCreated({
        id: result.id,
        display_name: displayName.trim(),
      });

      setCreatedRecordId(result.id);
      setPhase("polling-sku");
      pollForSku(result.id, 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Create failed"
      );
      showToast("เกิดข้อผิดพลาด (Error — please try again)", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    if (pollRef.current) clearTimeout(pollRef.current);
    onClose();
  }

  if (phase === "polling-sku") {
    return (
      <div className="bg-surface rounded-xl p-4 border border-blue-700 space-y-4 animate-slide-up">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-4xl animate-spin">⏳</div>
          <div className="text-center">
            <p className="text-white font-bold">
              กำลังสร้างรหัสสินค้า...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Generating SKU...
            </p>
          </div>
          <p className="text-sm text-slate-400">
            {displayName.trim()}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "print-ready" && skuResult) {
    const labelBase =
      process.env.NEXT_PUBLIC_LABEL_API_URL ||
      "https://pinit-label-api.onrender.com";

    return (
      <div className="bg-surface rounded-xl p-4 border border-emerald-700 space-y-4 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="text-3xl">🏷</div>
          <h3 className="text-white font-bold text-lg">
            {skuResult.display_name}
          </h3>
          <div className="text-emerald-400 font-mono text-xl font-bold">
            {skuResult.sku}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-2">
            พิมพ์ฉลาก (Print Label)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["40x20", "40x30", "70x30", "70x50"] as const).map(
              (size) => (
                <button
                  key={size}
                  onClick={() => {
                    let url =
                      labelBase +
                      "/label/" +
                      encodeURIComponent(skuResult.sku) +
                      "/" +
                      size +
                      "?name=" +
                      encodeURIComponent(skuResult.display_name) +
                      "&price=" +
                      skuResult.last_known_sell_price_baht;
                    if (
                      skuResult.repair_price_total > 0 &&
                      skuResult.show_repair_on_label
                    ) {
                      url += "&repair=" + skuResult.repair_price_total;
                    }
                    window.open(url, "_blank");
                  }}
                  className="py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-xs transition-colors"
                >
                  {size.replace("x", "×")}
                </button>
              )
            )}
          </div>
        </div>

        <button
          onClick={handleDone}
          className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          เสร็จสิ้น (Done)
        </button>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="bg-surface rounded-xl p-4 border border-yellow-700 space-y-4 animate-slide-up">
        <div className="text-center space-y-2 py-4">
          <div className="text-3xl">⏱</div>
          <p className="text-yellow-400 font-bold">
            รหัสยังไม่พร้อม
          </p>
          <p className="text-xs text-slate-400">
            ค้นหาอีกครั้งเพื่อพิมพ์ฉลาก
          </p>
          <p className="text-xs text-slate-500 mt-2">
            SKU not ready yet — search again later to print label
          </p>
        </div>
        <button
          onClick={handleDone}
          className="w-full py-3 rounded-xl font-bold text-white bg-slate-600 hover:bg-slate-500 transition-colors"
        >
          ปิด (Close)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-4 border border-blue-700 space-y-4 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold">
            สร้างสินค้าใหม่
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

      <div>
        <label className="text-xs text-slate-400">
          รูปสินค้า (Product Photo)
        </label>
        <div className="flex items-center gap-3 mt-1">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Preview"
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

      <div className="w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold bg-emerald-600/20 border border-emerald-600 text-emerald-400">
        ☑ นับแล้ว (Counted) ✓
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
          "สร้างและบันทึก (Create & Save)"
        )}
      </button>

      <div className="text-xs text-slate-500 text-center">
        SKU จะถูกสร้างอัตโนมัติ (SKU will be auto-generated)
      </div>
    </div>
  );
}
