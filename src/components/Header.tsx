"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { STORE } from "@/lib/config";
import { euro } from "@/lib/format";
import { IconBag, IconHeart, IconMenu, IconSearch, IconUser } from "./icons";
import SearchBox from "./SearchBox";
import MobileMenu from "./MobileMenu";
import { CHRISTMAS, christmasOn } from "@/lib/campaign";

type Node = Category & { children: Category[] };

export default function Header({ tree }: { tree: Node[] }) {
  const { cartCount, setCartOpen, session, isB2B, profile } = useStore();
  const [menu, setMenu] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-ivory">
        {isB2B ? (
          <>Conta de revenda ativa — preços apresentados sem IVA</>
        ) : christmasOn() ? (
          <Link href="/presentes-de-natal" className="hover:underline">🎁 Natal: encomende até <strong>{CHRISTMAS.deadlineMainland}</strong> para receber a tempo · Portes grátis acima de {euro(STORE.freeShippingFrom)}</Link>
        ) : (
          <>Portes {euro(STORE.shippingCost)} · <strong>grátis acima de {euro(STORE.freeShippingFrom)}</strong> · Portugal, ilhas e Europa</>
        )}
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button className="-ml-2 rounded-full p-2 hover:bg-sand lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu}><IconMenu /></button>

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
          {christmasOn() && <Link href="/presentes-de-natal" className="text-sm font-semibold text-leather hover:underline">Presentes 🎁</Link>}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchBox />
          <button onClick={() => setMobileSearch((v) => !v)} className="rounded-full p-2 hover:bg-sand md:hidden" aria-label="Pesquisar" aria-expanded={mobileSearch}>
            <IconSearch />
          </button>
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

      {mobileSearch && (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <SearchBox variant="mobile" onNavigate={() => setMobileSearch(false)} />
        </div>
      )}

      <MobileMenu tree={tree} open={menu} onClose={closeMenu} />
    </header>
  );
}
