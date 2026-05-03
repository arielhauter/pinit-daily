"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate, getTodayDate, fileToBase64 } from "@/lib/utils";

const CHECKLIST_ITEMS = [
  { th: "บันทึกยอดขายครบ", en: "Sales logged" },
  { th: "บันทึกยอดซื้อครบ", en: "Purchases logged" },
  { th: "บันทึกค่าใช้จ่ายครบ", en: "Expenses logged" },
  { th: "นับเงินสดแล้ว", en: "Cash counted" },
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checks, setChecks] = useState<boolean[]>(
    new Array(CHECKLIST_ITEMS.length).fill(false)
  );
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function toggleCheck(index: number) {
    const next = [...checks];
    next[index] = !next[index];
    setChecks(next);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function handleUpload() {
    if (!imageFile) return;
    setIsUploading(true);

    try {
      const base64 = await fileToBase64(imageFile);
      sessionStorage.setItem(
        "pendingUpload",
        JSON.stringify({ image: base64, date: selectedDate })
      );
      router.push("/dashboard");
    } catch {
      setIsUploading(false);
    }
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 3);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl mb-2">🌙</div>
        <h1 className="text-2xl font-bold text-white">ปิดร้านวันนี้</h1>
        <p className="text-sm text-slate-400">Daily Close-Out</p>
      </div>

      <div className="text-center">
        <label className="text-sm text-slate-400">
          วันที่:{" "}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={minDateStr}
            max={getTodayDate()}
            className="bg-surface-light text-white rounded px-2 py-1 border border-slate-600 text-sm"
          />
        </label>
        <div className="text-white font-semibold mt-1">
          {formatThaiDate(selectedDate)}
        </div>
      </div>

      <div className="bg-surface rounded-xl p-4 border border-slate-700">
        <h2 className="text-sm font-semibold text-white mb-1">
          ── ทำครบแล้วหรือยัง? ──
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Did you finish everything?
        </p>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => toggleCheck(i)}
              className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-surface-light transition-colors"
            >
              <span className="text-lg">{checks[i] ? "☑" : "☐"}</span>
              <div>
                <div className="text-sm text-white">{item.th}</div>
                <div className="text-xs text-slate-500">{item.en}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-slate-700 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imagePreview ? (
          <div className="space-y-3">
            <img
              src={imagePreview}
              alt="Ledger preview"
              className="w-full rounded-lg max-h-64 object-contain"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-slate-400 underline"
            >
              ถ่ายใหม่ (Retake)
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 space-y-2"
          >
            <div className="text-4xl">📷</div>
            <div className="text-lg font-semibold text-white">
              ถ่ายรูปเก๊ะ
            </div>
            <div className="text-sm text-slate-400">
              Take Photo of Ledger
            </div>
            <div className="text-xs text-slate-500 mt-2">
              กดเพื่อถ่ายรูป / เลือกไฟล์
              <br />
              Tap to take photo / choose file
            </div>
          </button>
        )}
      </div>

      {imagePreview && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              กำลังอัพโหลด...
            </span>
          ) : (
            "อัพโหลดและดูผลวันนี้ (Upload & See Results)"
          )}
        </button>
      )}

      <div className="text-center">
        <p className="text-xs text-slate-500">── ดูสรุปวันก่อนหน้า ──</p>
        <button className="text-sm text-slate-400 hover:text-white transition-colors mt-1">
          ◄ ดูผลวันวาน (View yesterday&apos;s result)
        </button>
      </div>
    </div>
  );
}
