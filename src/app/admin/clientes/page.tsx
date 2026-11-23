"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import type { Profile } from "@/lib/store";

const B2B = { none: "—", pending: "Pedido pendente", approved: "Revenda aprovada", rejected: "Recusado" };

export default function AdminClients() {
  const [list, setList] = useState<(Profile & { created_at: string })[]>([]);
  const [q, setQ] = useState("");
  const load = () => db().from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as (Profile & { created_at: string })[]));
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, b2b_status: string) => { await db().from("profiles").update({ b2b_status }).eq("id", id); load(); };

  const pending = list.filter((p) => p.b2b_status === "pending");
  const shown = useMemo(() => list.filter((p) => `${p.name} ${p.email} ${p.company} ${p.nif}`.toLowerCase().includes(q.toLowerCase())), [list, q]);

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Pedidos de revenda ({pending.length})</h2>
          <div className="card divide-y divide-line">
            {pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 p-4 text-sm">
                <div className="flex-1"><p className="font-medium">{p.company} · NIF {p.nif}</p><p className="text-muted">{p.name} · {p.email} · {p.phone}</p></div>
                <button className="btn px-4 py-2" onClick={() => setStatus(p.id, "approved")}>Aprovar</button>
                <button className="text-danger" onClick={() => setStatus(p.id, "rejected")}>Recusar</button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-semibold">Clientes ({list.length})</h2>
          <input className="input ml-auto max-w-xs" placeholder="Pesquisar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card divide-y divide-line">
          {shown.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 p-4 text-sm">
              <div className="flex-1"><p className="font-medium">{p.name || "—"}{p.is_admin && " (admin)"}</p><p className="text-muted">{p.email}{p.phone && ` · ${p.phone}`}{p.company && ` · ${p.company}`}</p></div>
              <select className="input w-auto" value={p.b2b_status} onChange={(e) => setStatus(p.id, e.target.value)}>
                {Object.entries(B2B).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
