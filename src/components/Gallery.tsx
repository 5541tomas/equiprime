"use client";

import Image from "next/image";
import { useState } from "react";
import type { Img } from "@/lib/types";

export default function Gallery({ images, title }: { images: Img[]; title: string }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        {cur ? (
          <Image src={cur.url} alt={cur.alt || title} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-4" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">Sem imagem</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((im, k) => (
            <button key={im.url} onClick={() => setI(k)} aria-label={`Imagem ${k + 1}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${k === i ? "border-ink" : "border-transparent"}`}>
              <Image src={im.url} alt="" fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
