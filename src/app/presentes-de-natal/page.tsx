import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import VoucherBanner from "@/components/VoucherBanner";
import { isVoucherSlug } from "@/lib/voucher";
import { descendantIds, getCategories, listProducts } from "@/lib/catalog";
import { CHRISTMAS } from "@/lib/campaign";
import { STORE } from "@/lib/config";
import { effectivePrice } from "@/lib/facets";
import type { Product } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Presentes de Natal para quem monta",
  description: "Ideias de presente de Natal para cavaleiros e amazonas e mimos para o cavalo, organizadas por preço. Envio para todo o país.",
  alternates: { canonical: "/presentes-de-natal" },
};

const BUDGETS = [
  { id: "ate-25", title: "Até 25 €", sub: "Pequenos mimos e lembranças", min: 0, max: 25 },
  { id: "25-50", title: "De 25 € a 50 €", sub: "O presente certo para o dia a dia no picadeiro", min: 25, max: 50 },
  { id: "50-100", title: "De 50 € a 100 €", sub: "Presentes que ficam", min: 50, max: 100 },
  { id: "100-mais", title: "Mais de 100 €", sub: "Para impressionar", min: 100, max: Infinity },
];

// produtos com mais fotos e em destaque primeiro (apresentam-se melhor como presente)
const giftOrder = (a: Product, b: Product) =>
  Number(b.featured) - Number(a.featured) || (b.images?.length ?? 0) - (a.images?.length ?? 0);

export default async function GiftsPage() {
  const [all, cats] = await Promise.all([listProducts({ sort: "novidades" }), getCategories()]);
  const voucher = all.find((p) => isVoucherSlug(p.slug));
  const withImg = all.filter((p) => p.images?.length && !isVoucherSlug(p.slug));
  const onSale = withImg.filter((p) => p.price_promo != null && Number(p.price_promo) < Number(p.price)).sort((a, b) => effectivePrice(a) - effectivePrice(b));

  const bySlug = (slug: string) => cats.find((c) => c.slug === slug);
  const idsOf = async (slugs: string[]) => {
    const ids = slugs.flatMap((s) => { const c = bySlug(s); return c ? descendantIds(cats, c.id) : []; });
    return ids.length ? new Set((await listProducts({ categoryIds: ids })).map((p) => p.id)) : new Set<number>();
  };
  const [riderIds, horseIds] = await Promise.all([idsOf(["cavaleiro", "acessorios"]), idsOf(["cuidados", "cavalo", "nutricao-e-saude"])]);

  const forRider = withImg.filter((p) => riderIds.has(p.id)).sort(giftOrder).slice(0, 8);
  const forHorse = withImg.filter((p) => horseIds.has(p.id)).sort(giftOrder).slice(0, 8);

  return (
    <div>
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b27c]">Natal {new Date().getFullYear()}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">Presentes para quem monta</h1>
          <p className="mt-4 max-w-xl text-ivory/75">Não sabe o que oferecer a quem anda a cavalo? Escolhemos ideias para todos os orçamentos — para o cavaleiro e para o cavalo.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[{ href: "#vales", label: "🎁 Vales de oferta" }, { href: "#promocoes", label: "−10% Promoções" }, ...BUDGETS.map((b) => ({ href: `#${b.id}`, label: b.title })), { href: "#cavaleiro", label: "Para o cavaleiro" }, { href: "#cavalo", label: "Para o cavalo" }].map((l) => (
              <a key={l.href} href={l.href} className="rounded-full border border-ivory/30 px-4 py-2 text-sm hover:bg-ivory hover:text-ink">{l.label}</a>
            ))}
          </div>
          <p className="mt-8 rounded-xl bg-white/10 p-4 text-sm">
            🎁 Para receber antes do Natal, encomende até <strong>{CHRISTMAS.deadlineMainland}</strong> (Portugal continental) ou até <strong>{CHRISTMAS.deadlineIslands}</strong> (Açores e Madeira). Para o resto da Europa, fale connosco.
            Portes grátis acima de 100 €.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {voucher && (
          <section id="vales" className="scroll-mt-28 pt-16"><VoucherBanner image={voucher.images?.[0]?.url ?? null} /></section>
        )}
        {onSale.length > 0 && (
          <Shelf id="promocoes" title="Promoções de Natal · −10%" sub="Desconto direto, já aplicado no preço, até ao Natal" items={onSale} />
        )}
        {BUDGETS.map((b) => {
          const items = withImg.filter((p) => { const x = effectivePrice(p); return x >= b.min && x < b.max; }).sort(giftOrder).slice(0, 8);
          if (!items.length) return null;
          return <Shelf key={b.id} id={b.id} title={b.title} sub={b.sub} items={items} />;
        })}
        {forRider.length > 0 && <Shelf id="cavaleiro" title="Para o cavaleiro" sub="Roupa, toques, luvas e acessórios" items={forRider} more={{ href: "/category/cavaleiro", label: "Ver tudo para o cavaleiro" }} />}
        {forHorse.length > 0 && <Shelf id="cavalo" title="Para o cavalo" sub="Guloseimas, brinquedos e cuidados" items={forHorse} more={{ href: "/category/cuidados", label: "Ver cuidados e guloseimas" }} />}

        <section className="mt-16 rounded-2xl border border-line bg-sand p-8 text-center">
          <h2 className="font-serif text-3xl">Ainda com dúvidas?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted">Diga-nos para quem é o presente e o orçamento — ajudamos a escolher, incluindo o tamanho certo.</p>
          <a href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent("Olá! Procuro um presente de Natal para ")}`} target="_blank" rel="noopener" className="btn-whatsapp mt-6">Pedir ajuda por WhatsApp</a>
        </section>
      </div>
    </div>
  );
}

function Shelf({ id, title, sub, items, more }: { id: string; title: string; sub: string; items: Product[]; more?: { href: string; label: string } }) {
  return (
    <section id={id} className="scroll-mt-28 pt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-4xl">{title}</h2>
          <p className="text-sm text-muted">{sub}</p>
        </div>
        {more && <Link href={more.href} className="text-sm font-medium underline-offset-4 hover:underline">{more.label}</Link>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
