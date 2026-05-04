import { NextRequest } from "next/server";
import { TABLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;

export async function GET(request: NextRequest) {
  const recordId = request.nextUrl.searchParams.get("id");

  if (!recordId) {
    return Response.json(
      { error: "Missing id parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLES.PRODUCTS)}/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable error ${res.status}: ${body}`);
    }

    const record = await res.json();

    return Response.json({
      id: record.id,
      sku: (record.fields.sku as string) || null,
      display_name: (record.fields.display_name as string) || "",
      last_known_sell_price_baht:
        (record.fields.last_known_sell_price_baht as number) || 0,
      repair_price_total:
        (record.fields.repair_price_total as number) || 0,
      show_repair_on_label:
        (record.fields.show_repair_on_label as boolean) || false,
    });
  } catch (err) {
    console.error("Product fetch error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Fetch failed",
      },
      { status: 500 }
    );
  }
}
