"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { db } from "@/lib/supabase";

type R = { id: number; author_name: string; rating: number; comment: string; created_at: string };

const Stars = ({ n }: { n: number }) => (
  <span className="text-leather" aria-label={`${n} de 5 estrelas`}>{"★".repeat(n)}<span className="text-line">{"★".repeat(5 - n)}</span></span>
);

export default function Reviews({ productId, reviews }: { productId: number; reviews: R[] }) {
  const { session, profile } = useStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "err">("idle");
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setState("sending");
    const { error } = await db().from("reviews").insert({
      product_id: productId, user_id: session.user.id, rating, comment: comment.trim(),
      author_name: (profile?.name || session.user.email?.split("@")[0] || "Cliente").split(" ")[0],
    });
    setState(error ? "err" : "sent");
  };

  return (
    <section id="avaliacoes" className="mt-20 grid gap-10 border-t border-line pt-12 lg:grid-cols-[1fr_2fr]">
      <div>
        <h2 className="font-serif text-3xl">Avaliações</h2>
        {reviews.length > 0 ? (
          <p className="mt-2 text-lg"><Stars n={Math.round(avg)} /> <span className="text-sm text-muted">{avg.toFixed(1)} · {reviews.length}</span></p>
        ) : (
          <p className="mt-2 text-sm text-muted">Ainda sem avaliações. Seja o primeiro!</p>
        )}

        <div className="mt-6">
          {!session ? (
            <p className="text-sm"><Link href="/conta" className="underline">Entre na sua conta</Link> para avaliar este produto.</p>
          ) : state === "sent" ? (
            <p className="text-sm text-ok">Obrigado! A sua avaliação será publicada após revisão.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <span className="label">A sua nota</span>
                <div className="flex gap-1 text-2xl" role="radiogroup" aria-label="Nota">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrelas`}
                      onClick={() => setRating(n)} className={n <= rating ? "text-leather" : "text-line"}>★</button>
                  ))}
                </div>
              </div>
              <textarea className="input min-h-24" placeholder="O que achou do produto?" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1500} />
              <button className="btn" disabled={state === "sending"}>Enviar avaliação</button>
              {state === "err" && <p className="text-sm text-danger">Não foi possível enviar. Tente novamente.</p>}
            </form>
          )}
        </div>
      </div>

      <ul className="space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-line pb-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.author_name}</p>
              <p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString("pt-PT")}</p>
            </div>
            <Stars n={r.rating} />
            {r.comment && <p className="mt-2 text-sm text-ink/85">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
