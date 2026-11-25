import Link from "next/link";
import Image from "next/image";

/** Destaque dos vales de oferta (página de presentes e página inicial). */
export default function VoucherBanner({ image }: { image: string | null }) {
  return (
    <Link href="/product/vale-de-oferta" className="group grid items-center gap-6 overflow-hidden rounded-3xl border border-line bg-sand p-6 md:grid-cols-[1fr_1.1fr] md:p-10">
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl md:max-w-none">
        {image && <Image src={image} alt="Vale de oferta Equi Prime" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover transition duration-700 group-hover:scale-105" />}
      </div>
      <div>
        <p className="eyebrow">Não sabe o que escolher?</p>
        <h2 className="mt-2 font-serif text-4xl md:text-5xl">Ofereça um vale</h2>
        <p className="mt-3 max-w-md text-muted">Vales de <strong className="text-ink">25 €, 50 €</strong> ou <strong className="text-ink">100 €</strong> para quem anda a cavalo escolher o que quiser. Entrega digital por WhatsApp, sem portes — perfeito para a última hora.</p>
        <span className="btn mt-6">Comprar vale de oferta</span>
      </div>
    </Link>
  );
}
