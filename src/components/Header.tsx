"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { STORE } from "@/lib/config";
import { euro } from "@/lib/format";
import { IconBag, IconHeart, IconMenu, IconSearch, IconUser, IconX } from "./icons";

type Node = Category & { children: Category[] };

export default function Header({ tree }: { tree: Node[] }) {
  const { cartCount, setCartOpen, session, isB2B, profile } = useStore();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/catalog?q=${encodeURIComponent(q.trim())}`); setMenu(false); }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-ivory">
        {isB2B ? (
          <>Conta de revenda ativa — preços apresentados sem IVA</>
        ) : (
          <>Portes {euro(STORE.shippingCost)} · <strong>grátis acima de {euro(STORE.freeShippingFrom)}</strong> · Portugal, ilhas e Europa</>
        )}
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button className="lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menu"><IconMenu /></button>

        <Link href="/" className="shrink-0" aria-label="Equi Prime — início">
          <Image src="/brand/logo-trim.png" alt="Equi Prime" width={140} height={58} priority className="h-11 w-auto" />
        </Link>

        <nav className="ml-6 hidden flex-1 items-center gap-5 whitespace-nowrap lg:flex">
          {tree.slice(0, 6).map((c) => (
            <div key={c.id} className="group relative">
              <Link href={`/category/${c.slug}`} className="py-4 text-sm font-medium hover:text-leather">{c.title}</Link>
              {c.children.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 min-w-56 rounded-xl border border-line bg-white p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {c.children.map((s) => (
                    <Link key={s.id} href={`/category/${s.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">{s.title}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/brands" className="text-sm font-medium hover:text-leather">Marcas</Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <form onSubmit={search} className="relative hidden md:block">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="input w-44 rounded-full pl-9 xl:w-60" aria-label="Pesquisar produtos" />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IconSearch size={16} /></span>
          </form>
          <Link href={session ? "/conta/lista-de-desejos" : "/conta"} className="rounded-full p-2 hover:bg-sand" aria-label="Lista de desejos"><IconHeart /></Link>
          <Link href={profile?.is_admin ? "/admin" : "/conta"} className="rounded-full p-2 hover:bg-sand" aria-label="A minha conta"><IconUser /></Link>
          <button onClick={() => setCartOpen(true)} className="relative rounded-full p-2 hover:bg-sand" aria-label="Carrinho">
            <IconBag />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-leather px-1 text-[11px] font-semibold text-white">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-ivory p-5">
            <div className="mb-4 flex items-center justify-between">
              <Image src="/brand/logo-trim.png" alt="Equi Prime" width={120} height={50} className="h-10 w-auto" />
              <button onClick={() => setMenu(false)} aria-label="Fechar menu"><IconX /></button>
            </div>
            <form onSubmit={search} className="mb-4">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar produtos…" className="input rounded-full" />
            </form>
            {tree.map((c) => (
              <details key={c.id} className="border-b border-line py-2">
                <summary className="cursor-pointer list-none py-1 font-medium">{c.title}</summary>
                <Link href={`/category/${c.slug}`} onClick={() => setMenu(false)} className="block py-1.5 pl-3 text-sm text-leather">Ver tudo</Link>
                {c.children.map((s) => (
                  <Link key={s.id} href={`/category/${s.slug}`} onClick={() => setMenu(false)} className="block py-1.5 pl-3 text-sm">{s.title}</Link>
                ))}
              </details>
            ))}
            <Link href="/brands" onClick={() => setMenu(false)} className="border-b border-line py-3 font-medium">Marcas</Link>
            <Link href="/conta" onClick={() => setMenu(false)} className="border-b border-line py-3 font-medium">A minha conta</Link>
            <Link href="/revenda" onClick={() => setMenu(false)} className="py-3 font-medium">Revendedores</Link>
          </div>
        </div>
      )}
    </header>
  );
}
