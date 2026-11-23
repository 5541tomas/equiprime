"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";
import { STORE } from "@/lib/config";

export default function AuthForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = db().auth;
    if (mode === "login") {
      const { error } = await sb.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: "E-mail ou palavra-passe incorretos." });
      else onDone?.();
    } else if (mode === "signup") {
      const { data, error } = await sb.signUp({
        email, password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/conta` },
      });
      if (error) setMsg({ ok: false, text: error.message.includes("registered") ? "Este e-mail já tem conta." : "Não foi possível criar a conta. A palavra-passe deve ter pelo menos 8 caracteres." });
      else {
        if (newsletter) await db().from("newsletter").insert({ email: email.trim().toLowerCase() });
        if (data.session) onDone?.();
        else setMsg({ ok: true, text: "Conta criada! Confirme o seu e-mail através do link que lhe enviámos." });
      }
    } else {
      await sb.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/conta/nova-palavra-passe` });
      setMsg({ ok: true, text: "Se o e-mail existir, enviámos um link para definir nova palavra-passe." });
    }
    setBusy(false);
  };

  return (
    <div className="card mx-auto w-full max-w-md p-8">
      <div className="mb-6 flex rounded-full bg-sand p-1 text-sm">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setMsg(null); }}
            className={`flex-1 rounded-full py-2 font-medium ${mode === m ? "bg-white shadow-sm" : "text-muted"}`}>
            {m === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div><label className="label" htmlFor="a-name">Nome</label><input id="a-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        )}
        <div><label className="label" htmlFor="a-email">E-mail</label><input id="a-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== "reset" && (
          <div>
            <label className="label" htmlFor="a-pw">Palavra-passe</label>
            <input id="a-pw" className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
        )}
        {mode === "signup" && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} /> Quero receber novidades e promoções</label>
        )}
        <button className="btn w-full" disabled={busy}>
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`} role="status">{msg.text}</p>}
        <div className="text-center text-sm">
          {mode === "login" ? (
            <button type="button" className="text-muted underline" onClick={() => setMode("reset")}>Esqueci-me da palavra-passe</button>
          ) : mode === "reset" ? (
            <button type="button" className="text-muted underline" onClick={() => setMode("login")}>Voltar</button>
          ) : (
            <p className="text-xs text-muted">Ao criar conta aceita a nossa <a href="/privacidade" className="underline">política de privacidade</a>. Dúvidas? {STORE.email}</p>
          )}
        </div>
      </form>
    </div>
  );
}
