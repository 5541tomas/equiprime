"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import type { Brand, Category, Img } from "@/lib/types";

type V = { id?: number; title: string; price: string; price_promo: string; price_wholesale: string; stock: string; sku: string; active: boolean; _delete?: boolean };
type F = {
  title: string; slug: string; description: string; excerpt: string; brand_id: string;
  price: string; price_promo: string; price_wholesale: string; images: Img[];
  seo_title: string; seo_description: string; active: boolean; featured: boolean; is_new: boolean;
};

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "novo";
  const router = useRouter();
  const [f, setF] = useState<F>({ title: "", slug: "", description: "", excerpt: "", brand_id: "", price: "", price_promo: "", price_wholesale: "", images: [], seo_title: "", seo_description: "", active: true, featured: false, is_new: true });
  const [variants, setVariants] = useState<V[]>([]);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [myCats, setMyCats] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sb = db();
    sb.from("categories").select("*").order("position").order("title").then(({ data }) => setCats((data ?? []) as Category[]));
    sb.from("brands").select("*").order("title").then(({ data }) => setBrands((data ?? []) as Brand[]));
    if (isNew) return;
    (async () => {
      const pid = Number(id);
      const [{ data: p }, { data: vs }, { data: pc }, { data: w }] = await Promise.all([
        sb.from("products").select("title,slug,description,excerpt,brand_id,price,price_promo,images,seo_title,seo_description,active,featured,is_new").eq("id", pid).single(),
        sb.from("variants").select("id,title,options,price,price_promo,stock,sku,active,position").eq("product_id", pid).order("position"),
        sb.from("product_categories").select("category_id").eq("product_id", pid),
        sb.rpc("admin_wholesale", { p_product_id: pid }),
      ]);
      if (!p) return;
      const ws = (w ?? { product: null, variants: {} }) as { product: number | null; variants: Record<string, number | null> };
      setF({
        title: p.title, slug: p.slug, description: p.description ?? "", excerpt: p.excerpt ?? "", brand_id: str(p.brand_id),
        price: str(p.price), price_promo: str(p.price_promo), price_wholesale: str(ws.product), images: p.images ?? [],
        seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "", active: p.active, featured: p.featured, is_new: p.is_new,
      });
      setVariants((vs ?? []).map((v) => ({
        id: v.id, title: v.title, price: str(v.price), price_promo: str(v.price_promo), price_wholesale: str(ws.variants[String(v.id)]),
        stock: str(v.stock), sku: v.sku ?? "", active: v.active,
      })));
      setMyCats(new Set((pc ?? []).map((r) => r.category_id as number)));
      const names: string[] = [];
      for (const v of vs ?? []) for (const k of Object.keys(v.options ?? {})) if (!names.includes(k)) names.push(k);
      setGroupNames(names);
    })();
  }, [id, isNew]);

  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const sb = db();
    const added: Img[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()?.toLowerCase()}`;
      const { error } = await sb.storage.from("products").upload(path, file, { cacheControl: "31536000" });
      if (!error) added.push({ url: sb.storage.from("products").getPublicUrl(path).data.publicUrl, alt: f.title });
    }
    set("images", [...f.images, ...added]);
    setBusy(false);
  };

  const moveImg = (i: number, d: -1 | 1) => {
    const a = [...f.images]; const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; set("images", a);
  };

  // "Preto / 36" -> {"Cor": "Preto", "Tamanho": "36"} usando os grupos do produto (ou "Opção")
  const toOptions = (title: string) => {
    const parts = title.split("/").map((x) => x.trim()).filter(Boolean);
    const names = groupNames.length === parts.length ? groupNames : parts.length === 1 ? [groupNames[0] ?? "Opção"] : parts.map((_, i) => groupNames[i] ?? `Opção ${i + 1}`);
    return Object.fromEntries(parts.map((x, i) => [names[i], x]));
  };

  const save = async () => {
    setMsg("");
    if (!f.title.trim() || !f.price) { setMsg("Título e preço são obrigatórios."); return; }
    setBusy(true);
    const sb = db();
    const payload = {
      title: f.title.trim(), slug: f.slug.trim() || slugify(f.title), description: f.description, excerpt: f.excerpt,
      brand_id: f.brand_id ? Number(f.brand_id) : null, price: num(f.price), price_promo: num(f.price_promo),
      price_wholesale: num(f.price_wholesale), images: f.images, seo_title: f.seo_title || null,
      seo_description: f.seo_description || null, active: f.active, featured: f.featured, is_new: f.is_new,
      updated_at: new Date().toISOString(),
    };
    let pid = Number(id);
    if (isNew) {
      const { data, error } = await sb.from("products").insert(payload).select("id").single();
      if (error) { setMsg(error.message.includes("slug") ? "Já existe um produto com este endereço (slug)." : error.message); setBusy(false); return; }
      pid = data.id;
    } else {
      const { error } = await sb.from("products").update(payload).eq("id", pid);
      if (error) { setMsg(error.message); setBusy(false); return; }
    }
    // variantes
    for (const [i, v] of variants.entries()) {
      if (v._delete) { if (v.id) await sb.from("variants").delete().eq("id", v.id); continue; }
      const row = {
        product_id: pid, title: v.title.trim() || "Única", options: toOptions(v.title), price: num(v.price), price_promo: num(v.price_promo),
        price_wholesale: num(v.price_wholesale), stock: num(v.stock), sku: v.sku || null, active: v.active, position: i,
      };
      if (v.id) await sb.from("variants").update(row).eq("id", v.id);
      else await sb.from("variants").insert(row);
    }
    // categorias
    await sb.from("product_categories").delete().eq("product_id", pid);
    if (myCats.size) await sb.from("product_categories").insert([...myCats].map((c) => ({ product_id: pid, category_id: c })));

    setBusy(false);
    if (isNew) router.replace(`/admin/produtos/${pid}`);
    else { setMsg("Guardado ✓ (a loja atualiza em até 5 minutos)"); }
  };

  const remove = async () => {
    if (!confirm("Apagar este produto definitivamente? Em alternativa pode só desmarcar “Visível”.")) return;
    await db().from("products").delete().eq("id", Number(id));
    router.replace("/admin/produtos");
  };

  const roots = cats.filter((c) => !c.parent_id);

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/produtos" className="text-sm text-muted hover:text-ink">← Produtos</Link>
        {!isNew && <a href={`/product/${f.slug}`} target="_blank" className="text-sm underline">Ver na loja ↗</a>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <div><label className="label">Título</label><input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><label className="label">Endereço (slug)</label><input className="input" value={f.slug} placeholder={slugify(f.title)} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
            <div><label className="label">Descrição (aceita HTML simples)</label><textarea className="input min-h-48 font-mono text-xs" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          </section>

          <section className="card p-6">
            <p className="label">Fotografias</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {f.images.map((im, i) => (
                <div key={im.url} className="relative h-28 w-28 overflow-hidden rounded-lg border border-line bg-white">
                  <Image src={im.url} alt="" fill sizes="112px" className="object-contain" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 text-xs">
                    <button onClick={() => moveImg(i, -1)} className="px-2 py-1" aria-label="Mover para a esquerda">←</button>
                    <button onClick={() => set("images", f.images.filter((_, k) => k !== i))} className="px-2 py-1 text-danger" aria-label="Remover">✕</button>
                    <button onClick={() => moveImg(i, 1)} className="px-2 py-1" aria-label="Mover para a direita">→</button>
                  </div>
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 text-[10px] text-white">Principal</span>}
                </div>
              ))}
              <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-xs text-muted hover:border-ink">
                + Adicionar<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Variantes (tamanhos / cores)</p>
              <button className="text-sm underline" onClick={() => setVariants([...variants, { title: "", price: "", price_promo: "", price_wholesale: "", stock: "", sku: "", active: true }])}>+ Adicionar variante</button>
            </div>
            <p className="mb-3 text-xs text-muted">{groupNames.length > 1 && <>Escreva o nome como “{groupNames.join(" / ")}”, por exemplo “Preto / 38”. </>}Deixe o preço vazio para usar o preço do produto. Stock vazio = sem controlo de stock.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="py-1">Nome</th><th>Preço</th><th>Promo</th><th>Revenda s/IVA</th><th>Stock</th><th>Ref.</th><th>Ativa</th><th /></tr></thead>
                <tbody>
                  {variants.map((v, i) => v._delete ? null : (
                    <tr key={v.id ?? `n${i}`}>
                      {(["title", "price", "price_promo", "price_wholesale", "stock", "sku"] as const).map((k) => (
                        <td key={k} className="py-1 pr-2"><input className={`input py-1.5 ${k === "title" ? "min-w-36" : "w-24"}`} value={v[k]} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /></td>
                      ))}
                      <td><input type="checkbox" checked={v.active} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} /></td>
                      <td><button className="px-2 text-danger" onClick={() => setVariants(variants.map((x, j) => (j === i ? { ...x, _delete: true } : x)))} aria-label="Remover variante">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card space-y-4 p-6">
            <p className="label">Google (opcional)</p>
            <div><label className="label">Título para o Google</label><input className="input" value={f.seo_title} placeholder={f.title} onChange={(e) => set("seo_title", e.target.value)} /></div>
            <div><label className="label">Descrição para o Google ({f.seo_description.length}/160)</label><textarea className="input" value={f.seo_description} onChange={(e) => set("seo_description", e.target.value)} /></div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-6">
            {([["active", "Visível na loja"], ["featured", "Destaque na página inicial"], ["is_new", "Etiqueta “Novidade”"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>
            ))}
          </section>
          <section className="card space-y-4 p-6">
            <div><label className="label">Preço (c/ IVA) €</label><input className="input" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
            <div><label className="label">Preço promocional €</label><input className="input" inputMode="decimal" value={f.price_promo} onChange={(e) => set("price_promo", e.target.value)} /></div>
            <div>
              <label className="label">Preço revenda (s/ IVA) €</label>
              <input className="input" inputMode="decimal" value={f.price_wholesale} placeholder={f.price ? (Number(f.price.replace(",", ".")) / 1.23).toFixed(2) : ""} onChange={(e) => set("price_wholesale", e.target.value)} />
              <p className="mt-1 text-xs text-muted">Vazio = preço normal sem IVA.</p>
            </div>
          </section>
          <section className="card space-y-4 p-6">
            <div>
              <label className="label">Marca</label>
              <select className="input" value={f.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                <option value="">—</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div>
              <p className="label">Categorias</p>
              <div className="max-h-72 space-y-1 overflow-y-auto text-sm">
                {roots.map((r) => (
                  <div key={r.id}>
                    {[r, ...cats.filter((c) => c.parent_id === r.id)].map((c) => (
                      <label key={c.id} className={`flex items-center gap-2 py-0.5 ${c.parent_id ? "pl-5" : "font-medium"}`}>
                        <input type="checkbox" checked={myCats.has(c.id)} onChange={(e) => { const s = new Set(myCats); if (e.target.checked) s.add(c.id); else s.delete(c.id); setMyCats(s); }} /> {c.title}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
          {!isNew && <button onClick={remove} className="text-sm text-danger underline">Apagar produto</button>}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3">
          {msg && <span className="text-sm">{msg}</span>}
          <button className="btn" onClick={save} disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
