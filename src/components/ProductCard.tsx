import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import Price from "./Price";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ p, priority }: { p: Product; priority?: boolean }) {
  const img = p.images?.[0];
  const img2 = p.images?.[1];
  const promo = p.price_promo != null && p.price_promo < p.price;
  return (
    <div className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
          {img && (
            <Image src={img.url} alt={img.alt || p.title} fill priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain p-3 transition duration-500 ${img2 ? "group-hover:opacity-0" : "group-hover:scale-105"}`} />
          )}
          {img2 && (
            <Image src={img2.url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3 opacity-0 transition duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {promo && <span className="rounded-full bg-leather px-2.5 py-1 text-[11px] font-semibold text-white">Promoção</span>}
            {p.is_new && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">Novidade</span>}
          </div>
        </div>
        <div className="mt-3 px-1">
          {p.brands && <p className="text-[11px] uppercase tracking-wider text-muted">{p.brands.title}</p>}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
          <Price productId={p.id} price={p.price} promo={p.price_promo} className="mt-1.5 text-sm" />
        </div>
      </Link>
      <WishlistButton productId={p.id} className="absolute right-3 top-3" />
    </div>
  );
}
