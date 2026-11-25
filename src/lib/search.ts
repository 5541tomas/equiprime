// Pesquisa da loja: ignora acentos/maiúsculas, procura no nome, marca e categorias,
// e aceita as palavras por qualquer ordem. Funciona igual no servidor e no navegador.

export type SearchProduct = {
  id: number; slug: string; title: string; price: number; price_promo: number | null;
  image: string | null; brand: string | null; cats: string; // nomes das categorias, juntos
  variants: number; // n.º de variantes ativas (0 = pode ir direto para o carrinho)
};
export type SearchCategory = { title: string; slug: string; parent: string | null };
export type SearchBrand = { title: string; slug: string; logo: string | null };
export type SearchIndex = { products: SearchProduct[]; categories: SearchCategory[]; brands: SearchBrand[] };

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tokens = (q: string) => normalize(q).split(" ").filter(Boolean);

/** Plural simples em português: "luvas" também encontra "luva" e vice-versa. */
const stem = (t: string) => (t.length > 3 ? t.replace(/(oes|aes|es|s)$/, "") : t);

function matches(haystack: string, toks: string[]) {
  return toks.every((t) => haystack.includes(t) || haystack.includes(stem(t)));
}

export function search(index: SearchIndex, q: string, limits = { products: Infinity, categories: Infinity, brands: Infinity }) {
  const toks = tokens(q);
  if (!toks.length) return { products: [], categories: [], brands: [], total: 0 };
  const nq = toks.join(" ");

  const categories = index.categories
    .filter((c) => matches(normalize(`${c.title} ${c.parent ?? ""}`), toks))
    .sort((a, b) => Number(normalize(b.title).startsWith(nq)) - Number(normalize(a.title).startsWith(nq)));

  const brands = index.brands.filter((b) => matches(normalize(b.title), toks));

  const scored = index.products
    .map((p) => {
      const title = normalize(p.title);
      const hay = `${title} ${normalize(p.brand ?? "")} ${normalize(p.cats)}`;
      if (!matches(hay, toks)) return null;
      // relevância: nome começa pela pesquisa > nome contém tudo > encontrado pela marca/categoria
      const score = (title.startsWith(nq) ? 4 : 0) + (title.includes(nq) ? 2 : 0) + (matches(title, toks) ? 1 : 0);
      return { p, score };
    })
    .filter((x): x is { p: SearchProduct; score: number } => !!x)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title, "pt"));

  return {
    products: scored.slice(0, limits.products).map((x) => x.p),
    categories: categories.slice(0, limits.categories),
    brands: brands.slice(0, limits.brands),
    total: scored.length,
  };
}
