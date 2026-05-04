"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ProductEditCard } from "@/components/inventory/product-edit-card";
import { CreateProductForm } from "@/components/inventory/create-product-form";
import type { InventoryProduct, InventoryProgress } from "@/lib/types";

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InventoryProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [progress, setProgress] = useState<InventoryProgress | null>(
    null
  );
  const [showAllCategories, setShowAllCategories] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/progress");
      if (res.ok) {
        setProgress(await res.json());
      }
    } catch {
      /* progress is non-critical */
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/inventory/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        /* search error handled gracefully */
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleProductSave(updated: InventoryProduct) {
    setResults((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    fetchProgress();
  }

  function handleCreated(record: {
    id: string;
    display_name: string;
  }) {
    setShowCreate(false);
    setQuery(record.display_name);
    fetchProgress();
  }

  const categories =
    progress?.categories
      .map((c) => c.category)
      .filter((c) => c !== "ไม่มีหมวดหมู่ (Uncategorized)") || [];
  const displayCategories = showAllCategories
    ? progress?.categories || []
    : (progress?.categories || []).slice(0, 5);
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.counted / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-5 pb-8">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">
          📦 นับสต็อก
        </h1>
        <p className="text-sm text-slate-400">Inventory Count</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
            setShowCreate(false);
          }}
          placeholder="🔍 ค้นหาสินค้า... (Search products)"
          className="w-full h-12 bg-surface text-white rounded-xl border border-slate-600 px-4 text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        {isSearching && (
          <div className="absolute right-3 top-3 animate-spin text-lg">
            ⏳
          </div>
        )}
      </div>

      {/* New Product button */}
      {!showCreate && (
        <button
          onClick={() => {
            setShowCreate(true);
            setSelectedId(null);
          }}
          className="w-full py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-sm transition-colors"
        >
          ➕ สินค้าใหม่ (New Product)
        </button>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateProductForm
          categories={categories}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Search Results */}
      {results.length > 0 && !showCreate && (
        <div className="space-y-2">
          {results.map((product) =>
            selectedId === product.id ? (
              <ProductEditCard
                key={product.id}
                product={product}
                onSave={handleProductSave}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <button
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                className="w-full bg-surface rounded-lg p-3 border border-slate-700 flex items-center gap-3 text-left hover:border-slate-500 transition-colors"
              >
                {product.photo_url ? (
                  <img
                    src={product.photo_url}
                    alt=""
                    className="w-10 h-10 rounded object-cover bg-surface-dark flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-surface-dark flex items-center justify-center text-slate-600 flex-shrink-0">
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {product.display_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {product.category}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-white">
                    {product.current_stock}
                  </div>
                  <div className="text-xs">
                    {product.has_been_counted ? (
                      <span className="text-emerald-400">
                        ✓ นับแล้ว
                      </span>
                    ) : (
                      <span className="text-slate-500">ยังไม่นับ</span>
                    )}
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      )}

      {/* No results */}
      {query.trim().length >= 2 &&
        !isSearching &&
        results.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-4">
            ไม่พบสินค้า (No products found)
          </div>
        )}

      {/* Progress */}
      {progress && (
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-3">
          <h2 className="text-sm font-semibold text-white">
            ── ความคืบหน้า (Progress) ──
          </h2>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">
                นับแล้ว: {progress.counted} / {progress.total}{" "}
                สินค้า
              </span>
              <span className="text-slate-400">{pct}%</span>
            </div>
            <div className="w-full h-3 bg-surface-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {progress.categories.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                หมวดหมู่:
              </div>
              {displayCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center gap-2 text-xs"
                >
                  <span>
                    {cat.counted === cat.total
                      ? "✅"
                      : cat.counted > 0
                        ? "🔄"
                        : "⬜"}
                  </span>
                  <span className="text-slate-300 flex-1 truncate">
                    {cat.category}
                  </span>
                  <span className="text-slate-500">
                    ({cat.counted}/{cat.total})
                  </span>
                </div>
              ))}
              {progress.categories.length > 5 && (
                <button
                  onClick={() =>
                    setShowAllCategories(!showAllCategories)
                  }
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  {showAllCategories
                    ? "แสดงน้อยลง ▲"
                    : `แสดงทั้งหมด (${progress.categories.length}) ▼`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recently Counted */}
      {progress && progress.recentlyCounted.length > 0 && (
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <h2 className="text-sm font-semibold text-white">
            ── ล่าสุดที่นับ (Recently Counted) ──
          </h2>
          {progress.recentlyCounted.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm py-1 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-slate-300 truncate flex-1">
                {item.display_name}
              </span>
              <span className="text-white ml-2 flex-shrink-0">
                {item.current_stock} ชิ้น
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Back to home */}
      <div className="text-center">
        <a
          href="/"
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          ◄ กลับหน้าแรก (Back to home)
        </a>
      </div>
    </div>
  );
}
