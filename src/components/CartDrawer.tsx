"use client";

import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { euro } from "@/lib/format";
import { STORE } from "@/lib/config";
import { IconX } from "./icons";
import QtyInput from "./QtyInput";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, isB2B } = useStore();
  if (!cartOpen) return null;
  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const missing = STORE.freeShippingFrom - subtotal;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Carrinho">
      <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-ivory shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-2xl">Carrinho</p>
          <button onClick={() => setCartOpen(false)} aria-label="Fechar carrinho"><IconX /></button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted">O seu carrinho está vazio.</p>
            <button className="btn-outline" onClick={() => setCartOpen(false)}>Continuar a comprar</button>
          </div>
        ) : (
          <>
            {!isB2B && (
              <div className="border-b border-line px-5 py-3 text-sm">
                {missing > 0 ? (
                  <>Faltam <strong>{euro(missing)}</strong> para portes grátis.</>
                ) : (
                  <span className="font-medium text-ok">Tem portes grátis!</span>
                )}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-leather" style={{ width: `${Math.min(100, (subtotal / STORE.freeShippingFrom) * 100)}%` }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.map((i) => (
                <li key={`${i.product_id}-${i.variant_id}`} className="flex gap-4 py-4">
                  <Link href={`/product/${i.slug}`} onClick={() => setCartOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                    {i.image && <Image src={i.image} alt={i.title} fill sizes="80px" className="object-contain" />}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-medium leading-snug">{i.title}</p>
                    {i.variant && <p className="text-xs text-muted">{i.variant}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QtyInput value={i.qty} onChange={(q) => setQty(i.product_id, i.variant_id, q)} small />
                      <p className="text-sm font-semibold">{euro(i.unit_price * i.qty)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-5">
              <div className="mb-4 flex justify-between text-base">
                <span>Subtotal{isB2B && " (s/ IVA)"}</span>
                <span className="font-semibold">{euro(subtotal)}</span>
              </div>
              <Link href="/checkout" onClick={() => setCartOpen(false)} className="btn w-full">Finalizar encomenda</Link>
              <p className="mt-3 text-center text-xs text-muted">A encomenda é confirmada consigo por WhatsApp.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
