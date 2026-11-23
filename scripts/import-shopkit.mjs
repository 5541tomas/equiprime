// Importa os produtos copiados do Shopkit para o Supabase.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-shopkit.mjs <pasta-com-json>
// Pode ser corrido várias vezes: atualiza produtos existentes (pelo id do Shopkit) e não duplica imagens.
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeHTML } from "entities";

const dir = process.argv[2];
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dir || !url || !key) { console.error("Falta pasta, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
// Com a chave injetada pelo proxy (valor "proxy-injected"), envia só o cabeçalho apikey.
const proxyFetch = (input, init = {}) => {
  const h = new Headers(init.headers);
  h.delete("authorization");
  return fetch(input, { ...init, headers: h });
};
const sb = createClient(url, key, {
  auth: { persistSession: false },
  ...(key === "proxy-injected" ? { global: { fetch: proxyFetch } } : {}),
});

const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Remove scripts, iframes, estilos inline e atributos perigosos da descrição. */
function sanitize(html = "") {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|meta|link)[^>]*>/gi, "")
    .replace(/\s(on\w+|style|class|id)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, "")
    // &ccedil; -> ç (mantém &lt; &gt; &amp; &quot; para não partir o HTML)
    .replace(/&(?!(lt|gt|amp|quot);)[a-z0-9#]+;/gi, (m) => (m === "&nbsp;" ? " " : decodeHTML(m)))
    .replace(/ +(\.|,)/g, "$1")
    .trim();
}

const imgCache = new Map();
async function mirrorImage(src) {
  if (!src) return null;
  if (imgCache.has(src)) return imgCache.get(src);
  const name = src.split("/").pop().split("?")[0];
  const path = `shopkit/${name}`;
  const publicUrl = sb.storage.from("products").getPublicUrl(path).data.publicUrl;
  const head = await fetch(publicUrl, { method: "HEAD" });
  if (!head.ok) {
    const res = await fetch(src);
    if (!res.ok) { console.warn("  imagem falhou:", src, res.status); imgCache.set(src, null); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    const { error } = await sb.storage.from("products").upload(path, buf, {
      contentType: res.headers.get("content-type") ?? "image/jpeg", cacheControl: "31536000", upsert: true,
    });
    if (error) { console.warn("  upload falhou:", path, error.message); imgCache.set(src, null); return null; }
  }
  imgCache.set(src, publicUrl);
  return publicUrl;
}

async function upsertCategory(c, parentId) {
  const { data } = await sb.from("categories").select("id").eq("slug", c.handle).maybeSingle();
  if (data) return data.id;
  const { data: ins, error } = await sb.from("categories")
    .insert({ title: c.title, slug: c.handle, parent_id: parentId, position: 0 }).select("id").single();
  if (error) throw error;
  return ins.id;
}

async function upsertBrand(b) {
  if (!b) return null;
  const slug = b.handle || slugify(b.title);
  const { data } = await sb.from("brands").select("id").eq("slug", slug).maybeSingle();
  if (data) return data.id;
  const logo = b.image?.full && !b.image.full.includes("no-img") ? await mirrorImage(b.image.full) : null;
  const { data: ins, error } = await sb.from("brands").insert({ title: b.title, slug, logo_url: logo }).select("id").single();
  if (error) throw error;
  return ins.id;
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const catIdByShopkit = new Map();
let n = 0, nv = 0;

for (const f of files) {
  const { url: oldUrl, product: p } = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const slug = oldUrl.split("/product/")[1];
  console.log(`[${++n}/${files.length}] ${p.title}`);

  // categorias: pais primeiro
  const cats = [...(p.categories ?? [])].sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0));
  const catIds = [];
  for (const c of cats) {
    if (!catIdByShopkit.has(c.id)) {
      const parent = c.parent ? catIdByShopkit.get(c.parent) ?? null : null;
      catIdByShopkit.set(c.id, await upsertCategory(c, parent));
    }
    catIds.push(catIdByShopkit.get(c.id));
  }

  const brandId = await upsertBrand(p.brand);

  const images = [];
  // produtos com uma só foto guardam-na em "image" e não em "images"
  const srcImages = p.images?.length ? p.images : p.image?.full ? [p.image] : [];
  for (const im of srcImages) {
    const u = await mirrorImage(im.full);
    if (u) images.push({ url: u, alt: im.alt || p.title });
  }

  const row = {
    shopkit_id: p.id, slug, title: p.title, description: sanitize(p.description), excerpt: sanitize(p.excerpt ?? ""),
    brand_id: brandId, price: p.price, price_promo: p.price_promo || null, price_wholesale: p.price_wholesale || null,
    images, seo_title: p.page_title || null, seo_description: p.meta_description || null,
    active: p.status === 1, featured: !!p.featured, is_new: !!p.new, position: p.position ?? 0,
    created_at: p.created_at, updated_at: new Date().toISOString(),
  };
  const { data: prod, error } = await sb.from("products").upsert(row, { onConflict: "shopkit_id" }).select("id").single();
  if (error) { console.error("  ERRO produto:", error.message); continue; }

  await sb.from("product_categories").delete().eq("product_id", prod.id);
  if (catIds.length) await sb.from("product_categories").insert([...new Set(catIds)].map((c) => ({ product_id: prod.id, category_id: c })));

  // variantes
  await sb.from("variants").delete().eq("product_id", prod.id);
  const groups = p.option_groups ?? [];
  const valueName = new Map(groups.flatMap((g) => g.options.map((o) => [o.id, { group: g.title, value: o.title }])));
  const variants = [];
  for (const [i, o] of (p.options ?? []).entries()) {
    const options = {};
    for (const k of ["id_variant_1", "id_variant_2", "id_variant_3"]) {
      const v = o[k] && valueName.get(o[k]);
      if (v) options[v.group] = v.value;
    }
    variants.push({
      product_id: prod.id, title: o.title, options,
      price: o.price !== p.price ? o.price : null,
      price_promo: o.price_promo || null, price_wholesale: o.price_wholesale || null,
      stock: p.stock?.stock_enabled ? (o.stock ?? 0) : null,
      sku: o.reference || o.barcode || null,
      image_url: o.image?.full ? await mirrorImage(o.image.full) : null,
      active: o.active !== false, position: i,
    });
  }
  if (variants.length) {
    const { error: ve } = await sb.from("variants").insert(variants);
    if (ve) console.error("  ERRO variantes:", ve.message); else nv += variants.length;
  }
}

// árvore de categorias definitiva (mantém os endereços antigos do Shopkit)
const tree = JSON.parse(readFileSync(new URL("./category-tree.json", import.meta.url), "utf8"));
for (const [i, root] of tree.entries()) {
  const { data: r } = await sb.from("categories")
    .upsert({ slug: root.slug, title: root.title, parent_id: null, position: i, active: true }, { onConflict: "slug" }).select("id").single();
  for (const [j, [slug, title]] of root.children.entries()) {
    await sb.from("categories").upsert({ slug, title, parent_id: r.id, position: j, active: true }, { onConflict: "slug" });
  }
}
// categorias fora da árvore ficam escondidas
const known = tree.flatMap((r) => [r.slug, ...r.children.map((c) => c[0])]);
await sb.from("categories").update({ active: false }).not("slug", "in", `(${known.join(",")})`);

console.log(`\nConcluído: ${n} produtos, ${nv} variantes, ${[...imgCache.values()].filter(Boolean).length} imagens.`);
