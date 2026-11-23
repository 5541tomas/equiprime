import Link from "next/link";
import ProductCard from "./ProductCard";
import SortSelect from "./SortSelect";
import type { Category, Product } from "@/lib/types";

export default function Listing({
  title, intro, products, crumbs = [], subcats = [], sort,
}: {
  title: string; intro?: string; products: Product[]; crumbs?: { href: string; label: string }[];
  subcats?: Category[]; sort?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-4 text-xs text-muted" aria-label="Navegação estrutural">
        <Link href="/" className="hover:text-ink">Início</Link>
        {crumbs.map((c) => (<span key={c.href}> / <Link href={c.href} className="hover:text-ink">{c.label}</Link></span>))}
      </nav>
      <h1 className="font-serif text-5xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}

      {subcats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {subcats.map((s) => (
            <Link key={s.id} href={`/category/${s.slug}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-ink">{s.title}</Link>
          ))}
        </div>
      )}

      <div className="mb-6 mt-8 flex items-center justify-between border-b border-line pb-4">
        <p className="text-sm text-muted">{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
        <SortSelect value={sort ?? "relevancia"} />
      </div>

      {products.length === 0 ? (
        <p className="py-20 text-center text-muted">Não encontrámos produtos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
