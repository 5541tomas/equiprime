import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-3 font-serif text-5xl">Página não encontrada</h1>
      <p className="mt-4 text-muted">O produto ou página que procura pode ter mudado de lugar.</p>
      <div className="mt-8 flex justify-center gap-3"><Link href="/" className="btn">Ir para o início</Link><Link href="/catalog" className="btn-outline">Ver produtos</Link></div>
    </div>
  );
}
