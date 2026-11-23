"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { db } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import Price from "@/components/Price";
import WishlistButton from "@/components/WishlistButton";

export default function WishlistPage() {
  const { ready, session, wishlist } = useStore();
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!session) return;
    const ids = [...wishlist];
    if (!ids.length) { setItems([]); return; }
    db().from("products").select("id,slug,title,price,price_promo,images").in("id", ids)
      .then(({ data }) => setItems((data ?? []) as Product[]));
  }, [session, wishlist]);

  if (!ready) return <div className="py-32" />;
  if (!session) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">Lista de desejos</h1>
      <p className="mt-4 text-muted">Entre na sua conta para guardar os seus produtos favoritos.</p>
      <Link href="/conta" className="btn mt-8">Entrar</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link href="/conta" className="text-sm text-muted hover:text-ink">← A minha conta</Link>
      <h1 className="mt-2 font-serif text-5xl">Lista de desejos</h1>
      {items === null ? <p className="mt-8 text-muted">A carregar…</p> : items.length === 0 ? (
        <p className="mt-8 text-muted">Ainda não guardou nenhum produto. Toque no ♡ de um produto para o guardar aqui.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <Link href={`/product/${p.slug}`}>
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
                  {p.images?.[0] && <Image src={p.images[0].url} alt={p.title} fill sizes="25vw" className="object-contain p-3" />}
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-medium">{p.title}</p>
                <Price productId={p.id} price={p.price} promo={p.price_promo} className="mt-1 text-sm" />
              </Link>
              <WishlistButton productId={p.id} className="absolute right-3 top-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
