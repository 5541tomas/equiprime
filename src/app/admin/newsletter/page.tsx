"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";

export default function AdminNewsletter() {
  const [list, setList] = useState<{ email: string; created_at: string }[]>([]);
  useEffect(() => { db().from("newsletter").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? [])); }, []);
  const csv = () => {
    const blob = new Blob(["email,data\n" + list.map((r) => `${r.email},${r.created_at.slice(0, 10)}`).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "newsletter-equiprime.csv"; a.click();
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="font-semibold">{list.length} subscritores</p>
        <button onClick={csv} className="btn-outline ml-auto px-4 py-2" disabled={!list.length}>Exportar CSV</button>
      </div>
      <p className="mb-4 text-sm text-muted">Exporte a lista para enviar campanhas (por exemplo no Brevo ou Mailchimp).</p>
      <div className="card divide-y divide-line text-sm">
        {list.map((r) => <div key={r.email} className="flex justify-between p-3"><span>{r.email}</span><span className="text-muted">{new Date(r.created_at).toLocaleDateString("pt-PT")}</span></div>)}
      </div>
    </div>
  );
}
