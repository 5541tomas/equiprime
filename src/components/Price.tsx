"use client";

import { useEffect, useState } from "react";
import { useStore, wkey } from "@/lib/store";
import { euro } from "@/lib/format";

/** Mostra o preço B2C, ou o preço de revenda (sem IVA) para revendedores aprovados. */
export default function Price({
  productId, variantId = null, price, promo, className = "", large,
}: { productId: number; variantId?: number | null; price: number; promo: number | null; className?: string; large?: boolean }) {
  const { isB2B, wholesale } = useStore();
  const [b2b, setB2b] = useState<number | null>(null);

  useEffect(() => {
    if (!isB2B) { setB2b(null); return; }
    wholesale([productId]).then((m) => setB2b(m.get(wkey(productId, variantId)) ?? m.get(wkey(productId, null)) ?? null));
  }, [isB2B, productId, variantId, wholesale]);

  if (isB2B && b2b != null) {
    return (
      <p className={className}>
        <span className={`font-semibold ${large ? "text-2xl" : ""}`}>{euro(b2b)}</span>
        <span className="ml-1.5 text-xs text-muted">s/ IVA · revenda</span>
      </p>
    );
  }
  const hasPromo = promo != null && Number(promo) < Number(price);
  return (
    <p className={className}>
      <span className={`font-semibold ${large ? "text-2xl" : ""} ${hasPromo ? "text-leather" : ""}`}>{euro(hasPromo ? promo : price)}</span>
      {hasPromo && <span className="ml-2 text-muted line-through">{euro(price)}</span>}
    </p>
  );
}
