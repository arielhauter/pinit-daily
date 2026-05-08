import { createRecord } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { messages, user, totalTokens, totalCost } = await req.json();

    if (!messages || messages.length === 0) {
      return Response.json({ success: false, error: "No messages to save" });
    }

    const visibleMessages = messages.filter(
      (m: any) => m.content !== "__MORNING_CHECKLIST__"
    );

    if (visibleMessages.length === 0) {
      return Response.json({ success: false, error: "No visible messages" });
    }

    const actionMessages = visibleMessages
      .filter((m: any) => m.role === "user")
      .map((m: any) => typeof m.content === "string" ? m.content : "")
      .slice(0, 5)
      .join(" | ");
    const summary = actionMessages.substring(0, 200);

    const record = await createRecord(TABLES.CHAT_SESSIONS, {
      user: user || "Mai",
      started_at: visibleMessages[0]?.createdAt || new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message_count: visibleMessages.length,
      messages_json: JSON.stringify(visibleMessages),
      total_tokens: totalTokens || 0,
      total_cost_cents: totalCost || 0,
      summary,
    });

    return Response.json({ success: true, sessionId: record.id });
  } catch (error) {
    console.error("Save session error:", error);
    return Response.json({ success: false, error: String(error) });
  }
}
