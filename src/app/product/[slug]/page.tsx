import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProduct, getReviews, listProducts } from "@/lib/catalog";
import { STORE } from "@/lib/config";
import { stripHtml } from "@/lib/format";
import ProductBuy from "@/components/ProductBuy";
import Gallery from "@/components/Gallery";
import Reviews from "@/components/Reviews";
import ProductCard from "@/components/ProductCard";
import { COMPLEMENTS, baseName } from "@/lib/complements";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
// páginas geradas no primeiro acesso e guardadas em cache (ISR)
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const desc = p.seo_description || stripHtml(p.excerpt || p.description).slice(0, 160);
  return {
    title: p.seo_title || p.title,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.title, description: desc, images: p.images.slice(0, 1).map((i) => i.url), type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [reviews, cats] = await Promise.all([getReviews(p.id), getCategories()]);
  const myCats = cats.filter((c) => p.product_categories.some((pc) => pc.category_id === c.id));
  const mainCat = myCats.find((c) => c.parent_id) ?? myCats[0];
  const parentCat = mainCat?.parent_id ? cats.find((c) => c.id === mainCat.parent_id) : null;
  const related = mainCat
    ? (await listProducts({ categoryIds: [mainCat.id], limit: 9 })).filter((x) => x.id !== p.id).slice(0, 4)
    : [];

  // "Combina bem com…": categorias complementares (ex.: calças → meias, luvas, cintos)
  const targetSlugs = [...new Set(myCats.flatMap((c) => COMPLEMENTS[c.slug] ?? []))];
  const targetIds = targetSlugs.map((s) => cats.find((c) => c.slug === s)?.id).filter((x): x is number => !!x);
  const seen = new Set([baseName(p.title), ...related.map((r) => baseName(r.title))]);
  const complements = targetIds.length
    ? (await listProducts({ categoryIds: targetIds }))
        .filter((x) => x.id !== p.id && x.images?.length && !related.some((r) => r.id === x.id))
        // ordem: categoria preferida primeiro, depois produtos em destaque/com mais fotos
        .sort((a, b) => Number(b.featured) - Number(a.featured) || (b.images?.length ?? 0) - (a.images?.length ?? 0))
        .filter((x) => { const k = baseName(x.title); if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 4)
    : [];

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const price = p.price_promo ?? p.price;
  const inStock = !p.variants?.length || p.variants.some((v) => v.stock == null || v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    image: p.images.map((i) => i.url),
    description: stripHtml(p.description).slice(0, 5000),
    brand: p.brands ? { "@type": "Brand", name: p.brands.title } : undefined,
    offers: {
      "@type": "Offer",
      url: `${STORE.url}/product/${p.slug}`,
      priceCurrency: "EUR",
      price: Number(price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: STORE.shippingCost, currency: "EUR" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "PT" },
      },
    },
    ...(avg ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length } } : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-xs text-muted" aria-label="Navegação estrutural">
        <Link href="/" className="hover:text-ink">Início</Link>
        {parentCat && <> / <Link href={`/category/${parentCat.slug}`} className="hover:text-ink">{parentCat.title}</Link></>}
        {mainCat && <> / <Link href={`/category/${mainCat.slug}`} className="hover:text-ink">{mainCat.title}</Link></>}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
        <Gallery images={p.images} title={p.title} />
        <div>
          {p.brands && (
            <Link href={`/brand/${p.brands.slug}`} className="eyebrow hover:underline">{p.brands.title}</Link>
          )}
          <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">{p.title}</h1>
          {avg && (
            <a href="#avaliacoes" className="mt-2 inline-block text-sm text-muted hover:text-ink">
              {"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))} · {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
            </a>
          )}
          <ProductBuy product={{ id: p.id, slug: p.slug, title: p.title, price: p.price, price_promo: p.price_promo, image: p.images[0]?.url ?? null }} variants={p.variants ?? []} />

          {p.description && (
            <details open className="mt-8 border-t border-line pt-5">
              <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wider">Descrição</summary>
              <div className="prose-shop mt-4 text-sm leading-relaxed text-ink/85" dangerouslySetInnerHTML={{ __html: p.description }} />
            </details>
          )}
          <details className="mt-4 border-t border-line pt-5">
            <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wider">Envios</summary>
            <p className="mt-3 text-sm text-muted">
              Envio por CTT para Portugal continental, ilhas e Europa por 3,90 €, grátis em encomendas acima de 100 €. Também pode levantar a encomenda — combinamos consigo por WhatsApp.
            </p>
          </details>
        </div>
      </div>

      {complements.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-3xl">Combina bem com</h2>
          <p className="mb-8 mt-1 text-sm text-muted">Escolhidos para completar a sua compra.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {complements.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}

      <Reviews productId={p.id} reviews={reviews} />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 font-serif text-3xl">Também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
