import { createRecord } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (
      !data.display_name ||
      data.current_stock === undefined ||
      !data.category
    ) {
      return Response.json(
        {
          error:
            "Required fields: display_name, current_stock, category",
        },
        { status: 400 }
      );
    }

    const fields: Record<string, unknown> = {
      display_name: data.display_name,
      current_stock: data.current_stock,
      category: data.category,
      has_been_counted: true,
      counted_date: new Date().toISOString().split("T")[0],
      counted_by: data.counted_by || "app",
    };

    if (data.last_known_cost_baht)
      fields.last_known_cost_baht = data.last_known_cost_baht;
    if (data.last_known_sell_price_baht)
      fields.last_known_sell_price_baht = data.last_known_sell_price_baht;
    if (data.repair_price_total)
      fields.repair_price_total = data.repair_price_total;
    if (data.notes) fields.notes = data.notes;
    if (data.product_photo)
      fields.product_photo = [{ url: data.product_photo }];

    const record = await createRecord(TABLES.PRODUCTS, fields);

    return Response.json({
      success: true,
      id: record.id,
      sku: (record.fields.sku as string) || null,
      display_name: record.fields.display_name,
    });
  } catch (err) {
    console.error("Product create error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Create failed",
      },
      { status: 500 }
    );
  }
}
