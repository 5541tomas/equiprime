"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { STORE } from "@/lib/config";
import { christmasOn } from "@/lib/campaign";
import { useStore } from "@/lib/store";
import SearchBox from "./SearchBox";
import { IconHeart, IconUser, IconWhatsApp, IconX } from "./icons";

type Node = Category & { children: Category[] };

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * Menu lateral do telemóvel. É desenhado diretamente no <body> (portal) para ocupar
 * sempre o ecrã inteiro, independentemente do cabeçalho.
 */
export default function MobileMenu({ tree, open, onClose }: { tree: Node[]; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { session, profile } = useStore();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false); // para a animação de entrada/saída
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  // abrir/fechar com animação e bloquear o scroll da página por trás
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      document.addEventListener("keydown", onKey);
      return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
    }
    setVisible(false);
  }, [open, onClose]);

  // fechar ao mudar de página
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || !open) return null;

  const isActive = (slug: string) => pathname === `/category/${slug}`;
  const xmas = christmasOn();

  return createPortal(
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />

      <nav className={`absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "-translate-x-full"}`}>
        {/* topo */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Link href="/" onClick={onClose} aria-label="Equi Prime — início">
            <Image src="/brand/logo-trim.png" alt="Equi Prime" width={120} height={50} className="h-9 w-auto" />
          </Link>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 hover:bg-sand" aria-label="Fechar menu"><IconX /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 pt-4">
            <SearchBox variant="mobile" onNavigate={onClose} />
          </div>

          {xmas && (
            <Link href="/presentes-de-natal" onClick={onClose}
              className="mx-5 mt-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3.5 text-ivory">
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d9b27c]">Natal</span>
                <span className="font-medium">Ideias de presente</span>
              </span>
              <span className="text-xl" aria-hidden="true">🎁</span>
            </Link>
          )}

          {/* categorias */}
          <p className="px-5 pb-1 pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Loja</p>
          <ul className="px-2">
            {tree.map((c) => {
              const isOpen = expanded === c.id;
              return (
                <li key={c.id} className="border-b border-line/70 last:border-0">
                  {c.children.length ? (
                    <button onClick={() => setExpanded(isOpen ? null : c.id)} aria-expanded={isOpen}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left text-[15px] font-medium hover:bg-sand">
                      {c.title}
                      <span className="flex items-center gap-2 text-muted">
                        <span className="text-xs">{c.children.length}</span>
                        <Chevron open={isOpen} />
                      </span>
                    </button>
                  ) : (
                    <Link href={`/category/${c.slug}`} onClick={onClose}
                      className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-[15px] font-medium hover:bg-sand ${isActive(c.slug) ? "text-leather" : ""}`}>
                      {c.title}
                    </Link>
                  )}
                  {isOpen && (
                    <div className="mb-2 ml-3 grid gap-0.5 border-l border-line pl-3">
                      <Link href={`/category/${c.slug}`} onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-leather hover:bg-sand">
                        Ver tudo em {c.title}
                      </Link>
                      {c.children.map((s) => (
                        <Link key={s.id} href={`/category/${s.slug}`} onClick={onClose}
                          className={`rounded-lg px-3 py-2 text-sm hover:bg-sand ${isActive(s.slug) ? "bg-sand font-semibold" : ""}`}>
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            <li>
              <Link href="/brands" onClick={onClose} className="flex rounded-xl px-3 py-3.5 text-[15px] font-medium hover:bg-sand">Marcas</Link>
            </li>
          </ul>

          {/* conta */}
          <p className="px-5 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Conta</p>
          <div className="grid grid-cols-2 gap-2 px-5">
            <Link href={profile?.is_admin ? "/admin" : "/conta"} onClick={onClose} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-white p-4 text-sm font-medium">
              <IconUser size={20} />
              {profile?.is_admin ? "Gestão da loja" : session ? "A minha conta" : "Entrar / Registar"}
            </Link>
            <Link href={session ? "/conta/lista-de-desejos" : "/conta"} onClick={onClose} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-white p-4 text-sm font-medium">
              <IconHeart size={20} />
              Lista de desejos
            </Link>
          </div>
          <div className="space-y-1 px-5 pb-6 pt-3 text-sm">
            <Link href="/revenda" onClick={onClose} className="block py-1.5 text-muted hover:text-ink">Revendedores</Link>
            <Link href="/envios" onClick={onClose} className="block py-1.5 text-muted hover:text-ink">Envios e devoluções</Link>
            <Link href="/como-comprar" onClick={onClose} className="block py-1.5 text-muted hover:text-ink">Como comprar</Link>
          </div>
        </div>

        {/* rodapé fixo com contacto */}
        <div className="border-t border-line p-4">
          <a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener" className="btn-whatsapp w-full">
            <IconWhatsApp size={18} /> Fale connosco · {STORE.phoneDisplay}
          </a>
        </div>
      </nav>
    </div>,
    document.body
  );
}
