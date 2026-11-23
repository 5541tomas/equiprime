import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { categoryTree, getBrands, getCategories, listProducts } from "@/lib/catalog";
import { STORE } from "@/lib/config";
import { euro } from "@/lib/format";
import { IconTruck, IconWhatsApp } from "@/components/icons";

export const revalidate = 300;

export default async function Home() {
  const [cats, brands, featured, latest] = await Promise.all([
    getCategories(), getBrands(), listProducts({ featured: true, limit: 8 }), listProducts({ sort: "novidades", limit: 8 }),
  ]);
  const roots = categoryTree(cats);
  const highlight = featured.length >= 4 ? featured : latest;

  // imagem representativa de cada categoria principal (primeiro produto)
  const catCovers = await Promise.all(
    roots.slice(0, 6).map(async (c) => {
      const ids = [c.id, ...c.children.map((x) => x.id)];
      const [p] = await listProducts({ categoryIds: ids, limit: 1 });
      return { ...c, cover: p?.images?.[0]?.url ?? null };
    })
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-sand">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow">Equipamento equestre</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-7xl">Para o cavaleiro<br />e para o cavalo.</h1>
            <p className="mt-6 max-w-md text-muted">
              Toques, estribos, proteções, mantas e cuidados das melhores marcas, escolhidos por quem monta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/catalog" className="btn">Ver todos os produtos</Link>
              <Link href="/catalog?sort=novidades" className="btn-outline">Novidades</Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-full bg-ivory" />
            <Image src="/brand/icon.png" alt="" fill sizes="(max-width: 768px) 80vw, 420px" className="rounded-full object-contain p-16 mix-blend-multiply" priority />
          </div>
        </div>
      </section>

      {/* Vantagens */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3"><IconTruck className="text-leather" /> Portes {euro(STORE.shippingCost)} · grátis acima de {euro(STORE.freeShippingFrom)}</div>
          <div className="flex items-center gap-3"><span className="text-[#1f8f4e]"><IconWhatsApp /></span> Encomendas confirmadas por WhatsApp</div>
          <div className="flex items-center gap-3"><span className="font-serif text-xl text-leather">B2B</span> Condições especiais para revendedores</div>
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-4xl">Categorias</h2>
          <Link href="/catalog" className="text-sm font-medium underline-offset-4 hover:underline">Ver tudo</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {catCovers.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              {c.cover && <Image src={c.cover} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain p-6 transition duration-500 group-hover:scale-105" />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                <p className="font-serif text-2xl text-white md:text-3xl">{c.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      {highlight.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-serif text-4xl">{featured.length >= 4 ? "Destaques" : "Novidades"}</h2>
            <Link href="/catalog?sort=novidades" className="text-sm font-medium underline-offset-4 hover:underline">Ver mais</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {highlight.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
          </div>
        </section>
      )}

      {/* Marcas */}
      {brands.length > 0 && (
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <h2 className="mb-8 text-center font-serif text-3xl">As nossas marcas</h2>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {brands.map((b) => (
                <Link key={b.id} href={`/brand/${b.slug}`} className="opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
                  {b.logo_url ? (
                    <Image src={b.logo_url} alt={b.title} width={120} height={60} className="h-12 w-auto object-contain" />
                  ) : (
                    <span className="font-serif text-xl">{b.title}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Revenda */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="grid items-center gap-8 rounded-2xl border border-line bg-sand p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <p className="eyebrow">Revendedores</p>
            <h2 className="mt-2 font-serif text-4xl">Tem uma loja ou centro hípico?</h2>
            <p className="mt-3 max-w-xl text-muted">Crie uma conta de revenda e, após aprovação, veja os preços profissionais sem IVA em toda a loja.</p>
          </div>
          <Link href="/revenda" className="btn">Pedir conta de revenda</Link>
        </div>
      </section>
    </>
  );
}
