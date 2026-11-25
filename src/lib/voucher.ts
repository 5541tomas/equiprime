// Vales de oferta: produto digital, sem portes e sem descontos.
export const isVoucherSlug = (slug: string) => slug.startsWith("vale-de-oferta");

/** Código de vale fácil de ditar: VALE-7K3PXQ (sem 0/O/1/I para evitar enganos). */
export function newVoucherCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = new Uint32Array(6);
  crypto.getRandomValues(rnd);
  return "VALE-" + Array.from(rnd, (n) => chars[n % chars.length]).join("");
}
