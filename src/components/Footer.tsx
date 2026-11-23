import Link from "next/link";
import Image from "next/image";
import { STORE } from "@/lib/config";
import type { Category } from "@/lib/types";
import NewsletterForm from "./NewsletterForm";

export default function Footer({ tree }: { tree: (Category & { children: Category[] })[] }) {
  return (
    <footer className="mt-20 border-t border-line bg-sand">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink p-8 text-ivory md:flex-row md:items-center">
          <div>
            <p className="font-serif text-3xl">Novidades e promoções</p>
            <p className="mt-1 text-sm text-ivory/70">Subscreva a newsletter e seja o primeiro a saber.</p>
          </div>
          <NewsletterForm dark />
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/brand/logo-trim.png" alt="Equi Prime" width={150} height={62} className="h-12 w-auto" />
            <p className="mt-4 text-sm text-muted">Equipamento equestre de qualidade para cavaleiro e cavalo.</p>
            <p className="mt-3 text-sm">{STORE.city}, Portugal</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Loja</p>
            <ul className="space-y-2 text-sm text-muted">
              {tree.slice(0, 6).map((c) => (<li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-ink">{c.title}</Link></li>))}
              <li><Link href="/brands" className="hover:text-ink">Marcas</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Ajuda</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/envios" className="hover:text-ink">Envios e devoluções</Link></li>
              <li><Link href="/como-comprar" className="hover:text-ink">Como comprar</Link></li>
              <li><Link href="/revenda" className="hover:text-ink">Revendedores</Link></li>
              <li><Link href="/termos" className="hover:text-ink">Termos e condições</Link></li>
              <li><Link href="/privacidade" className="hover:text-ink">Política de privacidade</Link></li>
              <li><a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener" className="hover:text-ink">Livro de reclamações</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Contactos</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href={`https://wa.me/${STORE.whatsapp}`} className="hover:text-ink">WhatsApp {STORE.phoneDisplay}</a></li>
              <li><a href={`mailto:${STORE.email}`} className="hover:text-ink">{STORE.email}</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">© {new Date().getFullYear()} Equi Prime. Todos os direitos reservados. Preços com IVA incluído à taxa legal em vigor.</p>
      </div>
    </footer>
  );
}
