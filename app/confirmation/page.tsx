"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Confetti } from "@/components/confetti";
import { formatBaht, formatThaiDate } from "@/lib/utils";
import { STREAK_MILESTONES } from "@/lib/constants";

type ConfirmationData = {
  date: string;
  variance: number;
  salesTotal: number;
  totalDraws: number;
  streak: number;
};

const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function ConfirmationPage() {
  const router = useRouter();
  const [data, setData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("confirmationData");
    if (!raw) {
      router.push("/");
      return;
    }
    setData(JSON.parse(raw));
  }, [router]);

  if (!data) return null;

  const milestone = Object.entries(STREAK_MILESTONES)
    .reverse()
    .find(([days]) => data.streak >= Number(days));

  const today = new Date(data.date + "T00:00:00");
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
      {data.variance === 0 && <Confetti />}

      <div className="text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-white">บันทึกสำเร็จ!</h1>
        <p className="text-sm text-slate-400">Saved successfully!</p>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-slate-700 w-full text-center">
        <div className="text-3xl mb-2">
          {data.streak >= 7 ? "🔥🔥" : "🔥"}
        </div>
        <div className="text-lg font-bold text-white mb-1">
          ปิดร้านครบ {data.streak} วัน
          {data.streak > 1 ? "ติดต่อกัน!" : "!"}
        </div>
        <div className="text-sm text-slate-400 mb-3">
          {data.streak}-day close-out streak!
        </div>

        {milestone && (
          <div className="text-lg mb-3">{milestone[1]}</div>
        )}

        <div className="flex justify-center gap-2 text-sm">
          {THAI_DAYS.map((day, i) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            const isPast = dayDate <= today;
            const isToday =
              dayDate.toDateString() === today.toDateString();
            return (
              <div key={i} className="text-center">
                <div className="text-xs text-slate-500 mb-1">{day}</div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isToday
                      ? "bg-emerald-600 text-white"
                      : isPast
                        ? "bg-surface-light text-emerald-400"
                        : "bg-surface-dark text-slate-600"
                  }`}
                >
                  {isPast ? "✅" : "·"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-xl p-4 border border-slate-700 w-full space-y-2 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>วันที่</span>
          <span className="text-white">{formatThaiDate(data.date)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>ผลต่าง</span>
          <span
            className={
              data.variance === 0 ? "text-emerald-400" : "text-yellow-400"
            }
          >
            {formatBaht(data.variance)}{" "}
            {data.variance === 0 ? "✅" : "⚠️"}
          </span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>ยอดขาย</span>
          <span className="text-white">{formatBaht(data.salesTotal)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>เบิกส่วนตัว</span>
          <span className="text-white">{formatBaht(data.totalDraws)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-500">Mint will be notified.</p>

      <button
        onClick={() => {
          sessionStorage.removeItem("confirmationData");
          router.push("/");
        }}
        className="w-full bg-surface-light text-white py-3 rounded-xl font-semibold hover:bg-slate-500 transition-colors"
      >
        🏠 กลับหน้าแรก
        <br />
        <span className="text-xs text-slate-400">Back to home</span>
      </button>
    </div>
  );
}
