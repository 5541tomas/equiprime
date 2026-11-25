// Registo dos carrinhos para o painel "Carrinhos abandonados".
// Nunca bloqueia a compra: se algo falhar, a loja continua a funcionar normalmente.
import { db } from "./supabase";
import type { CartItem } from "./types";

const ID_KEY = "equiprime-cart-id";
const SAVED_KEY = "equiprime-cart-saved";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

export function getCartId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id); }
    return id;
  } catch { return uuid(); }
}

/** Usar um carrinho recuperado (link enviado ao cliente). */
export function adoptCartId(id: string) {
  try { localStorage.setItem(ID_KEY, id); localStorage.setItem(SAVED_KEY, "1"); } catch {}
}

/** Depois de uma encomenda, o próximo carrinho é um carrinho novo. */
function resetCartId() {
  try { localStorage.removeItem(ID_KEY); localStorage.removeItem(SAVED_KEY); } catch {}
}

const wasSaved = () => { try { return localStorage.getItem(SAVED_KEY) === "1"; } catch { return false; } };

export type Contact = { name?: string | null; phone?: string | null; email?: string | null };

export async function saveCart(items: CartItem[], opts: { contact?: Contact; stage?: "carrinho" | "checkout" } = {}) {
  // carrinho vazio que nunca foi guardado: nada a registar
  if (!items.length && !wasSaved()) return;
  try {
    await db().rpc("save_cart", {
      p_id: getCartId(),
      p_items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })),
      p_contact: opts.contact ?? null,
      p_stage: opts.stage ?? null,
      p_order_id: null,
    });
    localStorage.setItem(SAVED_KEY, "1");
  } catch {}
}

export async function markCartConverted(orderId: number) {
  if (!wasSaved()) { resetCartId(); return; }
  try {
    await db().rpc("save_cart", { p_id: getCartId(), p_items: [], p_contact: null, p_stage: "convertido", p_order_id: orderId });
  } catch {}
  resetCartId();
}

export async function fetchSavedCart(id: string) {
  const { data, error } = await db().rpc("get_cart", { p_id: id });
  if (error) return null;
  return (data ?? null) as (CartItem & { image: string | null })[] | null;
}
