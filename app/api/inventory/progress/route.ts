import { selectRecords } from "@/lib/airtable";
import { TABLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [inScope, recentRecords] = await Promise.all([
      selectRecords(TABLES.PRODUCTS, {
        filterByFormula: `OR({current_stock} > 0, {has_been_counted} = TRUE())`,
        fields: ["category", "has_been_counted"],
      }),
      selectRecords(TABLES.PRODUCTS, {
        filterByFormula: `{has_been_counted} = TRUE()`,
        fields: ["display_name", "current_stock", "counted_date"],
        sort: [{ field: "counted_date", direction: "desc" }],
        maxRecords: 10,
      }),
    ]);

    const categoryMap = new Map<
      string,
      { counted: number; total: number }
    >();
    let totalCounted = 0;

    for (const record of inScope) {
      const category =
        (record.fields.category as string) ||
        "ไม่มีหมวดหมู่ (Uncategorized)";
      const isCounted = record.fields.has_been_counted === true;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { counted: 0, total: 0 });
      }
      const cat = categoryMap.get(category)!;
      cat.total++;
      if (isCounted) {
        cat.counted++;
        totalCounted++;
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        counted: stats.counted,
        total: stats.total,
      }))
      .sort((a, b) => {
        const aDone = a.counted === a.total;
        const bDone = b.counted === b.total;
        if (aDone && !bDone) return -1;
        if (bDone && !aDone) return 1;
        const aStarted = a.counted > 0;
        const bStarted = b.counted > 0;
        if (aStarted && !bStarted) return -1;
        if (bStarted && !aStarted) return 1;
        return a.category.localeCompare(b.category);
      });

    const recentlyCounted = recentRecords.map((r) => ({
      id: r.id,
      display_name: (r.fields.display_name as string) || "",
      current_stock: (r.fields.current_stock as number) || 0,
      counted_date: (r.fields.counted_date as string) || null,
    }));

    return Response.json({
      counted: totalCounted,
      total: inScope.length,
      categories,
      recentlyCounted,
    });
  } catch (err) {
    console.error("Progress fetch error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch progress",
      },
      { status: 500 }
    );
  }
}
