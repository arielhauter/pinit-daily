import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { chatTools } from "@/lib/chat-tools";
import { selectRecords, createRecord } from "@/lib/airtable";
import { TABLES, DAILY_COST_CAP_CENTS } from "@/lib/constants";

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

function addCacheControl(messages: any[]): any[] {
  if (messages.length === 0) return messages;
  const lastIndex = messages.length - 1;
  return messages.map((msg, i) => {
    if (i === lastIndex) {
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: {
            cacheControl: { type: "ephemeral" },
          },
        },
      };
    }
    return msg;
  });
}

async function getDailySpend(): Promise<number> {
  try {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const logs = await selectRecords(TABLES.ACTIVITY_LOG, {
      filterByFormula: `AND(IS_SAME({timestamp}, '${today}', 'day'), {token_cost} > 0)`,
      fields: ["token_cost"],
    });
    return logs.reduce((sum, r) => sum + ((r.fields.token_cost as number) || 0), 0);
  } catch {
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, oracleMode } = await req.json();

    const dailySpend = await getDailySpend();
    if (dailySpend >= DAILY_COST_CAP_CENTS) {
      return Response.json(
        { error: `ถึงขีดจำกัดค่าใช้จ่ายประจำวันแล้วค่ะ (฿${(DAILY_COST_CAP_CENTS / 100).toFixed(2)}) กรุณาติดต่อ Mint ค่ะ` },
        { status: 429 }
      );
    }

    const model = selectModel(messages, oracleMode);
    const trimmedMessages = trimMessages(messages);
    const messagesWithCache = addCacheControl(trimmedMessages);

    const result = await streamText({
      model: anthropic(model, { cacheControl: true }),
      system: SYSTEM_PROMPT,
      messages: messagesWithCache,
      tools: chatTools,
      maxSteps: 5,
      onFinish: async ({ usage, experimental_providerMetadata }) => {
        console.log("CACHE METRICS:", JSON.stringify(experimental_providerMetadata?.anthropic));

        const inputTokens = usage?.promptTokens || 0;
        const outputTokens = usage?.completionTokens || 0;
        const cachedTokens = (experimental_providerMetadata?.anthropic as any)?.cacheReadInputTokens || 0;

        const isHaiku = model.includes("haiku");
        const inputRate = isHaiku ? 0.001 : 0.003;
        const outputRate = isHaiku ? 0.005 : 0.015;
        const cacheRate = isHaiku ? 0.0001 : 0.0003;

        const uncachedInput = inputTokens - cachedTokens;
        const cost =
          (uncachedInput * inputRate) / 1000 +
          (cachedTokens * cacheRate) / 1000 +
          (outputTokens * outputRate) / 1000;
        const costCents = Math.round(cost * 100);

        if (costCents > 0) {
          try {
            await createRecord(TABLES.ACTIVITY_LOG, {
              timestamp: new Date().toISOString(),
              action_type: "api_call",
              user: "System",
              summary: `API: ${inputTokens} in / ${outputTokens} out / ${cachedTokens} cached`,
              model_used: model,
              token_cost: costCents,
            });
          } catch (e) {
            console.error("Cost logging error:", e);
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    const status = error?.statusCode || error?.status || 500;
    const message = error?.message || "";

    if (status === 429 || message.includes("rate_limit")) {
      return new Response(
        JSON.stringify({ error: "กรุณารอสักครู่แล้วลองใหม่ค่ะ (rate limit)" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Chat API error:", status, message);
    return new Response(
      JSON.stringify({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่ค่ะ" }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
