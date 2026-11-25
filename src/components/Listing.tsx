import Link from "next/link";
import { Suspense } from "react";
import FilteredGrid from "./FilteredGrid";
import type { Category, Product } from "@/lib/types";

export default function Listing({
  title, intro, products, crumbs = [], subcats = [], sort, hideBrand,
}: {
  title: string; intro?: string; products: Product[]; crumbs?: { href: string; label: string }[];
  subcats?: Category[]; sort?: string; hideBrand?: boolean;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-4 text-xs text-muted" aria-label="Navegação estrutural">
        <Link href="/" className="hover:text-ink">Início</Link>
        {crumbs.map((c) => (<span key={c.href}> / <Link href={c.href} className="hover:text-ink">{c.label}</Link></span>))}
      </nav>
      {title && <h1 className="font-serif text-5xl">{title}</h1>}
      {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}

      {subcats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {subcats.map((s) => (
            <Link key={s.id} href={`/category/${s.slug}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-ink">{s.title}</Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        {products.length === 0 ? (
          <p className="py-20 text-center text-muted">Não encontrámos produtos.</p>
        ) : (
          <Suspense>
            <FilteredGrid products={products} sort={sort} hideBrand={hideBrand} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
