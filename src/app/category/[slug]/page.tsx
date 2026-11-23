import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Listing from "@/components/Listing";
import { descendantIds, getCategories, listProducts, type Sort } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: Sort }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  if (!c) return {};
  return {
    title: `${c.title} — Equipamento Equestre`,
    description: `${c.title}: compre online na Equi Prime. Envios para Portugal, ilhas e Europa.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const all = await getCategories();
  const c = all.find((x) => x.slug === slug);
  if (!c) notFound();
  const parent = c.parent_id ? all.find((x) => x.id === c.parent_id) : null;
  const products = await listProducts({ categoryIds: descendantIds(all, c.id), sort });
  return (
    <Listing
      title={c.title}
      products={products}
      sort={sort}
      subcats={all.filter((x) => x.parent_id === c.id)}
      crumbs={[...(parent ? [{ href: `/category/${parent.slug}`, label: parent.title }] : []), { href: `/category/${c.slug}`, label: c.title }]}
    />
  );
}
