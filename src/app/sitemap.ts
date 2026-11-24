import type { MetadataRoute } from "next";
import { publicDb } from "@/lib/supabase";
import { STORE } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = publicDb();
  const [{ data: products }, { data: cats }, { data: brands }] = await Promise.all([
    sb.from("products").select("slug,updated_at").eq("active", true),
    sb.from("categories").select("slug").eq("active", true),
    sb.from("brands").select("slug"),
  ]);
  const u = (p: string) => `${STORE.url}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/catalog"), changeFrequency: "daily", priority: 0.8 },
    { url: u("/presentes-de-natal"), changeFrequency: "weekly", priority: 0.9 },
    ...(cats ?? []).map((c) => ({ url: u(`/category/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...(brands ?? []).map((b) => ({ url: u(`/brand/${b.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...(products ?? []).map((p) => ({ url: u(`/product/${p.slug}`), lastModified: p.updated_at, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
