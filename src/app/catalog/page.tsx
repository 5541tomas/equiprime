import type { Metadata } from "next";
import Listing from "@/components/Listing";
import { categoryTree, getCategories, listProducts, type Sort } from "@/lib/catalog";

type Props = { searchParams: Promise<{ sort?: Sort; q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return q
    ? { title: `Pesquisa: ${q}`, robots: { index: false } }
    : { title: "Todos os produtos", alternates: { canonical: "/catalog" } };
}

export default async function CatalogPage({ searchParams }: Props) {
  const { sort, q } = await searchParams;
  const [products, cats] = await Promise.all([listProducts({ q, sort }), getCategories()]);
  return (
    <Listing
      title={q ? `Resultados para “${q}”` : "Todos os produtos"}
      products={products}
      sort={sort}
      subcats={q ? [] : categoryTree(cats)}
      crumbs={[{ href: "/catalog", label: "Produtos" }]}
    />
  );
}
