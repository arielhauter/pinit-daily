"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  async function handleSubmit() {
    if (locked) return;
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLocked(true);
        setError("ล็อค 15 นาที (Locked for 15 minutes)");
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
        }, 15 * 60 * 1000);
      } else {
        setError(data.error || "รหัสผิด (Wrong PIN)");
      }
      setPin("");
    }
  }

  function handleKeyPress(digit: string) {
    if (locked) return;
    if (digit === "delete") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => {
        setPin(newPin);
        handleSubmitWithPin(newPin);
      }, 100);
    }
  }

  async function handleSubmitWithPin(pinValue: string) {
    if (locked) return;
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinValue }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLocked(true);
        setError("ล็อค 15 นาที (Locked for 15 minutes)");
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
        }, 15 * 60 * 1000);
      } else {
        setError(data.error || "รหัสผิด (Wrong PIN)");
      }
      setPin("");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">พินิจเจริญยนต์</h1>
        <p className="text-sm text-slate-400 mt-1">ใส่รหัส PIN</p>
        <p className="text-xs text-slate-500">Enter PIN</p>
      </div>

      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? "bg-emerald-400 border-emerald-400"
                : "border-slate-500"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map(
          (key) =>
            key === "" ? (
              <div key="empty" />
            ) : (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={locked}
                className="w-16 h-16 rounded-full bg-surface-light text-white text-xl font-semibold hover:bg-slate-500 transition-colors disabled:opacity-30 flex items-center justify-center"
              >
                {key === "delete" ? "⌫" : key}
              </button>
            )
        )}
      </div>
    </div>
  );
}
