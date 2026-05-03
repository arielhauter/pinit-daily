"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatBaht } from "@/lib/utils";

type ActivityCardProps = {
  icon: string;
  titleTh: string;
  titleEn: string;
  count: number;
  countLabel: string;
  total?: number;
  hasActivity: boolean;
  detail?: string;
  delay?: number;
};

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return value;
}

export function ActivityCard({
  icon,
  titleTh,
  titleEn,
  count,
  countLabel,
  total,
  hasActivity,
  detail,
  delay = 0,
}: ActivityCardProps) {
  const animatedTotal = useCountUp(total ?? 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "rounded-xl p-3 text-center transition-all duration-500",
        hasActivity
          ? "bg-surface-light border border-slate-600"
          : "bg-surface border border-slate-700 opacity-50",
        visible ? "animate-slide-up" : "opacity-0 translate-y-5"
      )}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm font-semibold text-white">{titleTh}</div>
      <div className="text-[10px] text-slate-400">{titleEn}</div>
      <div className="mt-2">
        {hasActivity ? (
          <>
            <div className="text-xs text-slate-300">
              {count} {countLabel}
            </div>
            {total !== undefined && (
              <div className="text-lg font-bold text-emerald-400">
                {formatBaht(animatedTotal)}
              </div>
            )}
            {detail && (
              <div className="text-[10px] text-slate-400 mt-1">{detail}</div>
            )}
            <div className="text-emerald-400 mt-1">✅</div>
          </>
        ) : (
          <div className="text-xs text-slate-500 mt-2">
            ⚠️ ยังไม่มี
            <br />
            <span className="text-[10px]">None yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
