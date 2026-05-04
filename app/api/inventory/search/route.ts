import { NextRequest } from "next/server";
import { selectRecords } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

function sanitizeForFormula(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function extractPhotoUrl(photoField: unknown): string | null {
  if (
    Array.isArray(photoField) &&
    photoField.length > 0 &&
    photoField[0]?.url
  ) {
    return photoField[0].url as string;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return Response.json([]);
  }

  try {
    const sanitized = sanitizeForFormula(query.toLowerCase());
    const records = await selectRecords(TABLES.PRODUCTS, {
      filterByFormula: `OR(SEARCH("${sanitized}", LOWER({display_name})), SEARCH("${sanitized}", LOWER({original_name})))`,
      fields: [
        "sku",
        "display_name",
        "original_name",
        "category",
        "current_stock",
        "last_known_cost_baht",
        "last_known_sell_price_baht",
        "repair_price_total",
        "notes",
        "has_been_counted",
        "Product Photo",
        "counted_date",
        "counted_by",
      ],
      sort: [{ field: "display_name", direction: "asc" }],
      maxRecords: 20,
    });

    const results = records.map((r) => ({
      id: r.id,
      sku: (r.fields.sku as string) || "",
      display_name: (r.fields.display_name as string) || "",
      original_name: (r.fields.original_name as string) || "",
      category: (r.fields.category as string) || "",
      current_stock: (r.fields.current_stock as number) || 0,
      last_known_cost_baht: (r.fields.last_known_cost_baht as number) || 0,
      last_known_sell_price_baht:
        (r.fields.last_known_sell_price_baht as number) || 0,
      repair_price_total: (r.fields.repair_price_total as number) || 0,
      notes: (r.fields.notes as string) || "",
      has_been_counted: (r.fields.has_been_counted as boolean) || false,
      photo_url: extractPhotoUrl(r.fields["Product Photo"]),
      counted_date: (r.fields.counted_date as string) || null,
      counted_by: (r.fields.counted_by as string) || null,
    }));

    return Response.json(results);
  } catch (err) {
    console.error("Product search error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Search failed",
      },
      { status: 500 }
    );
  }
}
