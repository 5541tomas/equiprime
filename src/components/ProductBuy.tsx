"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, wkey } from "@/lib/store";
import type { Variant } from "@/lib/types";
import { STORE } from "@/lib/config";
import Price from "./Price";
import QtyInput from "./QtyInput";
import WishlistButton from "./WishlistButton";
import SizeGuide from "./SizeGuide";
import { IconWhatsApp } from "./icons";

type P = { id: number; slug: string; title: string; price: number; price_promo: number | null; image: string | null };

export default function ProductBuy({ product, variants }: { product: P; variants: Variant[] }) {
  const { addToCart, isB2B, wholesale } = useStore();
  const hasVariants = variants.length > 0;
  const firstAvailable = variants.find((v) => v.stock == null || v.stock > 0) ?? null;
  const [vid, setVid] = useState<number | null>(variants.length === 1 ? variants[0].id : null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");

  // grupos de opções (ex.: Cor, Tamanho) a partir das variantes
  const groups = useMemo(() => {
    const names: string[] = [];
    for (const x of variants) for (const k of Object.keys(x.options ?? {})) if (!names.includes(k)) names.push(k);
    return names.map((name) => ({ name, values: [...new Set(variants.map((x) => x.options?.[name]).filter(Boolean) as string[])] }));
  }, [variants]);
  const [sel, setSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.filter((g) => g.values.length === 1).map((g) => [g.name, g.values[0]])));
  const complete = groups.length > 0 && groups.every((g) => sel[g.name]);
  const pick = (name: string, val: string) => {
    const next = { ...sel, [name]: val };
    setSel(next);
    if (groups.every((g) => next[g.name])) {
      const m = variants.find((x) => groups.every((g) => x.options?.[g.name] === next[g.name]));
      setVid(m?.id ?? null);
    } else setVid(null);
  };

  const v = variants.find((x) => x.id === vid) ?? null;

  const price = Number(v?.price ?? product.price);
  const promo = v ? (v.price_promo ?? (v.price == null ? product.price_promo : null)) : product.price_promo;
  const soldOut = hasVariants ? !firstAvailable : false;
  const vSoldOut = v ? v.stock != null && v.stock <= 0 : false;
  const maxQty = v?.stock ?? 999;

  useEffect(() => { setQty(1); setErr(""); }, [vid]);

  const add = async () => {
    if (hasVariants && !v) {
      const missing = groups.find((g) => !sel[g.name]);
      setErr(missing ? `Escolha: ${missing.name.toLowerCase()}.` : complete ? "Combinação indisponível." : "Escolha uma opção.");
      return;
    }
    let unit = promo != null && Number(promo) < price ? Number(promo) : price;
    if (isB2B) {
      const m = await wholesale([product.id]);
      unit = m.get(wkey(product.id, v?.id ?? null)) ?? m.get(wkey(product.id, null)) ?? unit;
    }
    addToCart({
      product_id: product.id, variant_id: v?.id ?? null, slug: product.slug, title: product.title,
      variant: v?.title ?? null, image: v?.image_url ?? product.image, unit_price: unit, qty,
    });
  };

  const ask = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre o produto "${product.title}"${v ? ` (${v.title})` : ""}: ${STORE.url}/product/${product.slug}`)}`;

  return (
    <div className="mt-5">
      <Price productId={product.id} variantId={v?.id ?? null} price={price} promo={promo} large />
      {!isB2B && <p className="mt-1 text-xs text-muted">IVA incluído</p>}

      {groups.length > 0 && variants.length > 1 && groups.map((g) => (
        <fieldset key={g.name} className="mt-6">
          <legend className="label">{g.name}{sel[g.name] && <span className="ml-1 normal-case tracking-normal text-ink">: {sel[g.name]}</span>}</legend>
          {/^tamanho/i.test(g.name) && <SizeGuide productTitle={product.title} />}
          <div className="mt-2 flex flex-wrap gap-2">
            {g.values.map((val) => {
              // existe alguma variante disponível com este valor + as outras escolhas já feitas?
              const possible = variants.some((x) => x.options[g.name] === val && (x.stock == null || x.stock > 0) &&
                Object.entries(sel).every(([k, s]) => k === g.name || x.options[k] === s));
              const on = sel[g.name] === val;
              return (
                <button key={val} type="button" onClick={() => pick(g.name, val)} aria-pressed={on}
                  className={`min-w-12 rounded-full border px-4 py-2 text-sm transition ${on ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"} ${possible ? "" : "line-through opacity-40"}`}>
                  {val}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {hasVariants && groups.length > 0 && complete && !v && <p className="mt-3 text-sm text-danger">Combinação indisponível.</p>}

      {hasVariants && groups.length === 0 && variants.length > 1 && (
        <fieldset className="mt-6">
          <legend className="label">Opção{v && <span className="ml-1 normal-case tracking-normal text-ink">: {v.title}</span>}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((x) => {
              const out = x.stock != null && x.stock <= 0;
              return (
                <button key={x.id} type="button" disabled={out} onClick={() => setVid(x.id)} aria-pressed={x.id === vid}
                  className={`min-w-12 rounded-full border px-4 py-2 text-sm transition ${x.id === vid ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"} ${out ? "cursor-not-allowed line-through opacity-40" : ""}`}>
                  {x.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {v?.stock != null && v.stock > 0 && v.stock <= 3 && (
        <p className="mt-3 text-sm text-leather">Últimas {v.stock} unidades</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QtyInput value={qty} onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} max={maxQty} />
        <button className="btn flex-1" onClick={add} disabled={soldOut || vSoldOut}>
          {soldOut || vSoldOut ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-danger" role="alert">{err}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        <WishlistButton productId={product.id} label className="flex-1" />
        <a href={ask} target="_blank" rel="noopener" className="btn-outline flex-1"><IconWhatsApp size={18} /> Tenho uma dúvida</a>
      </div>
    </div>
  );
}
