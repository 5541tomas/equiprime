"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Ordenar</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          p.set("sort", e.target.value);
          router.push(`${pathname}?${p.toString()}`);
        }}
        className="rounded-full border border-line bg-white px-3 py-1.5"
      >
        <option value="relevancia">Relevância</option>
        <option value="novidades">Novidades</option>
        <option value="preco-asc">Preço: mais baixo</option>
        <option value="preco-desc">Preço: mais alto</option>
      </select>
    </label>
  );
}
