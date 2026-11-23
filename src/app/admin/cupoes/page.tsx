"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";

type C = { code: string; kind: "percent" | "fixed" | "free_shipping"; value: number; min_total: number; max_uses: number | null; uses: number; expires_at: string | null; active: boolean; b2c_only: boolean };
const KIND = { percent: "% desconto", fixed: "€ desconto", free_shipping: "Portes grátis" };

export default function AdminCoupons() {
  const [list, setList] = useState<C[]>([]);
  const [n, setN] = useState({ code: "", kind: "percent" as C["kind"], value: "10", min_total: "0", max_uses: "", expires_at: "", b2c_only: true });
  const [err, setErr] = useState("");
  const load = () => db().from("coupons").select("*").order("code").then(({ data }) => setList((data ?? []) as C[]));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const { error } = await db().from("coupons").insert({
      code: n.code.trim().toUpperCase(), kind: n.kind, value: Number(n.value || 0), min_total: Number(n.min_total || 0),
      max_uses: n.max_uses ? Number(n.max_uses) : null, expires_at: n.expires_at ? new Date(n.expires_at + "T23:59:59").toISOString() : null, b2c_only: n.b2c_only,
    });
    if (error) setErr(error.code === "23505" ? "Esse código já existe." : error.message);
    else { setN({ ...n, code: "" }); load(); }
  };
  const toggle = async (c: C) => { await db().from("coupons").update({ active: !c.active }).eq("code", c.code); load(); };
  const del = async (c: C) => { if (confirm(`Apagar o cupão ${c.code}?`)) { await db().from("coupons").delete().eq("code", c.code); load(); } };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
      <form onSubmit={create} className="card h-fit space-y-4 p-6">
        <p className="font-semibold">Novo cupão</p>
        <div><label className="label">Código</label><input className="input uppercase" required value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} placeholder="NATAL10" /></div>
        <div><label className="label">Tipo</label>
          <select className="input" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as C["kind"] })}>
            {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        {n.kind !== "free_shipping" && <div><label className="label">Valor {n.kind === "percent" ? "(%)" : "(€)"}</label><input className="input" inputMode="decimal" value={n.value} onChange={(e) => setN({ ...n, value: e.target.value })} /></div>}
        <div><label className="label">Compra mínima (€)</label><input className="input" inputMode="decimal" value={n.min_total} onChange={(e) => setN({ ...n, min_total: e.target.value })} /></div>
        <div><label className="label">Limite de utilizações (vazio = sem limite)</label><input className="input" inputMode="numeric" value={n.max_uses} onChange={(e) => setN({ ...n, max_uses: e.target.value })} /></div>
        <div><label className="label">Válido até (opcional)</label><input className="input" type="date" value={n.expires_at} onChange={(e) => setN({ ...n, expires_at: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={n.b2c_only} onChange={(e) => setN({ ...n, b2c_only: e.target.checked })} /> Só para clientes particulares</label>
        <button className="btn w-full">Criar cupão</button>
        {err && <p className="text-sm text-danger">{err}</p>}
      </form>
      <div className="card divide-y divide-line">
        {list.length === 0 && <p className="p-6 text-muted">Ainda não há cupões.</p>}
        {list.map((c) => (
          <div key={c.code} className="flex flex-wrap items-center gap-4 p-4 text-sm">
            <span className="font-mono font-semibold">{c.code}</span>
            <span>{c.kind === "percent" ? `${c.value}%` : c.kind === "fixed" ? euro(c.value) : "Portes grátis"}</span>
            <span className="text-muted">{c.min_total > 0 && `mín. ${euro(c.min_total)} · `}{c.uses}{c.max_uses ? `/${c.max_uses}` : ""} usos{c.expires_at && ` · até ${new Date(c.expires_at).toLocaleDateString("pt-PT")}`}</span>
            <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={c.active} onChange={() => toggle(c)} /> Ativo</label>
            <button onClick={() => del(c)} className="text-danger">Apagar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
