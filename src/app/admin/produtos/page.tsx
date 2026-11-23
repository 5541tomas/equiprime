"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import type { Product } from "@/lib/types";

type Row = Product & { variants: { id: number; stock: number | null }[] };

export default function AdminProducts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"todos" | "ativos" | "inativos">("todos");

  useEffect(() => {
    db().from("products").select("id,slug,title,price,price_promo,images,active,featured,is_new,brands(title),variants(id,stock)")
      .order("title").then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, []);

  const list = useMemo(() => rows.filter((r) =>
    (show === "todos" || (show === "ativos") === r.active) &&
    r.title.toLowerCase().includes(q.toLowerCase())
  ), [rows, q, show]);

  const toggle = async (id: number, field: "active" | "featured", value: boolean) => {
    await db().from("products").update({ [field]: value }).eq("id", id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Pesquisar produto…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
          <option value="todos">Todos</option><option value="ativos">Visíveis</option><option value="inativos">Escondidos</option>
        </select>
        <span className="text-sm text-muted">{list.length} produtos</span>
        <Link href="/admin/produtos/novo" className="btn ml-auto">+ Novo produto</Link>
      </div>
      <div className="card divide-y divide-line">
        {list.map((r) => {
          const stock = r.variants.some((v) => v.stock == null) ? null : r.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
          return (
            <div key={r.id} className="flex items-center gap-4 p-3 text-sm">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ivory">
                {r.images?.[0] && <Image src={r.images[0].url} alt="" fill sizes="48px" className="object-contain" />}
              </div>
              <Link href={`/admin/produtos/${r.id}`} className="flex-1 font-medium hover:underline">
                {r.title}
                <span className="block text-xs font-normal text-muted">{r.brands?.title ?? "—"} · {r.variants.length} variantes{stock != null && ` · stock ${stock}`}</span>
              </Link>
              <span className="w-24 text-right">{r.price_promo ? <><span className="text-leather">{euro(r.price_promo)}</span></> : euro(r.price)}</span>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.featured} onChange={(e) => toggle(r.id, "featured", e.target.checked)} /> Destaque</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.active} onChange={(e) => toggle(r.id, "active", e.target.checked)} /> Visível</label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
