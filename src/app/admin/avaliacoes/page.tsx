"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";

type R = { id: number; author_name: string; rating: number; comment: string; approved: boolean; created_at: string; products: { title: string; slug: string } | null };

export default function AdminReviews() {
  const [list, setList] = useState<R[]>([]);
  const load = () => db().from("reviews").select("id,author_name,rating,comment,approved,created_at,products(title,slug)").order("approved").order("created_at", { ascending: false })
    .then(({ data }) => setList((data ?? []) as unknown as R[]));
  useEffect(() => { load(); }, []);
  const approve = async (r: R, v: boolean) => { await db().from("reviews").update({ approved: v }).eq("id", r.id); load(); };
  const del = async (r: R) => { if (confirm("Apagar esta avaliação?")) { await db().from("reviews").delete().eq("id", r.id); load(); } };

  return (
    <div className="card divide-y divide-line">
      {list.length === 0 && <p className="p-6 text-muted">Sem avaliações.</p>}
      {list.map((r) => (
        <div key={r.id} className="flex flex-wrap items-start gap-4 p-4 text-sm">
          <div className="flex-1">
            <p><span className="text-leather">{"★".repeat(r.rating)}</span> <strong>{r.author_name}</strong> sobre{" "}
              {r.products && <Link href={`/product/${r.products.slug}`} className="underline" target="_blank">{r.products.title}</Link>}</p>
            {r.comment && <p className="mt-1 text-ink/85">{r.comment}</p>}
            <p className="mt-1 text-xs text-muted">{new Date(r.created_at).toLocaleString("pt-PT")}</p>
          </div>
          {r.approved ? (
            <button onClick={() => approve(r, false)} className="btn-outline px-4 py-2">Esconder</button>
          ) : (
            <button onClick={() => approve(r, true)} className="btn px-4 py-2">Publicar</button>
          )}
          <button onClick={() => del(r)} className="py-2 text-danger">Apagar</button>
        </div>
      ))}
    </div>
  );
}
