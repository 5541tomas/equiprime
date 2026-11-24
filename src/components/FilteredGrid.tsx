"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { GROUPS, PRICE_RANGES, effectivePrice, productOptions, sortValues } from "@/lib/facets";
import ProductCard from "./ProductCard";
import SortSelect from "./SortSelect";
import { IconX } from "./icons";

type Sel = Record<string, string[]>; // "marca", "preco", "Tamanho", "Cor", …

const PARAM: Record<string, string> = { marca: "marca", preco: "preco", Tamanho: "tamanho", Cor: "cor", Grip: "grip", Sabor: "sabor", Modalidade: "modalidade" };

export default function FilteredGrid({ products, sort, hideBrand }: { products: Product[]; sort?: string; hideBrand?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [panel, setPanel] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const LIMIT = 12;

  // opções de cada produto calculadas uma vez
  const enriched = useMemo(() => products.map((p) => ({ p, opts: productOptions(p), price: effectivePrice(p) })), [products]);

  const sel: Sel = useMemo(() => {
    const s: Sel = {};
    for (const [k, q] of Object.entries(PARAM)) { const v = params.get(q); if (v) s[k] = v.split("|"); }
    return s;
  }, [params]);

  const facets = useMemo(() => {
    const brandCount = new Map<string, number>();
    const groups: Record<string, Map<string, number>> = {};
    for (const { p, opts } of enriched) {
      if (p.brands?.title) brandCount.set(p.brands.title, (brandCount.get(p.brands.title) ?? 0) + 1);
      for (const [g, vals] of Object.entries(opts)) for (const v of vals) {
        (groups[g] ??= new Map()).set(v, (groups[g].get(v) ?? 0) + 1);
      }
    }
    const priceCount = PRICE_RANGES.map((r) => ({ ...r, n: enriched.filter((e) => e.price >= r.min && e.price < r.max).length }));
    return { brandCount, groups, priceCount };
  }, [enriched]);

  const visible = useMemo(() => enriched.filter(({ p, opts, price }) => {
    if (sel.marca?.length && !sel.marca.includes(p.brands?.title ?? "")) return false;
    if (sel.preco?.length && !sel.preco.some((k) => { const r = PRICE_RANGES.find((x) => x.key === k); return r && price >= r.min && price < r.max; })) return false;
    for (const g of GROUPS) {
      if (sel[g]?.length && !sel[g].some((v) => opts[g]?.has(v))) return false;
    }
    return true;
  }).map((e) => e.p), [enriched, sel]);

  const update = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());
    const name = PARAM[key];
    if (value === null) q.delete(name);
    else {
      const cur = new Set(sel[key] ?? []);
      if (cur.has(value)) cur.delete(value); else cur.add(value);
      if (cur.size) q.set(name, [...cur].join("|")); else q.delete(name);
    }
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const clearAll = () => {
    const q = new URLSearchParams(params.toString());
    Object.values(PARAM).forEach((n) => q.delete(n));
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const activeCount = Object.values(sel).reduce((n, v) => n + v.length, 0);

  const sections: { key: string; title: string; items: { value: string; label: string; n: number }[]; chips?: boolean }[] = [];
  if (!hideBrand && facets.brandCount.size > 1)
    sections.push({ key: "marca", title: "Marca", items: [...facets.brandCount].sort((a, b) => a[0].localeCompare(b[0], "pt")).map(([v, n]) => ({ value: v, label: v, n })) });
  for (const g of GROUPS) {
    const m = facets.groups[g];
    if (m && m.size > 1)
      sections.push({ key: g, title: g, chips: g === "Tamanho", items: sortValues(g, [...m.keys()]).map((v) => ({ value: v, label: v, n: m.get(v)! })) });
  }
  if (facets.priceCount.filter((r) => r.n).length > 1)
    sections.push({ key: "preco", title: "Preço", items: facets.priceCount.filter((r) => r.n).map((r) => ({ value: r.key, label: r.label, n: r.n })) });

  const Filters = (
    <div className="space-y-6">
      {sections.map((s) => (
        <fieldset key={s.key}>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{s.title}</legend>
          {s.chips ? (
            <div className="flex flex-wrap gap-1.5">
              {(expanded.has(s.key) ? s.items : s.items.filter((it, i) => i < LIMIT || sel[s.key]?.includes(it.value))).map((it) => {
                const on = sel[s.key]?.includes(it.value);
                return (
                  <button key={it.value} type="button" onClick={() => update(s.key, it.value)} aria-pressed={!!on}
                    className={`min-w-10 rounded-full border px-3 py-1.5 text-xs ${on ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"}`}>
                    {it.label}
                  </button>
                );
              })}
              {s.items.length > LIMIT && (
                <button type="button" onClick={() => setExpanded((e) => { const n = new Set(e); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n; })}
                  className="px-2 py-1.5 text-xs font-semibold underline">
                  {expanded.has(s.key) ? "Mostrar menos" : `Ver todos (${s.items.length})`}
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {s.items.map((it) => (
                <label key={it.value} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                  <input type="checkbox" className="accent-[#141414]" checked={!!sel[s.key]?.includes(it.value)} onChange={() => update(s.key, it.value)} />
                  <span className="flex-1">{it.label}</span>
                  <span className="text-xs text-muted">{it.n}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {activeCount > 0 && <button onClick={clearAll} className="text-sm underline">Limpar filtros</button>}
    </div>
  );

  return (
    <div className={sections.length ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-10" : ""}>
      {sections.length > 0 && <aside className="hidden lg:block">{Filters}</aside>}

      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            {sections.length > 0 && (
              <button onClick={() => setPanel(true)} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm lg:hidden">
                Filtros{activeCount > 0 && ` (${activeCount})`}
              </button>
            )}
            <p className="text-sm text-muted">{visible.length} {visible.length === 1 ? "produto" : "produtos"}</p>
          </div>
          <SortSelect value={sort ?? "relevancia"} />
        </div>

        {activeCount > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(sel).flatMap(([k, vals]) => vals.map((v) => (
              <button key={k + v} onClick={() => update(k, v)} className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-xs">
                {k === "preco" ? PRICE_RANGES.find((r) => r.key === v)?.label : v} <IconX size={12} />
              </button>
            )))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted">Nenhum produto com estes filtros.</p>
            {activeCount > 0 && <button onClick={clearAll} className="btn-outline mt-4">Limpar filtros</button>}
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 ${sections.length ? "" : "lg:grid-cols-4"}`}>
            {visible.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
          </div>
        )}
      </div>

      {panel && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Filtros">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanel(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-line p-5">
              <p className="font-serif text-2xl">Filtros</p>
              <button onClick={() => setPanel(false)} aria-label="Fechar filtros"><IconX /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{Filters}</div>
            <div className="border-t border-line p-5">
              <button onClick={() => setPanel(false)} className="btn w-full">Ver {visible.length} {visible.length === 1 ? "produto" : "produtos"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
