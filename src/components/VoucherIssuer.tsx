"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";
import { euro } from "@/lib/format";
import type { Order } from "@/lib/types";
import { isVoucherSlug, newVoucherCode } from "@/lib/voucher";
import { IconWhatsApp } from "./icons";

/** Na encomenda: cria os códigos dos vales comprados e prepara a mensagem para o cliente. */
export default function VoucherIssuer({ order, onNotes }: { order: Order; onNotes: (notes: string) => void }) {
  const vouchers = order.items.filter((i) => isVoucherSlug(i.slug));
  // códigos já emitidos ficam guardados nas notas internas ("VALE-XXXXXX (50,00 €)")
  const issued = [...(order.admin_notes ?? "").matchAll(/(VALE-[A-Z0-9]{6}) \(([^)]+)\)/g)].map((m) => ({ code: m[1], label: m[2] }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!vouchers.length) return null;

  const needed = vouchers.reduce((n, i) => n + i.qty, 0);

  const issue = async () => {
    setBusy(true); setErr("");
    const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);
    const created: { code: string; label: string }[] = [];
    for (const item of vouchers) {
      for (let k = 0; k < item.qty; k++) {
        const code = newVoucherCode();
        const { error } = await db().from("coupons").insert({
          code, kind: "fixed", value: Number(item.unit_price), min_total: 0, max_uses: 1,
          expires_at: expires.toISOString(), active: true, b2c_only: false,
        });
        if (error) { setErr("Não foi possível criar um dos códigos. Tente novamente."); setBusy(false); return; }
        created.push({ code, label: euro(item.unit_price) });
      }
    }
    const line = `Vales emitidos ${new Date().toLocaleDateString("pt-PT")}: ` + created.map((c) => `${c.code} (${c.label})`).join(", ");
    const notes = [order.admin_notes, line].filter(Boolean).join("\n");
    await db().from("orders").update({ admin_notes: notes }).eq("id", order.id);
    onNotes(notes);
    setBusy(false);
  };

  const digits = (order.customer.phone || "").replace(/\D/g, "");
  const intl = digits.length === 9 ? `351${digits}` : digits;
  const validity = new Date(); validity.setFullYear(validity.getFullYear() + 1);
  const msg = `Olá ${order.customer.name?.split(" ")[0] ?? ""}! Obrigado pela sua compra 🎁\n\n` +
    `Aqui ${issued.length > 1 ? "estão os seus vales" : "está o seu vale"} de oferta Equi Prime:\n` +
    issued.map((c) => `• ${c.code} — ${c.label}`).join("\n") +
    `\n\nComo usar: na loja, adicionar os produtos ao carrinho e escrever o código no campo “Código de desconto”. Utilização única, válido até ${validity.toLocaleDateString("pt-PT")}.\n\nBoas compras!`;

  return (
    <div className="mt-5 rounded-xl border border-leather/40 bg-white p-4">
      <p className="label">🎁 Vales de oferta nesta encomenda ({needed})</p>
      {issued.length === 0 ? (
        <>
          <p className="text-sm text-muted">Depois de confirmar o pagamento, crie o{needed > 1 ? "s" : ""} código{needed > 1 ? "s" : ""} (utilização única, válido 12 meses).</p>
          <button onClick={issue} disabled={busy} className="btn mt-3 px-4 py-2 text-xs">{busy ? "A criar…" : `Criar ${needed > 1 ? `${needed} vales` : "vale"}`}</button>
          {err && <p className="mt-2 text-xs text-danger">{err}</p>}
        </>
      ) : (
        <>
          <ul className="space-y-1 font-mono text-sm">{issued.map((c) => <li key={c.code}>{c.code} — {c.label}</li>)}</ul>
          <a href={`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" className="btn-whatsapp mt-3 px-4 py-2 text-xs">
            <IconWhatsApp size={16} /> Enviar vale{issued.length > 1 ? "s" : ""} ao cliente
          </a>
        </>
      )}
    </div>
  );
}
