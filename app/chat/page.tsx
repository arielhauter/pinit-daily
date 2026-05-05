"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContextButtons } from "@/components/chat/context-buttons";
import { ToolResultCard } from "@/components/chat/tool-result-card";
import { QrScanner } from "@/components/chat/qr-scanner";

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScanner, setShowScanner] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading } =
    useChat({ api: "/api/chat" });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // QR scanner trigger from stock count card
      const scanTrigger = target.closest('[data-scan-trigger]');
      if (scanTrigger) {
        e.preventDefault();
        e.stopPropagation();
        setShowScanner(true);
        return;
      }

      // Label printing — open URL in new tab
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

      // Card actions
      const card = target.closest('[data-card-action]');
      if (card) {
        const message = card.getAttribute('data-card-action');
        if (message) {
          append({ role: 'user', content: message });
        }
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

  const handleContextButton = (prompt: string) => {
    if (prompt === "__CLOSE_SHOP__") {
      router.push("/");
      return;
    }
    append({ role: "user", content: prompt });
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-medium text-white">น้องพินิจ 🤖</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 hover:text-white"
        >
          กลับ
        </button>
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

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-t border-slate-700 bg-slate-900"
      >
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={isLoading}
          className="text-slate-400 hover:text-white w-10 h-10 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
        >
          📷
        </button>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-sky-500 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
