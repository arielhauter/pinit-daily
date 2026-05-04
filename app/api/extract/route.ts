import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ExtractionSchema, EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { image, date } = await request.json();

    if (!image || !date) {
      return Response.json(
        { error: "Missing image or date" },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: ExtractionSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image,
            },
            {
              type: "text",
              text: `Extract all data from this cash drawer ledger form. The expected date is ${date}. Follow the extraction rules in your instructions precisely.`,
            },
          ],
        },
      ],
      system: EXTRACTION_SYSTEM_PROMPT,
    });

    return Response.json(result.object);
  } catch (err) {
    console.error("Extraction error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to extract data from image" },
      { status: 500 }
    );
  }
}
