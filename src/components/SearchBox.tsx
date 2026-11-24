"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { search, type SearchIndex } from "@/lib/search";
import { euro } from "@/lib/format";
import { IconSearch, IconX } from "./icons";

// o índice é carregado uma só vez por visita, na primeira vez que se toca na pesquisa
let indexPromise: Promise<SearchIndex> | null = null;
const loadIndex = () => (indexPromise ??= fetch("/api/search-index").then((r) => r.json()).catch(() => { indexPromise = null; return { products: [], categories: [], brands: [] }; }));

type Item = { href: string; key: string };

export default function SearchBox({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile"; onNavigate?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);

  const warm = () => { if (!index) loadIndex().then(setIndex); };

  const res = useMemo(
    () => (index && q.trim().length >= 2 ? search(index, q, { products: 6, categories: 4, brands: 3 }) : null),
    [index, q]
  );

  // lista plana para navegar com as setas
  const items: Item[] = useMemo(() => {
    if (!res) return [];
    return [
      ...res.categories.map((c) => ({ href: `/category/${c.slug}`, key: `c-${c.slug}` })),
      ...res.brands.map((b) => ({ href: `/brand/${b.slug}`, key: `b-${b.slug}` })),
      ...res.products.map((p) => ({ href: `/product/${p.slug}`, key: `p-${p.slug}` })),
    ];
  }, [res]);

  useEffect(() => setActive(-1), [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (href: string) => { setOpen(false); setQ(""); onNavigate?.(); router.push(href); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].href);
    if (q.trim()) go(`/catalog?q=${encodeURIComponent(q.trim())}`);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const showPanel = open && q.trim().length >= 2;
  const isActive = (key: string) => active >= 0 && items[active]?.key === key;
  const row = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm";
  const rowCls = (key: string) => `${row} ${isActive(key) ? "bg-sand" : "hover:bg-sand"}`;

  return (
    <div ref={wrap} className={`relative ${variant === "desktop" ? "hidden md:block" : "w-full"}`}>
      <form onSubmit={submit} role="search" className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { warm(); setOpen(true); }}
          onMouseEnter={warm}
          onKeyDown={onKey}
          placeholder={variant === "desktop" ? "Pesquisar…" : "Pesquisar produtos, marcas, categorias…"}
          aria-label="Pesquisar"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-${items[active]?.key}` : undefined}
          autoComplete="off"
          className={`input rounded-full pl-9 pr-8 ${variant === "desktop" ? "w-44 xl:w-60 focus:w-72 xl:focus:w-80 transition-[width]" : ""}`}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IconSearch size={16} /></span>
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Limpar pesquisa">
            <IconX size={16} />
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id={`${id}-list`}
          role="listbox"
          className={`z-50 mt-2 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-xl ${
            variant === "desktop" ? "absolute right-0 top-full max-h-[70vh] w-[26rem]" : "max-h-[60vh] w-full"
          }`}
        >
          {!index ? (
            <p className="px-3 py-4 text-sm text-muted">A carregar…</p>
          ) : !res || res.total + res.categories.length + res.brands.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">Sem resultados para “{q}”. Experimente outra palavra.</p>
          ) : (
            <>
              {res.categories.length > 0 && (
                <Section title="Categorias">
                  {res.categories.map((c) => (
                    <Link key={c.slug} id={`${id}-c-${c.slug}`} role="option" aria-selected={isActive(`c-${c.slug}`)}
                      href={`/category/${c.slug}`} onClick={(e) => { e.preventDefault(); go(`/category/${c.slug}`); }} className={rowCls(`c-${c.slug}`)}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand text-xs">▦</span>
                      <span><span className="font-medium">{c.title}</span>{c.parent && <span className="block text-xs text-muted">em {c.parent}</span>}</span>
                    </Link>
                  ))}
                </Section>
              )}
              {res.brands.length > 0 && (
                <Section title="Marcas">
                  {res.brands.map((b) => (
                    <Link key={b.slug} id={`${id}-b-${b.slug}`} role="option" aria-selected={isActive(`b-${b.slug}`)}
                      href={`/brand/${b.slug}`} onClick={(e) => { e.preventDefault(); go(`/brand/${b.slug}`); }} className={rowCls(`b-${b.slug}`)}>
                      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                        {b.logo ? <Image src={b.logo} alt="" fill sizes="32px" className="object-contain p-0.5" /> : <span className="text-xs">{b.title[0]}</span>}
                      </span>
                      <span className="font-medium">{b.title}</span>
                    </Link>
                  ))}
                </Section>
              )}
              {res.products.length > 0 && (
                <Section title="Produtos">
                  {res.products.map((p) => {
                    const promo = p.price_promo != null && p.price_promo < p.price;
                    return (
                      <Link key={p.slug} id={`${id}-p-${p.slug}`} role="option" aria-selected={isActive(`p-${p.slug}`)}
                        href={`/product/${p.slug}`} onClick={(e) => { e.preventDefault(); go(`/product/${p.slug}`); }} className={rowCls(`p-${p.slug}`)}>
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ivory">
                          {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-contain" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-medium">{p.title}</span>
                          {p.brand && <span className="block text-xs text-muted">{p.brand}</span>}
                        </span>
                        <span className={`shrink-0 text-sm font-semibold ${promo ? "text-leather" : ""}`}>{euro(promo ? p.price_promo : p.price)}</span>
                      </Link>
                    );
                  })}
                </Section>
              )}
              <button type="button" onClick={() => go(`/catalog?q=${encodeURIComponent(q.trim())}`)}
                className="mt-1 w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-ivory hover:bg-leather-dark">
                Ver todos os resultados ({res.total} {res.total === 1 ? "produto" : "produtos"})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      {children}
    </div>
  );
}
