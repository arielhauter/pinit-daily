import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { base64 } = await request.json();

    if (!base64 || typeof base64 !== "string") {
      return Response.json(
        { error: "Missing base64 image data" },
        { status: 400 }
      );
    }

    const match = base64.match(
      /^data:(image\/\w+);base64,(.+)$/
    );
    if (!match) {
      return Response.json(
        { error: "Invalid base64 data URL format" },
        { status: 400 }
      );
    }

    const contentType = match[1];
    const ext = contentType.split("/")[1] || "jpg";
    const buffer = Buffer.from(match[2], "base64");
    const filename = `product-${Date.now()}.${ext}`;

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    return Response.json({ url: blob.url });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
