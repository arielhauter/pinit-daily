"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ActivityGrid } from "@/components/activity-grid";
import { Reconciliation } from "@/components/reconciliation";
import { ExtractedData } from "@/components/extracted-data";
import { Confetti } from "@/components/confetti";
import { computeReconciliation } from "@/lib/reconciliation";
import { formatThaiDate } from "@/lib/utils";
import type {
  ExtractionResult,
  ActivitySummary,
  ReconciliationResult,
  StreakData,
} from "@/lib/types";

type LoadingState = "loading" | "ready" | "submitting" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadingState>("loading");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationResult | null>(null);
  const [note, setNote] = useState("");
  const [imageBase64, setImageBase64] = useState<string>("");

  const recalculate = useCallback(
    (ext: ExtractionResult, act: ActivitySummary) => {
      const result = computeReconciliation(ext, act);
      setReconciliation(result);
    },
    []
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingUpload");
    if (!raw) {
      router.push("/");
      return;
    }

    const { image, date: uploadDate } = JSON.parse(raw);
    setDate(uploadDate);
    setImageBase64(image);

    Promise.all([
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, date: uploadDate }),
      }).then((r) => {
        if (!r.ok) throw new Error("Extraction failed");
        return r.json();
      }),
      fetch(`/api/activity?date=${uploadDate}`).then((r) => {
        if (!r.ok) throw new Error("Activity fetch failed");
        return r.json();
      }),
      fetch("/api/streak").then((r) => {
        if (!r.ok) throw new Error("Streak fetch failed");
        return r.json();
      }),
    ])
      .then(([ext, act, str]) => {
        setExtraction(ext);
        setActivity(act);
        setStreak(str);
        recalculate(ext, act);
        setState("ready");
      })
      .catch((err) => {
        setError(err.message);
        setState("error");
      });
  }, [router, recalculate]);

  function handleExtractionUpdate(updated: ExtractionResult) {
    setExtraction(updated);
    if (activity) {
      recalculate(updated, activity);
    }
  }

  async function handleSubmit() {
    if (!extraction || !activity || !reconciliation) return;

    if (reconciliation.variance !== 0 && !note.trim()) {
      return;
    }

    setState("submitting");

    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          extraction,
          activity,
          reconciliation,
          note,
          imageBase64,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");

      const result = await res.json();
      sessionStorage.removeItem("pendingUpload");
      sessionStorage.setItem(
        "confirmationData",
        JSON.stringify({
          date,
          variance: reconciliation.variance,
          salesTotal: activity.sales.total,
          totalDraws: reconciliation.breakdown.total_draws,
          streak: result.streak,
        })
      );
      router.push("/confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="text-4xl animate-spin">⏳</div>
        <h2 className="text-lg font-bold text-white">กำลังอ่านเก๊ะ...</h2>
        <p className="text-sm text-slate-400">Reading your ledger...</p>
        <div className="bg-surface rounded-lg p-3 border border-slate-700 mt-6">
          <p className="text-xs text-slate-400">
            💡 ระหว่างรอ: เก็บเก๊ะกระดาษใส่แฟ้ม
          </p>
          <p className="text-xs text-slate-500">
            While waiting: file the paper ledger
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="text-4xl">❌</div>
        <h2 className="text-lg font-bold text-red-400">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="bg-slate-700 text-white px-6 py-2 rounded-lg"
        >
          ย้อนกลับ (Go Back)
        </button>
      </div>
    );
  }

  const needsNote = reconciliation && reconciliation.variance !== 0;
  const canSubmit = !needsNote || note.trim().length > 0;

  return (
    <div className="space-y-6 pb-8">
      {reconciliation?.variance === 0 && <Confetti />}

      <div className="text-center">
        <h1 className="text-xl font-bold text-white">
          📊 สรุปวันนี้ — Daily Summary
        </h1>
        <p className="text-sm text-slate-400">{formatThaiDate(date)}</p>
      </div>

      {activity && <ActivityGrid activity={activity} />}

      {activity &&
        activity.sales.cash_total === 0 &&
        extraction &&
        extraction.starting_balance > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-sm">
            <p className="text-yellow-400">
              💡 ยอดขายเงินสดในระบบ = ฿0 — ลืมบันทึกหรือเปล่า?
            </p>
            <p className="text-xs text-yellow-500 mt-1">
              Cash sales in system = ฿0 — did you forget to log?
            </p>
          </div>
        )}

      {reconciliation && <Reconciliation result={reconciliation} />}

      {extraction && (
        <ExtractedData
          extraction={extraction}
          onUpdate={handleExtractionUpdate}
        />
      )}

      <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-3">
        <div>
          <label className="text-sm font-semibold text-white">
            หมายเหตุ (Notes)
          </label>
          {needsNote && (
            <span className="text-xs text-red-400 ml-2">* จำเป็น</span>
          )}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            needsNote
              ? "กรุณาใส่หมายเหตุเนื่องจากมีผลต่าง (Required — explain variance)"
              : "หมายเหตุเพิ่มเติม (Optional notes)"
          }
          className="w-full bg-surface-dark text-white rounded-lg p-3 border border-slate-600 text-sm resize-none h-20 placeholder:text-slate-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors hover:bg-slate-600"
        >
          ย้อนกลับ
          <br />
          <span className="text-xs text-slate-400">Go Back</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || state === "submitting"}
          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {state === "submitting" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              กำลังบันทึก...
            </span>
          ) : needsNote ? (
            <>
              บันทึกพร้อมหมายเหตุ
              <br />
              <span className="text-xs opacity-80">Save with Note</span>
            </>
          ) : (
            <>
              ✅ บันทึกและปิดร้าน
              <br />
              <span className="text-xs opacity-80">Save & Close Out</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
