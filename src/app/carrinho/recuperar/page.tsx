"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { adoptCartId, fetchSavedCart } from "@/lib/cartTracking";

/** Link enviado ao cliente para retomar um carrinho abandonado. */
function Recuperar() {
  const id = useSearchParams().get("c");
  const { replaceCart } = useStore();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "empty">("loading");

  useEffect(() => {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { setState("empty"); return; }
    fetchSavedCart(id).then((items) => {
      if (!items?.length) { setState("empty"); return; }
      adoptCartId(id);
      replaceCart(items.map((i) => ({ ...i, image: i.image ?? null, unit_price: Number(i.unit_price) })));
      router.replace("/checkout");
    });
  }, [id, replaceCart, router]);

  if (state === "loading") return <div className="py-32 text-center text-muted">A recuperar o seu carrinho…</div>;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">Este carrinho já não está disponível</h1>
      <p className="mt-3 text-muted">Pode já ter sido encomendado. Veja os nossos produtos ou fale connosco.</p>
      <Link href="/catalog" className="btn mt-8">Ver produtos</Link>
    </div>
  );
}

export default function Page() {
  return <Suspense><Recuperar /></Suspense>;
}
