import Link from "next/link";
import Image from "next/image";
import { getBrands } from "@/lib/catalog";

export const metadata = { title: "Marcas" };
export const revalidate = 300;

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-serif text-5xl">Marcas</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <Link key={b.id} href={`/brand/${b.slug}`} className="card flex aspect-[3/2] flex-col items-center justify-center gap-3 p-6 transition hover:border-ink">
            {b.logo_url && <Image src={b.logo_url} alt="" width={140} height={70} className="h-14 w-auto object-contain" />}
            <span className="font-medium">{b.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
