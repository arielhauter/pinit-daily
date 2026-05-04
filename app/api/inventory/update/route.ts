import { updateRecord } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { recordId, fields } = await request.json();

    if (!recordId) {
      return Response.json({ error: "Missing recordId" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};

    if (fields.current_stock !== undefined)
      updateFields.current_stock = fields.current_stock;
    if (fields.last_known_cost_baht !== undefined)
      updateFields.last_known_cost_baht = fields.last_known_cost_baht;
    if (fields.last_known_sell_price_baht !== undefined)
      updateFields.last_known_sell_price_baht =
        fields.last_known_sell_price_baht;
    if (fields.repair_price_total !== undefined)
      updateFields.repair_price_total = fields.repair_price_total;
    if (fields.category !== undefined)
      updateFields.category = fields.category;
    if (fields.notes !== undefined) updateFields.notes = fields.notes;
    if (fields.has_been_counted !== undefined)
      updateFields.has_been_counted = fields.has_been_counted;
    if (fields.counted_date !== undefined)
      updateFields.counted_date = fields.counted_date;
    if (fields.counted_by !== undefined)
      updateFields.counted_by = fields.counted_by;
    if (fields.product_photo) {
      updateFields.product_photo = [{ url: fields.product_photo }];
    }

    const record = await updateRecord(
      TABLES.PRODUCTS,
      recordId,
      updateFields
    );

    return Response.json({ success: true, record });
  } catch (err) {
    console.error("Product update error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Update failed",
      },
      { status: 500 }
    );
  }
}
