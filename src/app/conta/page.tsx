"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import type { Order } from "@/lib/types";
import AuthForm from "@/components/AuthForm";
import { STATUS_LABEL } from "@/lib/status";

function Conta() {
  const { ready, session, profile, refreshProfile } = useStore();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [tab, setTab] = useState<"encomendas" | "dados">("encomendas");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (next === "checkout") { router.replace("/checkout"); return; }
    db().from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [session, next, router]);

  useEffect(() => {
    if (profile) setF({
      name: profile.name ?? "", phone: profile.phone ?? "", nif: profile.nif ?? "", address: profile.address ?? "",
      postal_code: profile.postal_code ?? "", city: profile.city ?? "", country: profile.country ?? "Portugal", company: profile.company ?? "",
    });
  }, [profile]);

  if (!ready) return <div className="py-32" />;
  if (!session) {
    return (
      <div className="px-4 py-16">
        <h1 className="mb-8 text-center font-serif text-5xl">A minha conta</h1>
        <AuthForm />
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await db().from("profiles").update(f).eq("id", session.user.id);
    await refreshProfile();
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">A minha conta</p>
          <h1 className="mt-2 font-serif text-5xl">Olá{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h1>
        </div>
        <div className="flex gap-2">
          {profile?.is_admin && <Link href="/admin" className="btn">Gestão da loja</Link>}
          <button className="btn-outline" onClick={() => db().auth.signOut()}>Sair</button>
        </div>
      </div>

      {profile?.b2b_status === "approved" && <p className="mt-6 rounded-xl bg-sand p-4 text-sm">✓ Conta de revenda ativa — vê os preços profissionais sem IVA em toda a loja.</p>}
      {profile?.b2b_status === "pending" && <p className="mt-6 rounded-xl bg-sand p-4 text-sm">O seu pedido de conta de revenda está em análise.</p>}

      <div className="mt-8 flex gap-6 border-b border-line text-sm">
        {(["encomendas", "dados"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 font-medium capitalize ${tab === t ? "border-ink" : "border-transparent text-muted"}`}>
            {t === "encomendas" ? "Encomendas" : "Os meus dados"}
          </button>
        ))}
        <Link href="/conta/lista-de-desejos" className="pb-3 font-medium text-muted">Lista de desejos</Link>
        {profile?.b2b_status !== "approved" && <Link href="/revenda" className="pb-3 font-medium text-muted">Revenda</Link>}
      </div>

      {tab === "encomendas" && (
        <div className="mt-6">
          {orders === null ? <p className="text-muted">A carregar…</p> : orders.length === 0 ? (
            <p className="text-muted">Ainda não tem encomendas. <Link href="/catalog" className="underline">Ver produtos</Link></p>
          ) : (
            <ul className="space-y-4">
              {orders.map((o) => (
                <li key={o.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Encomenda #{o.id}</p>
                    <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium">{STATUS_LABEL[o.status] ?? o.status}</span>
                  </div>
                  <p className="text-xs text-muted">{new Date(o.created_at).toLocaleString("pt-PT")}</p>
                  <ul className="mt-3 text-sm text-ink/85">
                    {o.items.map((i, k) => <li key={k}>{i.qty}× {i.title}{i.variant ? ` — ${i.variant}` : ""}</li>)}
                  </ul>
                  <p className="mt-3 text-sm font-semibold">Total: {euro(o.total)}{o.is_b2b && " + IVA"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "dados" && (
        <form onSubmit={save} className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          {[
            ["name", "Nome"], ["phone", "Telemóvel"], ["nif", "NIF"], ["company", "Empresa"],
            ["address", "Morada"], ["postal_code", "Código postal"], ["city", "Localidade"], ["country", "País"],
          ].map(([k, l]) => (
            <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`p-${k}`}>{l}</label>
              <input id={`p-${k}`} className="input" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="btn">Guardar</button>
            {saved && <span className="text-sm text-ok">Guardado ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}

export default function ContaPage() {
  return <Suspense><Conta /></Suspense>;
}
