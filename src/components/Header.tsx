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
import { COLLECTIONS } from "@/lib/collectionsData";
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

        <nav className="ml-5 hidden flex-1 items-center gap-4 whitespace-nowrap lg:flex 2xl:gap-5">
          {/* coleções primeiro: é o que distingue a loja */}
          {COLLECTIONS.map((col) => {
            const sub = col.slug === "moda-equestre" ? tree.find((c) => c.slug === "cavaleiro")?.children ?? [] : [];
            return (
              <div key={col.slug} className="group relative">
                <Link href={`/colecao/${col.slug}`} className="py-4 text-sm font-semibold hover:text-leather">{col.short}</Link>
                {sub.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-50 min-w-56 rounded-xl border border-line bg-white p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                    <Link href={`/colecao/${col.slug}`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-leather hover:bg-sand">Ver toda a coleção</Link>
                    {sub.map((s) => (
                      <Link key={s.id} href={`/category/${s.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">{s.title}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <span className="hidden h-4 w-px bg-line xl:block" aria-hidden="true" />
          {/* restantes categorias só quando há espaço (o menu lateral e "Marcas" mostram todas) */}
          {tree.filter((c) => !["cavaleiro", "acessorios"].includes(c.slug)).slice(0, 4).map((c, i) => (
            <div key={c.id} className={`group relative ${i < 2 ? "hidden xl:block" : "hidden 2xl:block"}`}>
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
          <Link href="/brands" className="hidden text-sm font-medium hover:text-leather xl:block">Marcas</Link>
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
