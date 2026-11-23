import { STORE } from "./config";
import { euro } from "./format";

export type PlacedOrder = {
  id: number; is_b2b: boolean; subtotal: number; discount: number; shipping: number; total: number;
  items: { title: string; variant: string | null; qty: number; unit_price: number }[];
};

export function orderMessage(o: PlacedOrder, c: Record<string, string>, delivery: string, coupon?: string, notes?: string) {
  const lines = [
    `Olá Equi Prime! Quero confirmar a minha encomenda *#${o.id}*${o.is_b2b ? " (revenda)" : ""}:`,
    "",
    ...o.items.map((i) => `• ${i.qty}× ${i.title}${i.variant ? ` — ${i.variant}` : ""} — ${euro(i.unit_price * i.qty)}`),
    "",
    `Subtotal: ${euro(o.subtotal)}${o.is_b2b ? " (s/ IVA)" : ""}`,
    ...(o.discount > 0 ? [`Desconto${coupon ? ` (${coupon.toUpperCase()})` : ""}: -${euro(o.discount)}`] : []),
    `Envio: ${delivery === "levantamento" ? "Levantamento (a combinar)" : o.shipping > 0 ? `CTT ${euro(o.shipping)}` : "CTT grátis"}`,
    `*Total: ${euro(o.total)}*${o.is_b2b ? " + IVA" : ""}`,
    "",
    `Nome: ${c.name}`,
    `Telefone: ${c.phone}`,
    ...(c.email ? [`E-mail: ${c.email}`] : []),
    ...(c.nif ? [`NIF: ${c.nif}`] : []),
    ...(delivery === "ctt" ? [`Morada: ${c.address}, ${c.postal_code} ${c.city}, ${c.country}`] : []),
    ...(notes ? ["", `Notas: ${notes}`] : []),
  ];
  return lines.join("\n");
}

export const whatsappUrl = (text: string) => `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
