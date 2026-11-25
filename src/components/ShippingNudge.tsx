"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { euro } from "@/lib/format";
import type { SearchIndex, SearchProduct } from "@/lib/search";
import { isVoucherSlug } from "@/lib/voucher";

let cache: Promise<SearchIndex> | null = null;
const loadIndex = () => (cache ??= fetch("/api/search-index").then((r) => r.json()).catch(() => { cache = null; return { products: [], categories: [], brands: [] }; }));
const EXTRA = /Likits|Meias|Luvas|Champô|Crina e Pelo|Cascos|Couro/;
const price = (p: SearchProduct) => (p.price_promo != null && p.price_promo < p.price ? p.price_promo : p.price);

/** No carrinho: quando falta pouco para os portes grátis, sugere artigos que completam o valor. */
export default function ShippingNudge({ missing, onNavigate }: { missing: number; onNavigate: () => void }) {
  const { cart, addToCart } = useStore();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  useEffect(() => { loadIndex().then(setIndex); }, []);
  if (!index || missing <= 0 || missing > 40) return null;

  const inCart = new Set(cart.map((i) => i.product_id));
  const picks = index.products
    .filter((p) => !inCart.has(p.id) && p.image && !isVoucherSlug(p.slug) && price(p) >= missing && price(p) <= missing + 20)
    // primeiro os "extras" que fazem sentido juntar a qualquer compra (mimos, meias, luvas, cuidados)
    .sort((a, b) => Number(EXTRA.test(b.cats)) - Number(EXTRA.test(a.cats)) || price(a) - price(b))
    .slice(0, 3);
  if (!picks.length) return null;

  return (
    <div className="border-b border-line px-5 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Complete e ganhe portes grátis</p>
      <ul className="space-y-2">
        {picks.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Link href={`/product/${p.slug}`} onClick={onNavigate} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
              {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain" />}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm">{p.title}</p>
              <p className="text-xs font-semibold">{euro(price(p))}</p>
            </div>
            {p.variants === 0 ? (
              <button
                onClick={() => addToCart({ product_id: p.id, variant_id: null, slug: p.slug, title: p.title, variant: null, image: p.image, unit_price: price(p), qty: 1 })}
                className="rounded-full border border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink hover:text-ivory">+ Juntar</button>
            ) : (
              <Link href={`/product/${p.slug}`} onClick={onNavigate} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">Escolher</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
