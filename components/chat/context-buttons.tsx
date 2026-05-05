"use client";

import { useRouter } from "next/navigation";

interface ContextButtonsProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const BUTTONS = [
  { emoji: "📗", label: "ขาย", prompt: "ต้องการบันทึกการขาย", color: "border-green-500" },
  { emoji: "📘", label: "ซื้อ", prompt: "ต้องการบันทึกการซื้อ", color: "border-blue-500" },
  { emoji: "📙", label: "ซ่อม", prompt: "ต้องการดูงานซ่อม", color: "border-orange-500" },
  { emoji: "💸", label: "จ่าย", prompt: "ต้องการบันทึกค่าใช้จ่าย", color: "border-red-500" },
  { emoji: "📦", label: "สต็อก", prompt: "ต้องการค้นหาสินค้า", color: "border-purple-500" },
  { emoji: "🌙", label: "ปิดร้าน", prompt: "__CLOSE_SHOP__", color: "border-slate-500" },
];

export function ContextButtons({ onSend, disabled }: ContextButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
      {BUTTONS.map((btn) => (
        <button
          key={btn.label}
          onClick={() => {
            if (btn.prompt === "__CLOSE_SHOP__") {
              router.push("/");
              return;
            }
            onSend(btn.prompt);
          }}
          disabled={disabled}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-slate-800 border ${btn.color} px-3 py-2 text-sm text-slate-200 active:scale-95 transition-transform disabled:opacity-50`}
        >
          <span>{btn.emoji}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
}
