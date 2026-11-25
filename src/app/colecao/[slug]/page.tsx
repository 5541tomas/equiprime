import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Listing from "@/components/Listing";
import { COLLECTIONS, collectionCover, collectionProducts, getCollection } from "@/lib/collections";
import { getBrands, type Sort } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: Sort }> };

export function generateStaticParams() { return COLLECTIONS.map((c) => ({ slug: c.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCollection((await params).slug);
  if (!c) return {};
  return { title: c.seoTitle, description: c.seoDescription, alternates: { canonical: `/colecao/${c.slug}` } };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const c = getCollection((await params).slug);
  if (!c) notFound();
  const { sort } = await searchParams;
  const [products, cover, brands] = await Promise.all([collectionProducts(c, sort), collectionCover(c), getBrands()]);
  const highlights = c.brandHighlights.map((s) => brands.find((b) => b.slug === s)).filter(Boolean) as typeof brands;
  const other = COLLECTIONS.find((x) => x.slug !== c.slug)!;

  return (
    <>
      <section className="border-b border-line bg-ink text-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b27c]">{c.eyebrow}</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">{c.title}</h1>
            <p className="mt-4 max-w-xl text-ivory/75">{c.intro}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {highlights.map((b) => (
                <Link key={b.slug} href={`/brand/${b.slug}`} className="rounded-full border border-ivory/30 px-4 py-1.5 text-sm hover:bg-ivory hover:text-ink">{b.title}</Link>
              ))}
            </div>
          </div>
          {cover && (
            <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl md:block">
              <Image src={cover} alt="" fill priority sizes="40vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>
      <Listing title="" products={products} sort={sort} crumbs={[{ href: `/colecao/${c.slug}`, label: c.title }]} />
      <div className="mx-auto max-w-7xl px-4">
        <Link href={`/colecao/${other.slug}`} className="group flex items-center justify-between rounded-2xl border border-line bg-sand p-6 hover:border-ink">
          <span><span className="eyebrow">{other.eyebrow}</span><span className="mt-1 block font-serif text-3xl">{other.title}</span></span>
          <span className="text-2xl transition group-hover:translate-x-1" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}
