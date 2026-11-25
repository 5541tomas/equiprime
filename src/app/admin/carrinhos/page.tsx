"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import { IconWhatsApp } from "@/components/icons";

type Cart = {
  id: string; items: { title: string; variant: string | null; qty: number; unit_price: number; image: string | null; slug: string }[];
  item_count: number; subtotal: number; contact: { name?: string; phone?: string; email?: string };
  stage: "carrinho" | "checkout" | "convertido"; order_id: number | null;
  contacted_at: string | null; created_at: string; updated_at: string; converted_at: string | null;
};

const HOUR = 3600e3;
// um carrinho conta como "abandonado" 1 hora depois da última atividade
const ABANDON_AFTER = 1 * HOUR;

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
};

type Tab = "recuperar" | "contactados" | "recuperados" | "todos";

export default function AdminCarts() {
  const [carts, setCarts] = useState<Cart[] | null>(null);
  const [tab, setTab] = useState<Tab>("recuperar");
  const [onlyContact, setOnlyContact] = useState(false);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 24 * HOUR).toISOString();
    const { data, error } = await db().from("carts").select("*").gt("updated_at", since).order("updated_at", { ascending: false }).limit(500);
    if (error) { setMissing(true); setCarts([]); return; }
    setCarts((data ?? []) as Cart[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const isAbandoned = (c: Cart) => c.stage !== "convertido" && c.item_count > 0 && now - Date.parse(c.updated_at) > ABANDON_AFTER;

  const stats = useMemo(() => {
    const last30 = (carts ?? []).filter((c) => now - Date.parse(c.created_at) < 30 * 24 * HOUR && (c.item_count > 0 || c.stage === "convertido"));
    const abandoned = last30.filter(isAbandoned);
    const converted = last30.filter((c) => c.stage === "convertido");
    const recovered = converted.filter((c) => c.contacted_at && c.converted_at && Date.parse(c.converted_at) > Date.parse(c.contacted_at));
    return {
      abandoned: abandoned.length,
      lost: abandoned.reduce((s, c) => s + Number(c.subtotal), 0),
      withContact: abandoned.filter((c) => c.contact?.phone || c.contact?.email).length,
      recovered: recovered.length,
      recoveredValue: recovered.reduce((s, c) => s + Number(c.subtotal), 0),
      rate: last30.length ? Math.round((converted.length / last30.length) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carts]);

  const list = useMemo(() => (carts ?? []).filter((c) => {
    if (onlyContact && !(c.contact?.phone || c.contact?.email)) return false;
    switch (tab) {
      case "recuperar": return isAbandoned(c) && !c.contacted_at;
      case "contactados": return isAbandoned(c) && !!c.contacted_at;
      case "recuperados": return c.stage === "convertido" && !!c.contacted_at;
      default: return c.item_count > 0 || c.stage === "convertido";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [carts, tab, onlyContact]);

  const link = (c: Cart) => `${window.location.origin}/carrinho/recuperar?c=${c.id}`;
  const markContacted = async (c: Cart) => {
    const at = new Date().toISOString();
    await db().from("carts").update({ contacted_at: at }).eq("id", c.id);
    setCarts((cs) => cs?.map((x) => (x.id === c.id ? { ...x, contacted_at: at } : x)) ?? null);
  };
  const waUrl = (c: Cart) => {
    const digits = (c.contact.phone ?? "").replace(/\D/g, "");
    const intl = digits.length === 9 ? `351${digits}` : digits;
    const first = c.contact.name?.split(" ")[0];
    const itemsTxt = c.items.slice(0, 3).map((i) => `• ${i.qty}× ${i.title}${i.variant ? ` (${i.variant})` : ""}`).join("\n");
    const msg = `Olá${first ? ` ${first}` : ""}! Aqui é da Equi Prime 🐴\n\nVimos que deixou estes artigos no carrinho:\n${itemsTxt}${c.items.length > 3 ? "\n• …" : ""}\n\nGuardámos tudo para si — pode concluir a encomenda aqui:\n${link(c)}\n\nSe tiver alguma dúvida (tamanhos, envio, pagamento), diga-nos!`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  };
  const mailUrl = (c: Cart) => {
    const subject = "O seu carrinho na Equi Prime";
    const body = `Olá${c.contact.name ? ` ${c.contact.name.split(" ")[0]}` : ""},\n\nGuardámos os artigos que deixou no carrinho. Pode concluir a encomenda aqui:\n${link(c)}\n\nQualquer dúvida, estamos ao dispor.\nEqui Prime`;
    return `mailto:${c.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const copyLink = async (c: Cart) => { try { await navigator.clipboard.writeText(link(c)); setCopied(c.id); setTimeout(() => setCopied(null), 2000); } catch {} };
  const remove = async (c: Cart) => {
    if (!confirm("Apagar este carrinho da lista?")) return;
    await db().from("carts").delete().eq("id", c.id);
    setCarts((cs) => cs?.filter((x) => x.id !== c.id) ?? null);
  };

  if (missing) {
    return (
      <div className="card p-8">
        <p className="font-semibold">Falta ativar os carrinhos abandonados na base de dados.</p>
        <p className="mt-2 text-sm text-muted">Cole o ficheiro <code>supabase/migrations/0003_carrinhos_abandonados.sql</code> no Supabase → SQL Editor → Run.</p>
      </div>
    );
  }
  if (!carts) return <p className="text-muted">A carregar…</p>;

  const TABS: [Tab, string][] = [["recuperar", "Por recuperar"], ["contactados", "Já contactados"], ["recuperados", "Recuperados ✓"], ["todos", "Todos"]];

  return (
    <div>
      {/* resumo dos últimos 30 dias */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Carrinhos abandonados" value={String(stats.abandoned)} hint="últimos 30 dias" />
        <Stat label="Valor por vender" value={euro(stats.lost)} hint={`${stats.withContact} com contacto`} />
        <Stat label="Recuperados" value={String(stats.recovered)} hint={stats.recovered ? euro(stats.recoveredValue) : "depois de contactar"} />
        <Stat label="Carrinhos que viram encomenda" value={`${stats.rate}%`} hint="taxa de conversão" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1.5 text-sm ${tab === k ? "border-ink bg-ink text-ivory" : "border-line bg-white"}`}>{l}</button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyContact} onChange={(e) => setOnlyContact(e.target.checked)} /> Só com contacto
        </label>
      </div>
      <p className="mb-4 text-xs text-muted">Um carrinho conta como abandonado 1 hora depois da última atividade do cliente. Os visitantes sem contacto não podem ser contactados, mas ajudam a perceber o que interessa.</p>

      {list.length === 0 ? (
        <p className="card p-10 text-center text-muted">{tab === "recuperar" ? "Nenhum carrinho por recuperar. 🎉" : "Sem carrinhos nesta lista."}</p>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const hasPhone = !!c.contact?.phone;
            return (
              <div key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-48 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{c.contact?.name || (hasPhone || c.contact?.email ? "Cliente" : "Visitante anónimo")}</p>
                      {c.stage === "convertido" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">Encomenda #{c.order_id}</span>
                      ) : c.stage === "checkout" ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">Chegou ao checkout</span>
                      ) : (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">Só carrinho</span>
                      )}
                      {c.contacted_at && c.stage !== "convertido" && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">Contactado {ago(c.contacted_at)}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[c.contact?.phone, c.contact?.email].filter(Boolean).join(" · ") || "Sem contacto"} · última atividade {ago(c.updated_at)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">{euro(c.subtotal)}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {c.items.map((i, k) => (
                    <a key={k} href={`/product/${i.slug}`} target="_blank" className="flex items-center gap-2 rounded-xl bg-ivory p-1.5 pr-3 text-xs">
                      <span className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
                        {i.image && <Image src={i.image} alt="" fill sizes="40px" className="object-contain" />}
                      </span>
                      <span><span className="line-clamp-1 max-w-48 font-medium">{i.qty}× {i.title}</span>{i.variant && <span className="text-muted">{i.variant}</span>}</span>
                    </a>
                  ))}
                </div>

                {c.stage !== "convertido" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {hasPhone && (
                      <a href={waUrl(c)} target="_blank" rel="noopener" onClick={() => markContacted(c)} className="btn-whatsapp px-4 py-2 text-xs">
                        <IconWhatsApp size={16} /> Recuperar por WhatsApp
                      </a>
                    )}
                    {c.contact?.email && (
                      <a href={mailUrl(c)} onClick={() => markContacted(c)} className="btn-outline px-4 py-2 text-xs">Enviar e-mail</a>
                    )}
                    <button onClick={() => copyLink(c)} className="rounded-full px-3 py-2 text-xs underline">{copied === c.id ? "Link copiado ✓" : "Copiar link do carrinho"}</button>
                    {!c.contacted_at && (hasPhone || c.contact?.email) && (
                      <button onClick={() => markContacted(c)} className="rounded-full px-3 py-2 text-xs text-muted underline">Marcar como contactado</button>
                    )}
                    <button onClick={() => remove(c)} className="ml-auto px-2 py-2 text-xs text-danger">Apagar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
