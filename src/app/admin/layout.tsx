"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import AuthForm from "@/components/AuthForm";

const NAV = [
  ["/admin", "Encomendas"],
  ["/admin/produtos", "Produtos"],
  ["/admin/cupoes", "Cupões"],
  ["/admin/avaliacoes", "Avaliações"],
  ["/admin/clientes", "Clientes e revenda"],
  ["/admin/newsletter", "Newsletter"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, session, profile } = useStore();
  const path = usePathname();

  if (!ready || (session && !profile)) return <div className="py-32 text-center text-muted">A carregar…</div>;
  if (!session) return <div className="px-4 py-16"><h1 className="mb-8 text-center font-serif text-4xl">Gestão da loja</h1><AuthForm /></div>;
  if (!profile?.is_admin) return <div className="py-32 text-center">Sem acesso a esta área.</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <p className="mr-4 font-serif text-2xl">Gestão</p>
        {NAV.map(([href, label]) => {
          const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`rounded-full px-4 py-2 text-sm font-medium ${on ? "bg-ink text-ivory" : "hover:bg-sand"}`}>{label}</Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
