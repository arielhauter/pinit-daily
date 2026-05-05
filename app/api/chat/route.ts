import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { chatTools } from "@/lib/chat-tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, oracleMode } = await req.json();

  const model = oracleMode ? "claude-opus-4-6" : "claude-sonnet-4-6";

  const result = await streamText({
    model: anthropic(model),
    system: SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
