"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/supabase";

type Item = { product_id: number; title: string; slug: string; image: string | null; done: boolean };

/** Página do link enviado por WhatsApp: avaliar os produtos de uma encomenda, sem conta. */
function Avaliar() {
  const token = useSearchParams().get("t") ?? "";
  const [data, setData] = useState<{ name: string; items: Item[] } | null | undefined>(undefined);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "err">("idle");

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setData(null); return; }
    db().rpc("get_review_order", { p_token: token }).then(({ data, error }) => setData(error || !data ? null : data));
  }, [token]);

  if (data === undefined) return <div className="py-32 text-center text-muted">A carregar…</div>;
  if (data === null || !data.items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Link de avaliação inválido</h1>
        <p className="mt-3 text-muted">Este link pode ter expirado. Se precisar, fale connosco por WhatsApp.</p>
        <Link href="/" className="btn mt-8">Ir para a loja</Link>
      </div>
    );
  }

  const pending = data.items.filter((i) => !i.done);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reviews = pending.filter((i) => ratings[i.product_id]).map((i) => ({ product_id: i.product_id, rating: ratings[i.product_id], comment: comments[i.product_id] ?? "" }));
    if (!reviews.length) return;
    setState("sending");
    const { error } = await db().rpc("submit_order_reviews", { p_token: token, p_reviews: reviews });
    setState(error ? "err" : "sent");
  };

  if (state === "sent" || !pending.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">🐴</p>
        <h1 className="mt-4 font-serif text-4xl">Obrigado{data.name ? `, ${data.name}` : ""}!</h1>
        <p className="mt-3 text-muted">A sua opinião ajuda outros cavaleiros a escolher. Publicamos a avaliação depois de a revermos.</p>
        <Link href="/" className="btn mt-8">Voltar à loja</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="eyebrow">A sua opinião</p>
      <h1 className="mt-2 font-serif text-4xl">Olá{data.name ? ` ${data.name}` : ""}! Como correu?</h1>
      <p className="mt-2 text-muted">Avalie os produtos que comprou. Só leva um minuto.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {pending.map((i) => (
          <div key={i.product_id} className="card p-5">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ivory">
                {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain" />}
              </div>
              <p className="font-medium">{i.title}</p>
            </div>
            <div className="mt-4 flex gap-1 text-3xl" role="radiogroup" aria-label={`Nota para ${i.title}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={ratings[i.product_id] === n} aria-label={`${n} estrelas`}
                  onClick={() => setRatings({ ...ratings, [i.product_id]: n })}
                  className={n <= (ratings[i.product_id] ?? 0) ? "text-leather" : "text-line"}>★</button>
              ))}
            </div>
            {ratings[i.product_id] && (
              <textarea className="input mt-3 min-h-20" maxLength={1500} placeholder="Conte-nos o que achou (opcional)"
                value={comments[i.product_id] ?? ""} onChange={(e) => setComments({ ...comments, [i.product_id]: e.target.value })} />
            )}
          </div>
        ))}
        <button className="btn w-full" disabled={state === "sending" || !Object.keys(ratings).length}>
          {state === "sending" ? "A enviar…" : "Enviar avaliação"}
        </button>
        {state === "err" && <p className="text-sm text-danger">Não foi possível enviar. Tente novamente.</p>}
      </form>
    </div>
  );
}

export default function Page() {
  return <Suspense><Avaliar /></Suspense>;
}
