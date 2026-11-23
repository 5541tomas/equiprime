"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { IconHeart } from "./icons";

export default function WishlistButton({ productId, className = "", label }: { productId: number; className?: string; label?: boolean }) {
  const { wishlist, toggleWishlist } = useStore();
  const router = useRouter();
  const on = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        if ((await toggleWishlist(productId)) === "login") router.push("/conta?next=wishlist");
      }}
      aria-pressed={on}
      aria-label={on ? "Remover da lista de desejos" : "Adicionar à lista de desejos"}
      className={label
        ? `btn-outline ${className}`
        : `rounded-full bg-white/90 p-2 shadow-sm transition hover:scale-110 ${on ? "text-leather" : "text-ink"} ${className}`}
    >
      <IconHeart size={label ? 18 : 18} filled={on} />
      {label && (on ? "Na lista de desejos" : "Lista de desejos")}
    </button>
  );
}
