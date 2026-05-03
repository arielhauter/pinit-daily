"use client";

import { useState } from "react";
import { cn, formatBaht } from "@/lib/utils";
import type { ExtractionResult } from "@/lib/types";

type ExtractedDataProps = {
  extraction: ExtractionResult;
  onUpdate: (updated: ExtractionResult) => void;
};

export function ExtractedData({ extraction, onUpdate }: ExtractedDataProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  function updatePersonDraw(
    index: number,
    field: "salary" | "food" | "other",
    value: number
  ) {
    const updated = { ...extraction };
    updated.person_draws = [...updated.person_draws];
    updated.person_draws[index] = {
      ...updated.person_draws[index],
      [field]: value,
    };
    onUpdate(updated);
  }

  function updateField(field: keyof ExtractionResult, value: number) {
    onUpdate({ ...extraction, [field]: value });
  }

  function updateSectionCItem(
    index: number,
    field: "amount" | "direction",
    value: number | "in" | "out"
  ) {
    const updated = { ...extraction };
    updated.section_c_items = [...updated.section_c_items];
    updated.section_c_items[index] = {
      ...updated.section_c_items[index],
      [field]: value,
    };
    onUpdate(updated);
  }

  return (
    <div className="bg-surface rounded-xl border border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <span className="text-white font-semibold">
          📝 ข้อมูลที่อ่านจากเก๊ะ (Extracted Data)
        </span>
        <span className="text-slate-400">{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {extraction.extraction_confidence !== "high" && (
            <div
              className={cn(
                "text-xs p-2 rounded",
                extraction.extraction_confidence === "medium"
                  ? "bg-yellow-900/30 text-yellow-400"
                  : "bg-red-900/30 text-red-400"
              )}
            >
              ⚠️ ความมั่นใจ:{" "}
              {extraction.extraction_confidence === "medium"
                ? "ปานกลาง (Medium)"
                : "ต่ำ (Low)"}
              {extraction.extraction_notes && (
                <div className="mt-1">{extraction.extraction_notes}</div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              A. เบิกเงิน & อาหาร (Draws & Food)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left py-1 pr-2"></th>
                    <th className="text-right py-1 px-2">เงิน</th>
                    <th className="text-right py-1 px-2">อาหาร</th>
                    <th className="text-right py-1 px-2">อื่นๆ</th>
                  </tr>
                </thead>
                <tbody>
                  {extraction.person_draws.map((person, i) => (
                    <tr key={i} className="text-slate-300 border-t border-slate-700">
                      <td className="py-1 pr-2 font-medium">{person.name}</td>
                      {(["salary", "food", "other"] as const).map((field) => (
                        <td key={field} className="text-right py-1 px-2">
                          {isEditing ? (
                            <input
                              type="number"
                              value={person[field]}
                              onChange={(e) =>
                                updatePersonDraw(
                                  i,
                                  field,
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-16 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                            />
                          ) : (
                            person[field] > 0 && formatBaht(person[field])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              B. ค่าส่ง (Delivery)
            </h3>
            <div className="flex gap-4 text-xs text-slate-300">
              <div>
                <span className="text-slate-400">เช้า: </span>
                {isEditing ? (
                  <input
                    type="number"
                    value={extraction.delivery_am}
                    onChange={(e) =>
                      updateField("delivery_am", Number(e.target.value) || 0)
                    }
                    className="w-16 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                  />
                ) : (
                  formatBaht(extraction.delivery_am)
                )}
              </div>
              <div>
                <span className="text-slate-400">เย็น: </span>
                {isEditing ? (
                  <input
                    type="number"
                    value={extraction.delivery_pm}
                    onChange={(e) =>
                      updateField("delivery_pm", Number(e.target.value) || 0)
                    }
                    className="w-16 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                  />
                ) : (
                  formatBaht(extraction.delivery_pm)
                )}
              </div>
            </div>
          </div>

          {extraction.section_c_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                C. อื่นๆ (Other)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-left py-1">ใคร</th>
                      <th className="text-left py-1">ร้าน</th>
                      <th className="text-left py-1">รายละเอียด</th>
                      <th className="text-right py-1">฿</th>
                      <th className="text-center py-1">เข้า/ออก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraction.section_c_items.map((item, i) => (
                      <tr
                        key={i}
                        className="text-slate-300 border-t border-slate-700"
                      >
                        <td className="py-1">{item.who}</td>
                        <td className="py-1">{item.store}</td>
                        <td className="py-1">{item.description}</td>
                        <td className="text-right py-1">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                updateSectionCItem(
                                  i,
                                  "amount",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-16 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                            />
                          ) : (
                            formatBaht(item.amount)
                          )}
                        </td>
                        <td className="text-center py-1">
                          {isEditing ? (
                            <select
                              value={item.direction}
                              onChange={(e) =>
                                updateSectionCItem(
                                  i,
                                  "direction",
                                  e.target.value as "in" | "out"
                                )
                              }
                              className="bg-slate-800 text-white rounded px-1 py-0.5 border border-slate-600 text-xs"
                            >
                              <option value="in">เข้า</option>
                              <option value="out">ออก</option>
                            </select>
                          ) : item.direction === "in" ? (
                            <span className="text-emerald-400">เข้า</span>
                          ) : (
                            <span className="text-red-400">ออก</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 text-xs">
            <div className="text-slate-300">
              ยอดเปิดร้าน:{" "}
              {isEditing ? (
                <input
                  type="number"
                  value={extraction.starting_balance}
                  onChange={(e) =>
                    updateField(
                      "starting_balance",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-20 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                />
              ) : (
                formatBaht(extraction.starting_balance)
              )}
            </div>
            <div className="text-slate-300">
              ยอดนับจริง:{" "}
              {isEditing ? (
                <input
                  type="number"
                  value={extraction.actual_cash_count}
                  onChange={(e) =>
                    updateField(
                      "actual_cash_count",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-20 bg-slate-800 text-right text-white rounded px-1 py-0.5 border border-slate-600"
                />
              ) : (
                formatBaht(extraction.actual_cash_count)
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "w-full py-2 rounded-lg text-sm font-semibold transition-colors",
              isEditing
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-300"
            )}
          >
            {isEditing
              ? "✅ เสร็จแก้ไข (Done editing)"
              : "✏️ แก้ไขข้อมูล (Edit extracted data)"}
          </button>
        </div>
      )}
    </div>
  );
}
