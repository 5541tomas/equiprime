import { cache } from "react";
import { publicDb } from "./supabase";
import type { Brand, Category, Product } from "./types";

const PRODUCT_COLS =
  "id,slug,title,excerpt,price,price_promo,images,featured,is_new,position,created_at,brand_id,brands(id,title,slug,logo_url)";

/** Categorias ativas que têm produtos (diretamente ou nas subcategorias). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const sb = publicDb();
  const [{ data }, { data: links }] = await Promise.all([
    sb.from("categories").select("id,parent_id,title,slug,position").order("position").order("title"),
    sb.from("product_categories").select("category_id,products!inner(active)").eq("products.active", true),
  ]);
  const all = (data ?? []) as Category[];
  const used = new Set((links ?? []).map((l) => l.category_id as number));
  const nonEmpty = (c: Category): boolean => used.has(c.id) || all.some((x) => x.parent_id === c.id && nonEmpty(x));
  return all.filter(nonEmpty);
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  const { data } = await publicDb().from("brands").select("id,title,slug,logo_url").order("title");
  return (data ?? []) as Brand[];
});

export type Sort = "relevancia" | "novidades" | "preco-asc" | "preco-desc";

export async function listProducts(opts: {
  categoryIds?: number[]; brandId?: number; q?: string; featured?: boolean;
  sort?: Sort; limit?: number;
} = {}): Promise<Product[]> {
  const sb = publicDb();
  let ids: number[] | null = null;
  if (opts.categoryIds?.length) {
    const { data } = await sb.from("product_categories").select("product_id").in("category_id", opts.categoryIds);
    ids = [...new Set((data ?? []).map((r) => r.product_id as number))];
    if (!ids.length) return [];
  }
  let q = sb.from("products").select(PRODUCT_COLS).eq("active", true);
  if (ids) q = q.in("id", ids);
  if (opts.brandId) q = q.eq("brand_id", opts.brandId);
  if (opts.featured) q = q.eq("featured", true);
  if (opts.q) q = q.ilike("title", `%${opts.q.replace(/[%_,()]/g, " ")}%`);
  switch (opts.sort) {
    case "novidades": q = q.order("created_at", { ascending: false }); break;
    case "preco-asc": q = q.order("price", { ascending: true }); break;
    case "preco-desc": q = q.order("price", { ascending: false }); break;
    default: q = q.order("position").order("created_at", { ascending: false });
  }
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as unknown as Product[];
}

export const getProduct = cache(async (slug: string) => {
  const sb = publicDb();
  const { data } = await sb
    .from("products")
    .select(
      "id,slug,title,description,excerpt,price,price_promo,images,seo_title,seo_description,featured,is_new,created_at,brand_id,brands(id,title,slug,logo_url),variants(id,product_id,title,options,price,price_promo,stock,sku,image_url,active,position),product_categories(category_id)"
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as Product & { product_categories: { category_id: number }[] };
  p.variants = (p.variants ?? []).filter((v) => v.active).sort((a, b) => a.position - b.position);
  return p;
});

export async function getReviews(productId: number) {
  const { data } = await publicDb()
    .from("reviews")
    .select("id,author_name,rating,comment,created_at")
    .eq("product_id", productId)
    .eq("approved", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Categoria + todas as subcategorias (ids). */
export function descendantIds(all: Category[], rootId: number): number[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++) {
    for (const c of all) if (c.parent_id === out[i]) out.push(c.id);
  }
  return out;
}

export function categoryTree(all: Category[]) {
  const roots = all.filter((c) => !c.parent_id);
  return roots.map((r) => ({ ...r, children: all.filter((c) => c.parent_id === r.id) }));
}
