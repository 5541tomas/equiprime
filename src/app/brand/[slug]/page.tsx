import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Listing from "@/components/Listing";
import { getBrands, listProducts, type Sort } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: Sort }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = (await getBrands()).find((x) => x.slug === slug);
  if (!b) return {};
  return { title: `${b.title} em Portugal`, description: `Produtos ${b.title} na Equi Prime.`, alternates: { canonical: `/brand/${slug}` } };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const b = (await getBrands()).find((x) => x.slug === slug);
  if (!b) notFound();
  const products = await listProducts({ brandId: b.id, sort });
  return <Listing title={b.title} products={products} sort={sort} hideBrand crumbs={[{ href: "/brands", label: "Marcas" }, { href: `/brand/${b.slug}`, label: b.title }]} />;
}
