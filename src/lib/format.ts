const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
export const euro = (n: number | null | undefined) => fmt.format(Number(n ?? 0));
export const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
