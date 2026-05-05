import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { chatTools } from "@/lib/chat-tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
