"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";

export default function NewPasswordPage() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await db().auth.updateUser({ password: pw });
    if (error) setMsg("O link expirou. Peça um novo na página de entrada.");
    else router.push("/conta");
  };
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="mb-6 font-serif text-4xl">Nova palavra-passe</h1>
      <form onSubmit={submit} className="card space-y-4 p-8">
        <input className="input" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" aria-label="Nova palavra-passe" />
        <button className="btn w-full">Guardar</button>
        {msg && <p className="text-sm text-danger">{msg}</p>}
      </form>
    </div>
  );
}
