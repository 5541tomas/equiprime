"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import { STORE, WELCOME } from "@/lib/config";
import { orderMessage, whatsappUrl, type PlacedOrder } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/icons";
import { markCartConverted, saveCart } from "@/lib/cartTracking";

const COUNTRIES = [
  "Portugal", "Portugal — Açores", "Portugal — Madeira", "Espanha", "França", "Alemanha", "Itália", "Bélgica",
  "Países Baixos", "Luxemburgo", "Irlanda", "Áustria", "Dinamarca", "Suécia", "Finlândia", "Polónia",
  "República Checa", "Eslováquia", "Eslovénia", "Croácia", "Hungria", "Roménia", "Bulgária", "Grécia",
  "Chipre", "Malta", "Estónia", "Letónia", "Lituânia",
];
const LAST = "equiprime-last-order";

type Coupon = { code: string; kind: "percent" | "fixed" | "free_shipping"; value: number };

export default function CheckoutPage() {
  const { cart, clearCart, session, profile, isB2B } = useStore();
  const [f, setF] = useState({ name: "", phone: "", email: "", nif: "", address: "", postal_code: "", city: "", country: "Portugal" });
  const [delivery, setDelivery] = useState<"ctt" | "levantamento">("ctt");
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [saveProfile, setSaveProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ order: PlacedOrder; url: string } | null>(null);

  useEffect(() => {
    try { const raw = sessionStorage.getItem(LAST); if (raw && !cart.length) setDone(JSON.parse(raw)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile) return;
    setF((x) => ({
      name: x.name || profile.name || "", phone: x.phone || profile.phone || "", email: x.email || profile.email || "",
      nif: x.nif || profile.nif || "", address: x.address || profile.address || "", postal_code: x.postal_code || profile.postal_code || "",
      city: x.city || profile.city || "", country: profile.country || x.country,
    }));
  }, [profile]);

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.kind === "percent") return Math.round(subtotal * coupon.value) / 100;
    if (coupon.kind === "fixed") return Math.min(coupon.value, subtotal);
    return 0;
  }, [coupon, subtotal]);
  const shipping = delivery === "levantamento" || coupon?.kind === "free_shipping" || subtotal - discount >= STORE.freeShippingFrom ? 0 : STORE.shippingCost;
  const total = subtotal - discount + shipping;

  const applyCoupon = async () => {
    setCouponErr("");
    if (!couponInput.trim()) return;
    const { data } = await db().rpc("check_coupon", { p_code: couponInput, p_subtotal: subtotal });
    if (data) setCoupon(data as Coupon); else { setCoupon(null); setCouponErr("Cupão inválido, expirado ou valor mínimo não atingido."); }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  // carrinhos abandonados: regista que o cliente chegou ao checkout e, ao sair de cada campo, o contacto
  useEffect(() => {
    if (cart.length && !profile?.is_admin) saveCart(cart, { stage: "checkout" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rememberContact = () => {
    if (!cart.length || profile?.is_admin) return;
    const phoneOk = f.phone.replace(/\D/g, "").length >= 9;
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
    if (!phoneOk && !emailOk) return;
    saveCart(cart, { stage: "checkout", contact: { name: f.name, phone: phoneOk ? f.phone : null, email: emailOk ? f.email : null } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const customer = { ...f, name: f.name.trim(), phone: f.phone.trim() };
    const { data, error } = await db().rpc("create_order", {
      p_items: cart.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })),
      p_customer: customer, p_delivery: delivery, p_coupon: coupon?.code ?? null, p_notes: notes.trim() || null,
    });
    if (error || !data) { setErr(error?.message || "Não foi possível criar a encomenda."); setBusy(false); return; }

    if (session && saveProfile) {
      await db().from("profiles").update({
        name: f.name, phone: f.phone, nif: f.nif, address: f.address, postal_code: f.postal_code, city: f.city, country: f.country,
      }).eq("id", session.user.id);
    }
    const order = data as PlacedOrder;
    const url = whatsappUrl(orderMessage(order, customer, delivery, coupon?.code, notes.trim()));
    const result = { order, url };
    try { sessionStorage.setItem(LAST, JSON.stringify(result)); } catch {}
    // espera (no máximo 1,5 s) que o carrinho fique marcado como encomendado antes de abrir o WhatsApp
    await Promise.race([markCartConverted(order.id), new Promise((r) => setTimeout(r, 1500))]);
    clearCart();
    setDone(result);
    setBusy(false);
    window.location.href = url;
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="eyebrow">Encomenda #{done.order.id} registada</p>
        <h1 className="mt-3 font-serif text-5xl">Falta só um passo</h1>
        <p className="mt-4 text-muted">Envie-nos a mensagem pelo WhatsApp para confirmarmos a sua encomenda, o pagamento e o envio.</p>
        <a href={done.url} className="btn-whatsapp mt-8 w-full py-4 text-base"><IconWhatsApp /> Enviar encomenda por WhatsApp</a>
        <p className="mt-4 text-sm text-muted">Total: <strong className="text-ink">{euro(done.order.total)}</strong>{done.order.is_b2b && " + IVA"}</p>
        <Link href="/" onClick={() => sessionStorage.removeItem(LAST)} className="mt-8 inline-block text-sm underline">Voltar à loja</Link>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">O carrinho está vazio</h1>
        <Link href="/catalog" className="btn mt-8">Ver produtos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Finalizar encomenda</h1>
      {!session && (
        <p className="mt-3 text-sm text-muted">
          Já tem conta? <Link href="/conta?next=checkout" className="underline">Entre</Link> para preencher os seus dados e acompanhar a encomenda.
        </p>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Os seus dados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label" htmlFor="name">Nome *</label><input id="name" className="input" required value={f.name} onChange={set("name")} onBlur={rememberContact} autoComplete="name" /></div>
              <div><label className="label" htmlFor="phone">Telemóvel / WhatsApp *</label><input id="phone" className="input" required type="tel" value={f.phone} onChange={set("phone")} onBlur={rememberContact} autoComplete="tel" /></div>
              <div><label className="label" htmlFor="email">E-mail</label><input id="email" className="input" type="email" value={f.email} onChange={set("email")} onBlur={rememberContact} autoComplete="email" /></div>
              <div><label className="label" htmlFor="nif">NIF (para fatura)</label><input id="nif" className="input" value={f.nif} onChange={set("nif")} inputMode="numeric" /></div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Entrega</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["ctt", "Envio por CTT", subtotal - discount >= STORE.freeShippingFrom ? "Grátis" : euro(STORE.shippingCost)], ["levantamento", "Levantamento", "Combinado por WhatsApp"]] as const).map(([k, t, d]) => (
                <label key={k} className={`card flex cursor-pointer items-start gap-3 p-4 ${delivery === k ? "border-ink ring-1 ring-ink" : ""}`}>
                  <input type="radio" name="delivery" className="mt-1 accent-[#141414]" checked={delivery === k} onChange={() => setDelivery(k)} />
                  <span><span className="block font-medium">{t}</span><span className="text-sm text-muted">{d}</span></span>
                </label>
              ))}
            </div>
            {delivery === "ctt" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="label" htmlFor="address">Morada *</label><input id="address" className="input" required value={f.address} onChange={set("address")} autoComplete="street-address" /></div>
                <div><label className="label" htmlFor="pc">Código postal *</label><input id="pc" className="input" required value={f.postal_code} onChange={set("postal_code")} autoComplete="postal-code" /></div>
                <div><label className="label" htmlFor="city">Localidade *</label><input id="city" className="input" required value={f.city} onChange={set("city")} autoComplete="address-level2" /></div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="country">País *</label>
                  <select id="country" className="input" value={f.country} onChange={set("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
              </div>
            )}
          </section>

          <section>
            <label className="label" htmlFor="notes">Notas (opcional)</label>
            <textarea id="notes" className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            {session && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saveProfile} onChange={(e) => setSaveProfile(e.target.checked)} /> Guardar estes dados na minha conta
              </label>
            )}
          </section>
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-28">
          <h2 className="mb-4 text-lg font-semibold">Resumo</h2>
          <ul className="divide-y divide-line">
            {cart.map((i) => (
              <li key={`${i.product_id}-${i.variant_id}`} className="flex gap-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ivory">
                  {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain" />}
                  <span className="absolute -right-1 -top-1 rounded-full bg-ink px-1.5 text-[11px] text-white">{i.qty}</span>
                </div>
                <div className="flex-1 text-sm"><p className="font-medium leading-snug">{i.title}</p>{i.variant && <p className="text-muted">{i.variant}</p>}</div>
                <p className="text-sm font-medium">{euro(i.unit_price * i.qty)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <input className="input" placeholder="Código de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} aria-label="Código de desconto" />
            <button type="button" onClick={applyCoupon} className="btn-outline px-4">Aplicar</button>
          </div>
          {!coupon && !isB2B && !session && (
            <p className="mt-2 text-xs text-muted">Primeira compra? Use <button type="button" className="font-semibold text-leather underline" onClick={() => setCouponInput(WELCOME.code)}>{WELCOME.code}</button> para ter {WELCOME.percent}% de desconto.</p>
          )}
          {couponErr && <p className="mt-2 text-xs text-danger">{couponErr}</p>}
          {coupon && <p className="mt-2 text-xs text-ok">Cupão {coupon.code} aplicado.</p>}

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal{isB2B && " (s/ IVA)"}</dt><dd>{euro(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-ok"><dt>Desconto</dt><dd>−{euro(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Envio</dt><dd>{shipping ? euro(shipping) : "Grátis"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd>{euro(total)}{isB2B && <span className="text-xs font-normal text-muted"> + IVA</span>}</dd></div>
          </dl>

          <button className="btn-whatsapp mt-6 w-full py-4 text-base" disabled={busy}>
            <IconWhatsApp /> {busy ? "A registar…" : "Encomendar por WhatsApp"}
          </button>
          {err && <p className="mt-3 text-sm text-danger" role="alert">{err}</p>}
          <p className="mt-3 text-xs text-muted">
            Ao encomendar, abrimos o WhatsApp com o resumo da encomenda. O pagamento e o envio são combinados consigo. Ao continuar aceita os <Link href="/termos" className="underline">termos e condições</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}
