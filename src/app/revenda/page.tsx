"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { db } from "@/lib/supabase";
import AuthForm from "@/components/AuthForm";

export default function RevendaPage() {
  const { ready, session, profile, refreshProfile } = useStore();
  const [company, setCompany] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    await db().from("profiles").update({ company, nif, phone, b2b_status: "pending" }).eq("id", session.user.id);
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Revendedores</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight">Condições profissionais para lojas e centros hípicos</h1>
        <ul className="mt-8 space-y-3 text-ink/85">
          <li>✓ Preços de revenda sem IVA visíveis em toda a loja</li>
          <li>✓ Sem encomenda mínima</li>
          <li>✓ Encomendas tratadas diretamente connosco por WhatsApp</li>
        </ul>
        <p className="mt-8 text-sm text-muted">Após o pedido, analisamos os dados da empresa e ativamos a conta. Normalmente em 1–2 dias úteis.</p>
      </div>

      <div>
        {!ready ? null : !session ? (
          <>
            <p className="mb-4 text-center text-sm text-muted">Primeiro, entre ou crie a sua conta.</p>
            <AuthForm />
          </>
        ) : profile?.b2b_status === "approved" ? (
          <div className="card p-8"><p className="font-serif text-3xl">Conta de revenda ativa ✓</p><Link href="/catalog" className="btn mt-6">Ver produtos</Link></div>
        ) : profile?.b2b_status === "pending" ? (
          <div className="card p-8"><p className="font-serif text-3xl">Pedido em análise</p><p className="mt-3 text-muted">Entraremos em contacto em breve.</p></div>
        ) : (
          <form onSubmit={request} className="card space-y-4 p-8">
            <p className="font-serif text-3xl">Pedir conta de revenda</p>
            {profile?.b2b_status === "rejected" && <p className="text-sm text-danger">O pedido anterior não foi aprovado. Pode voltar a pedir ou contactar-nos.</p>}
            <div><label className="label" htmlFor="r-co">Empresa *</label><input id="r-co" className="input" required value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div><label className="label" htmlFor="r-nif">NIF da empresa *</label><input id="r-nif" className="input" required value={nif} onChange={(e) => setNif(e.target.value)} /></div>
            <div><label className="label" htmlFor="r-ph">Telemóvel *</label><input id="r-ph" className="input" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <button className="btn w-full" disabled={busy}>Enviar pedido</button>
          </form>
        )}
      </div>
    </div>
  );
}
