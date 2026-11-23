"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";

export default function NewsletterForm({ dark }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    const { error } = await db().from("newsletter").insert({ email: email.trim().toLowerCase() });
    // e-mail já subscrito (chave duplicada) também conta como sucesso
    setState(!error || error.code === "23505" ? "ok" : "err");
  };

  if (state === "ok") return <p className="text-sm font-medium">Obrigado! Subscrição registada.</p>;

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="O seu e-mail" aria-label="E-mail para newsletter"
        className={`input rounded-full ${dark ? "border-white/20 bg-white/10 text-ivory placeholder:text-ivory/50 focus:border-ivory" : ""}`}
      />
      <button className={dark ? "btn bg-ivory text-ink hover:bg-white" : "btn"} disabled={state === "loading"}>Subscrever</button>
      {state === "err" && <span className="sr-only">Erro</span>}
    </form>
  );
}
