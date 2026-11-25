import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { categoryTree, getBrands, getCategories, listProducts } from "@/lib/catalog";
import { STORE } from "@/lib/config";
import { euro } from "@/lib/format";
import { IconTruck, IconWhatsApp } from "@/components/icons";
import { CHRISTMAS, christmasOn } from "@/lib/campaign";
import { COLLECTIONS, collectionCover } from "@/lib/collections";
import VoucherBanner from "@/components/VoucherBanner";
import { isVoucherSlug } from "@/lib/voucher";

export const revalidate = 300;

export default async function Home() {
  const [cats, brands, featured, latest] = await Promise.all([
    getCategories(), getBrands(), listProducts({ featured: true, limit: 8 }), listProducts({ sort: "novidades", limit: 8 }),
  ]);
  const roots = categoryTree(cats);
  const highlight = (featured.length >= 4 ? featured : latest).filter((p) => !isVoucherSlug(p.slug) && !p.slug.startsWith("kit-"));
  const xmas = christmasOn();
  const kits = (await listProducts({ sort: "novidades" })).filter((p) => p.slug.startsWith("kit-") && p.images?.length && (xmas || p.slug !== "kit-natal-do-cavalo"));
  const voucher = xmas ? latest.find((p) => isVoucherSlug(p.slug)) ?? (await listProducts({})).find((p) => isVoucherSlug(p.slug)) : undefined;
  const collections = await Promise.all(COLLECTIONS.map(async (c) => ({ ...c, cover: await collectionCover(c) })));
  // marcas que distinguem a loja primeiro; as restantes a seguir
  const SIGNATURE = ["pomme", "maximilian-equestrian", "equestro", "likit", "stud-muffins", "horslyx"];
  const sortedBrands = [...brands].sort((a, b) => {
    const ia = SIGNATURE.indexOf(a.slug), ib = SIGNATURE.indexOf(b.slug);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.title.localeCompare(b.title, "pt");
  });
  const onSale = xmas ? (await listProducts({ sort: "novidades" })).filter((p) => p.price_promo != null && Number(p.price_promo) < Number(p.price) && p.images?.length && !p.slug.startsWith("kit-")) : [];
  // fotos do topo: produtos em destaque com várias fotos (normalmente fotos com modelo/ambiente)
  const heroShots = [...featured, ...latest].filter((p, i, a) => p.images?.length > 1 && a.findIndex((x) => x.id === p.id) === i);

  // imagem representativa de cada categoria principal (primeiro produto)
  const catCovers = await Promise.all(
    roots.slice(0, 6).map(async (c) => {
      const ids = [c.id, ...c.children.map((x) => x.id)];
      const [p] = await listProducts({ categoryIds: ids, featured: true, limit: 1 }).then((r) => (r.length ? r : listProducts({ categoryIds: ids, limit: 1 })));
      return { ...c, cover: p?.images?.[0]?.url ?? null };
    })
  );

  return (
    <>
      {/* Hero: campanha de Natal até dia 25, depois mensagem normal — sempre com fotos reais */}
      <section className={`relative overflow-hidden border-b border-line ${xmas ? "bg-ink text-ivory" : "bg-sand"}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            {xmas ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b27c]">Natal na Equi Prime</p>
                <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-7xl">Presentes para<br />quem monta.</h1>
                <p className="mt-6 max-w-md text-ivory/75">
                  Ideias para todos os orçamentos — para o cavaleiro e para o cavalo. Encomende até {CHRISTMAS.deadlineMainland} para receber antes do Natal.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/presentes-de-natal" className="btn bg-ivory text-ink hover:bg-white">Ver ideias de presente</Link>
                  <Link href="/colecao/moda-equestre" className="btn-outline border-ivory text-ivory hover:bg-ivory hover:text-ink">Moda Equestre</Link>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">Moda equestre · Mimos para o cavalo</p>
                <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-7xl">Estilo no picadeiro.<br />Mimos na box.</h1>
                <p className="mt-6 max-w-md text-muted">Calças, polos e camisolas Pomme, Maximilian e Equestro — e guloseimas e brinquedos Likit, Stud Muffins e Horslyx para o seu cavalo. Marcas que dificilmente encontra noutras lojas.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/colecao/moda-equestre" className="btn">Moda Equestre</Link>
                  <Link href="/colecao/mimos-para-o-cavalo" className="btn-outline">Mimos para o Cavalo</Link>
                </div>
              </>
            )}
          </div>
          {heroShots.length >= 3 && (
            <div className="grid h-72 grid-cols-2 grid-rows-2 gap-3 md:h-[460px]">
              {heroShots.slice(0, 3).map((p, i) => (
                <Link key={p.id} href={`/product/${p.slug}`} className={`group relative overflow-hidden rounded-2xl bg-white ${i === 0 ? "row-span-2" : ""}`}>
                  <Image src={p.images[0].url} alt={p.images[0].alt || p.title} fill priority sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 text-xs font-medium text-white">{p.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Vantagens */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3"><IconTruck className="text-leather" /> Portes {euro(STORE.shippingCost)} · grátis acima de {euro(STORE.freeShippingFrom)}</div>
          <div className="flex items-center gap-3"><span className="font-serif text-xl text-leather">✦</span> Pomme, Maximilian, Likit e outras marcas difíceis de encontrar</div>
          <div className="flex items-center gap-3"><span className="text-[#1f8f4e]"><IconWhatsApp /></span> Dúvidas de tamanho? Ajudamos por WhatsApp</div>
        </div>
      </section>

      {/* Promoções de Natal */}
      {xmas && onSale.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Só até ao Natal</p>
              <h2 className="mt-1 font-serif text-4xl">Promoções de Natal · −10%</h2>
            </div>
            <Link href="/presentes-de-natal#promocoes" className="text-sm font-medium underline-offset-4 hover:underline">Ver todas</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {onSale.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Coleções: o que distingue a loja */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="grid gap-4 md:grid-cols-2">
          {collections.map((c) => (
            <Link key={c.slug} href={`/colecao/${c.slug}`} className="group relative flex min-h-[420px] overflow-hidden rounded-3xl bg-ink md:min-h-[520px]">
              {c.cover && <Image src={c.cover} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-90 transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative mt-auto p-7 text-ivory md:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b27c]">{c.eyebrow}</p>
                <h2 className="mt-2 font-serif text-4xl md:text-5xl">{c.title}</h2>
                <p className="mt-3 max-w-md text-sm text-ivory/80">{c.intro}</p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-sm font-semibold text-ink">
                  Explorar <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Kits prontos a oferecer */}
      {kits.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Poupe ao comprar em conjunto</p>
              <h2 className="mt-1 font-serif text-4xl">Kits prontos a oferecer</h2>
            </div>
            <Link href="/presentes-de-natal#kits" className="text-sm font-medium underline-offset-4 hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {kits.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Vales de oferta (época de Natal) */}
      {xmas && voucher && (
        <section className="mx-auto max-w-7xl px-4 pt-16"><VoucherBanner image={voucher.images?.[0]?.url ?? null} /></section>
      )}

      {/* Categorias */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-4xl">Categorias</h2>
          <Link href="/catalog" className="text-sm font-medium underline-offset-4 hover:underline">Ver tudo</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {catCovers.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              {c.cover ? (
                <Image src={c.cover} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain p-6 pb-14 transition duration-500 group-hover:scale-105" />
              ) : (
                <Image src="/brand/icon.png" alt="" fill sizes="33vw" className="object-contain p-10 pb-16 opacity-20" />
              )}
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
            <h2 className="text-center font-serif text-3xl">Marcas que nos distinguem</h2>
            <p className="mb-8 mt-2 text-center text-sm text-muted">Moda equestre e mimos que dificilmente encontra noutras lojas em Portugal.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {sortedBrands.map((b) => (
                <Link key={b.id} href={`/brand/${b.slug}`} className={`transition hover:opacity-100 hover:grayscale-0 ${SIGNATURE.includes(b.slug) ? "opacity-90" : "opacity-50 grayscale"}`}>
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
