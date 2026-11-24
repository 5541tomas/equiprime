"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { WELCOME } from "@/lib/config";
import { IconX } from "./icons";

const KEY = "equiprime-welcome";
// não interromper quem está a comprar, a gerir a loja ou na conta
const SKIP = ["/checkout", "/admin", "/conta", "/revenda"];

export default function WelcomeOffer() {
  const pathname = usePathname();
  const { isB2B, session } = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isB2B || session || SKIP.some((p) => pathname.startsWith(p))) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem(KEY); } catch {}
    // mostra no máximo uma vez a cada 30 dias
    if (seen && Date.now() - Number(seen) < 30 * 864e5) return;

    const show = () => { setOpen(true); try { localStorage.setItem(KEY, String(Date.now())); } catch {} cleanup(); };
    const timer = setTimeout(show, 12000);
    const onScroll = () => { if (window.scrollY > document.body.scrollHeight * 0.4) show(); };
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) show(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    function cleanup() { clearTimeout(timer); window.removeEventListener("scroll", onScroll); document.removeEventListener("mouseleave", onLeave); }
    return cleanup;
  }, [pathname, isB2B, session]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db().from("newsletter").insert({ email: email.trim().toLowerCase() }); // repetido também serve
    setDone(true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(WELCOME.code); setCopied(true); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-label="Oferta de boas-vindas">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-ivory sm:rounded-3xl">
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-ivory/90 p-1.5" aria-label="Fechar"><IconX size={18} /></button>
        <div className="bg-ink px-8 pb-8 pt-10 text-center text-ivory">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b27c]">Bem-vindo à Equi Prime</p>
          <p className="mt-3 font-serif text-6xl leading-none">{WELCOME.percent}%</p>
          <p className="mt-2 text-lg">de desconto na primeira compra</p>
        </div>
        <div className="p-8">
          {!done ? (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-center text-sm text-muted">Deixe o seu e-mail e receba já o código. Também lhe enviamos novidades e promoções (pode sair quando quiser).</p>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="O seu e-mail" aria-label="E-mail" className="input rounded-full text-center" />
              <button className="btn w-full">Quero o meu desconto</button>
              <button type="button" onClick={() => setOpen(false)} className="w-full text-xs text-muted underline">Não, obrigado</button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted">O seu código:</p>
              <button onClick={copy} className="mt-2 w-full rounded-2xl border-2 border-dashed border-leather bg-white py-4 font-mono text-2xl font-semibold tracking-widest">
                {WELCOME.code}
              </button>
              <p className="mt-2 text-xs text-muted">{copied ? "Copiado ✓" : "Toque para copiar"} · Use no carrinho, no campo “Código de desconto”.</p>
              <button onClick={() => setOpen(false)} className="btn mt-5 w-full">Começar a comprar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
