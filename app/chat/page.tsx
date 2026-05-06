"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContextButtons } from "@/components/chat/context-buttons";
import { ToolResultCard } from "@/components/chat/tool-result-card";
import { QrScanner } from "@/components/chat/qr-scanner";
import { compressImage } from "@/lib/compress-image";

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showWorkOrderUpload, setShowWorkOrderUpload] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [oracleMode, setOracleMode] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const woCameraRef = useRef<HTMLInputElement>(null);
  const woGalleryRef = useRef<HTMLInputElement>(null);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      body: { oracleMode },
    });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const scanTrigger = target.closest('[data-scan-trigger]');
      if (scanTrigger) {
        e.preventDefault();
        e.stopPropagation();
        setShowScanner(true);
        return;
      }

      const label = target.closest('[data-label-url]') as HTMLElement | null;
      if (label) {
        e.preventDefault();
        e.stopPropagation();
        const url = label.getAttribute('data-label-url');
        if (url) {
          window.open(url, '_blank');
        }
        return;
      }

      const card = target.closest('[data-card-action]');
      if (card) {
        const message = card.getAttribute('data-card-action');
        if (message) {
          append({ role: 'user', content: message });
        }
        return;
      }

      if (!target.closest('[data-dashboard-menu]')) {
        setShowDashboardMenu(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [append]);

  const handleQrScan = (value: string) => {
    setShowScanner(false);
    append({ role: 'user', content: `สแกนได้: ${value}` });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleContextButton = (prompt: string) => {
    if (prompt === "__CLOSE_SHOP__") {
      router.push("/");
      return;
    }
    append({ role: "user", content: prompt });
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleWorkOrderPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setShowWorkOrderUpload(false);
    setExtracting(true);

    try {
      const base64 = await compressImage(file, 1200, 0.7);
      const res = await fetch("/api/chat/extract-workorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) {
        throw new Error("Extraction failed");
      }

      const extraction = await res.json();
      const partsText =
        extraction.additional_parts?.length > 0
          ? extraction.additional_parts
              .map((p: { name: string; quantity: number }) => `${p.name} ×${p.quantity}`)
              .join(", ")
          : "ไม่มี";

      const imageUrlLine = extraction.image_url
        ? `\n- รูปใบสั่งงาน: ${extraction.image_url}`
        : "";

      append({
        role: "user",
        content: `📋 ถ่ายรูปใบสั่งงานซ่อม งาน #${extraction.job_id}\n\nข้อมูลที่อ่านได้:\n- ชั่วโมงรวม: ${extraction.total_hours} ชม.\n- อะไหล่เพิ่ม: ${partsText}\n- หมายเหตุ: ${extraction.notes || "ไม่มี"}\n- คำแนะนำลูกค้า: ${extraction.advice_for_customer || "ไม่มี"}${imageUrlLine}\n\nถูกต้องไหม?`,
      });
    } catch {
      append({
        role: "user",
        content: "📋 ถ่ายรูปใบสั่งงานซ่อม แต่อ่านไม่สำเร็จ ช่วยให้ข้อมูลเองค่ะ",
      });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-slate-900">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        oracleMode ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700'
      }`}>
        <h1 className="text-lg font-medium text-white">น้องพินิจ 🤖</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOracleMode(!oracleMode)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              oracleMode
                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🧠 {oracleMode ? 'Oracle ON' : 'Oracle'}
          </button>
          <div className="relative" data-dashboard-menu>
            <button
              onClick={() => setShowDashboardMenu(!showDashboardMenu)}
              className="text-sm text-slate-400 hover:text-white"
              title="สถิติ"
            >
              📊
            </button>
            {showDashboardMenu && (
              <div className="absolute right-0 top-8 bg-slate-800 rounded-lg shadow-lg z-40 border border-slate-700 py-1 w-48">
                <a href="https://airtable.com/appx3s0m3OFYJCTLI/pagvJTFN33q1a42Ld" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">💰 แดชบอร์ด</a>
                <a href="https://airtable.com/appx3s0m3OFYJCTLI/pagwrR5454lhRruBN" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">🔧 แดชบอร์ดงานซ่อม</a>
                <a href="https://airtable.com/appx3s0m3OFYJCTLI/pagNTa1jp1fMdlmqy" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">📋 Mint รีวิวประจำวัน</a>
                <a href="https://airtable.com/appx3s0m3OFYJCTLI/pag46ZWMNO49mVK7t" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">📦 มูลค่าสต็อก</a>
              </div>
            )}
          </div>
          <button
            onClick={handleClearChat}
            className="text-sm text-slate-400 hover:text-white"
            title="เริ่มแชทใหม่"
          >
            🗑
          </button>
          <button
            onClick={() => router.push('/inventory')}
            className="text-sm text-slate-400 hover:text-white"
          >
            📦
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 hover:text-white"
          >
            🌙
          </button>
        </div>
      </div>

      {/* Context Buttons */}
      <ContextButtons onSend={handleContextButton} disabled={isLoading} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[85%]">
              <p>สวัสดีค่ะ! วันนี้จะทำอะไรดี? 🙂</p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const hasTools = m.toolInvocations && m.toolInvocations.length > 0;
          return (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div className="max-w-[85%]">
                {m.content && (
                  <div
                    className={
                      m.role === "user"
                        ? "bg-sky-600 text-white rounded-2xl rounded-br-sm px-4 py-2"
                        : "bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm px-4 py-2"
                    }
                  >
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                  </div>
                )}
                {hasTools && (
                  <div className="mt-2 space-y-1">
                    {m.toolInvocations!.map((invocation) => (
                      <ToolResultCard
                        key={invocation.toolCallId}
                        toolName={invocation.toolName}
                        state={invocation.state}
                        result={
                          invocation.state === "result" ? invocation.result : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-sm px-4 py-2">
              <span className="animate-pulse">กำลังคิด...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QR Scanner Overlay */}
      {showScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Hidden file inputs for work order photo */}
      <input
        ref={woCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleWorkOrderPhoto}
      />
      <input
        ref={woGalleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWorkOrderPhoto}
      />

      {/* Work Order Upload Options */}
      {showWorkOrderUpload && (
        <div className="absolute bottom-20 left-3 bg-slate-800 rounded-lg shadow-lg p-2 space-y-1 z-40 border border-slate-700">
          <button
            onClick={() => woCameraRef.current?.click()}
            className="block w-full text-left text-sm text-slate-200 px-3 py-2 rounded hover:bg-slate-700"
          >
            📷 ถ่ายรูปใบสั่งงาน
          </button>
          <button
            onClick={() => woGalleryRef.current?.click()}
            className="block w-full text-left text-sm text-slate-200 px-3 py-2 rounded hover:bg-slate-700"
          >
            🖼️ เลือกรูปจากแกลเลอรี
          </button>
        </div>
      )}

      {/* Extracting indicator */}
      {extracting && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-900/30 border-t border-orange-500/30">
          <span className="animate-spin text-sm">⏳</span>
          <span className="text-sm text-orange-300">กำลังอ่านใบสั่งงาน...</span>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="relative flex gap-2 p-3 border-t border-slate-700 bg-slate-900"
      >
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={isLoading || extracting}
          className="text-slate-400 hover:text-white w-10 h-10 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
        >
          📷
        </button>
        <button
          type="button"
          onClick={() => setShowWorkOrderUpload(!showWorkOrderUpload)}
          disabled={isLoading || extracting}
          className={`w-10 h-10 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform ${
            showWorkOrderUpload ? "text-orange-400" : "text-slate-400 hover:text-white"
          }`}
        >
          📋
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
          disabled={isLoading || extracting}
        />
        <button
          type="submit"
          disabled={isLoading || extracting || !input.trim()}
          className="bg-sky-500 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
        >
          ➤
        </button>
      </form>

      {/* Version */}
      <div className="text-xs text-slate-600 text-center py-1">
        Pinit AI v1.1 — Phase 6
      </div>
    </div>
  );
}
