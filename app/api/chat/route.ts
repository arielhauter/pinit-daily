import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { chatTools } from "@/lib/chat-tools";

export const maxDuration = 60;

const MAX_MESSAGES = 20;

function trimMessages(messages: any[]): any[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return [...messages.slice(0, 2), ...messages.slice(-16)];
}

function selectModel(messages: any[], oracleMode: boolean): string {
  if (oracleMode) return "claude-opus-4-6";

  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
  const content = (lastUserMsg?.content || "").toLowerCase();

  const complexPatterns = [
    /กำไร|margin|วิเคราะห์|analysis/,
    /สรุป.*เดือน|summary.*month/,
    /เปรียบเทียบ|compare/,
    /(ต้องการ|บันทึก).*(ขาย|ซื้อ|ซ่อม|จ่าย)/,
    /รับงานซ่อม|สร้างงานซ่อม/,
    /ลบ|delete|แก้ไข/,
    /รับสินค้า|รับของ/,
    /oracle|วิเคราะห์|ขายดี|ค้างสต็อก|cash flow/,
  ];

  const simplePatterns = [
    /^(pd69|สแกนได้)/i,
    /^[0-9]{3,}$/,
    /^(ค้นหา|หา|ดู|เช็ค)\s/,
    /^พิมพ์ฉลาก/,
    /^สแกน/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(content)) return "claude-sonnet-4-6";
  }

  if (content.length < 5 || !/[a-zA-Z฀-๿]/.test(content)) {
    return "claude-sonnet-4-6";
  }

  for (const pattern of simplePatterns) {
    if (pattern.test(content)) return "claude-haiku-4-5-20251001";
  }

  return "claude-sonnet-4-6";
}

export async function POST(req: Request) {
  const { messages, oracleMode } = await req.json();

  const model = selectModel(messages, oracleMode);
  const trimmedMessages = trimMessages(messages);

  const result = await streamText({
    model: anthropic(model, { cacheControl: true }),
    system: SYSTEM_PROMPT,
    messages: trimmedMessages,
    tools: chatTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
