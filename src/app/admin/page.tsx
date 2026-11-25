"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import type { Order } from "@/lib/types";
import { STATUSES, STATUS_LABEL } from "@/lib/status";
import { IconWhatsApp } from "@/components/icons";
import VoucherIssuer from "@/components/VoucherIssuer";
import { isVoucherSlug } from "@/lib/voucher";

const COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-900", confirmada: "bg-sky-100 text-sky-900", paga: "bg-emerald-100 text-emerald-900",
  enviada: "bg-indigo-100 text-indigo-900", concluida: "bg-stone-200 text-stone-800", cancelada: "bg-red-100 text-red-900",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("abertas");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    let q = db().from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "abertas") q = q.in("status", ["pendente", "confirmada", "paga"]);
    else if (filter !== "todas") q = q.eq("status", filter);
    const { data } = await q;
    setOrders((data ?? []) as Order[]);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const update = async (id: number, patch: Partial<Order>) => {
    await db().from("orders").update(patch).eq("id", id);
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const reviewWa = (o: Order) => {
    const phone = (o.customer.phone || "").replace(/\D/g, "");
    const intl = phone.length === 9 ? `351${phone}` : phone;
    const msg = `Olá ${o.customer.name?.split(" ")[0] ?? ""}! Esperamos que esteja a gostar da sua encomenda Equi Prime 🐴\n\n` +
      `Podia deixar-nos a sua opinião? Leva menos de um minuto e ajuda muito outros cavaleiros a escolher:\n` +
      `${window.location.origin}/avaliar?t=${o.review_token}\n\nObrigado!`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  };
  const wa = (o: Order) => {
    const phone = (o.customer.phone || "").replace(/\D/g, "");
    const intl = phone.length === 9 ? `351${phone}` : phone;
    return `https://wa.me/${intl}?text=${encodeURIComponent(`Olá ${o.customer.name?.split(" ")[0] ?? ""}! Sobre a sua encomenda #${o.id} na Equi Prime:`)}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {["abertas", ...STATUSES, "todas"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1.5 text-sm ${filter === s ? "border-ink bg-ink text-ivory" : "border-line bg-white"}`}>
            {s === "abertas" ? "Por tratar" : s === "todas" ? "Todas" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {orders.length === 0 ? <p className="py-16 text-center text-muted">Sem encomendas.</p> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card overflow-hidden">
              <button onClick={() => setOpen(open === o.id ? null : o.id)} className="grid w-full grid-cols-2 items-center gap-2 p-4 text-left text-sm sm:grid-cols-[80px_1fr_120px_110px_120px]">
                <span className="font-semibold">#{o.id}</span>
                <span className="truncate">{o.customer.name}{o.is_b2b && <span className="ml-2 rounded bg-leather px-1.5 py-0.5 text-[10px] font-semibold text-white">REVENDA</span>}</span>
                <span className="text-muted">{new Date(o.created_at).toLocaleDateString("pt-PT")}</span>
                <span className="font-semibold">{euro(o.total)}</span>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              </button>
              {open === o.id && (
                <div className="grid gap-6 border-t border-line bg-ivory p-5 text-sm md:grid-cols-2">
                  <div>
                    <p className="label">Artigos</p>
                    <ul className="space-y-1">
                      {o.items.map((i, k) => <li key={k}>{i.qty}× {i.title}{i.variant ? ` — ${i.variant}` : ""} <span className="text-muted">({euro(i.unit_price)})</span></li>)}
                    </ul>
                    <p className="mt-3">Subtotal {euro(o.subtotal)}{o.discount > 0 && ` · desconto −${euro(o.discount)} (${o.coupon_code})`} · envio {euro(o.shipping)}</p>
                    <p className="font-semibold">Total {euro(o.total)}{o.is_b2b && " + IVA"}</p>
                    {o.notes && <p className="mt-3 rounded-lg bg-white p-3"><strong>Notas do cliente:</strong> {o.notes}</p>}
                  </div>
                  <div>
                    <p className="label">Cliente</p>
                    <p>{o.customer.name} · {o.customer.phone}</p>
                    {o.customer.email && <p>{o.customer.email}</p>}
                    {o.customer.nif && <p>NIF {o.customer.nif}</p>}
                    <p className="mt-1">{o.items.every((i) => isVoucherSlug(i.slug)) ? "Vale digital (sem envio)" : o.delivery === "levantamento" ? "Levantamento" : `${o.customer.address}, ${o.customer.postal_code} ${o.customer.city}, ${o.customer.country}`}</p>
                    <a href={wa(o)} target="_blank" rel="noopener" className="btn-whatsapp mt-3 px-4 py-2"><IconWhatsApp size={16} /> Falar com o cliente</a>

                    <p className="label mt-5">Estado</p>
                    <select className="input" value={o.status} onChange={(e) => update(o.id, { status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    {o.review_token && ["confirmada", "paga", "enviada", "concluida"].includes(o.status) && !o.items.every((i) => isVoucherSlug(i.slug)) && (
                      <a href={reviewWa(o)} target="_blank" rel="noopener" className="btn-outline mt-3 px-4 py-2 text-xs">⭐ Pedir avaliação</a>
                    )}
                    <VoucherIssuer order={o} onNotes={(n) => setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, admin_notes: n } : x)))} />
                    <p className="label mt-4">Notas internas</p>
                    <textarea key={o.admin_notes ?? ""} className="input min-h-16" defaultValue={o.admin_notes ?? ""} onBlur={(e) => update(o.id, { admin_notes: e.target.value })} placeholder="Ex.: pago por MB WAY, registo CTT…" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
