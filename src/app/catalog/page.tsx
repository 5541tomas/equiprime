import type { Metadata } from "next";
import Link from "next/link";
import Listing from "@/components/Listing";
import { categoryTree, getCategories, getSearchIndex, listProducts, type Sort } from "@/lib/catalog";
import { search } from "@/lib/search";
import type { Product } from "@/lib/types";

type Props = { searchParams: Promise<{ sort?: Sort; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return q
    ? { title: `Pesquisa: ${q}`, robots: { index: false } }
    : { title: "Todos os produtos", alternates: { canonical: "/catalog" } };
}

export default async function CatalogPage({ searchParams }: Props) {
  const { sort, q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    const [products, cats] = await Promise.all([listProducts({ sort }), getCategories()]);
    return <Listing title="Todos os produtos" products={products} sort={sort} subcats={categoryTree(cats)} crumbs={[{ href: "/catalog", label: "Produtos" }]} />;
  }

  // pesquisa: mesma lógica das sugestões (sem acentos, nome + marca + categoria)
  const [index, all] = await Promise.all([getSearchIndex(), listProducts({ sort })]);
  const res = search(index, query);
  const byId = new Map(all.map((p) => [p.id, p]));
  const found = res.products.map((p) => byId.get(p.id)).filter(Boolean) as Product[];
  // com ordenação escolhida, respeita a ordem da base de dados; senão, a relevância
  const products = sort && sort !== "relevancia" ? all.filter((p) => found.includes(p)) : found;

  return (
    <>
      {(res.categories.length > 0 || res.brands.length > 0) && (
        <div className="mx-auto max-w-7xl px-4 pt-10">
          <div className="rounded-2xl border border-line bg-white p-5">
            {res.categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">Categorias</span>
                {res.categories.map((c) => (
                  <Link key={c.slug} href={`/category/${c.slug}`} className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-ink">
                    {c.title}{c.parent && <span className="text-muted"> · {c.parent}</span>}
                  </Link>
                ))}
              </div>
            )}
            {res.brands.length > 0 && (
              <div className={`flex flex-wrap items-center gap-2 ${res.categories.length ? "mt-3" : ""}`}>
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">Marcas</span>
                {res.brands.map((b) => (
                  <Link key={b.slug} href={`/brand/${b.slug}`} className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-ink">{b.title}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <Listing
        title={`Resultados para “${query}”`}
        products={products}
        sort={sort}
        crumbs={[{ href: "/catalog", label: "Produtos" }]}
      />
    </>
  );
}
