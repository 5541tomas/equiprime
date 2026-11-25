// Coleções: consultas à base de dados (servidor)
import { descendantIds, getBrands, getCategories, listProducts, type Sort } from "./catalog";
import type { Product } from "./types";
import type { Collection } from "./collectionsData";
export { COLLECTIONS, getCollection, type Collection } from "./collectionsData";

export async function collectionProducts(c: Collection, sort?: Sort): Promise<Product[]> {
  const [cats, brands] = await Promise.all([getCategories(), getBrands()]);
  const catIds = c.categories.flatMap((s) => { const cat = cats.find((x) => x.slug === s); return cat ? descendantIds(cats, cat.id) : []; });
  const brandIds = new Set(brands.filter((b) => c.brands.includes(b.slug)).map((b) => b.id));
  const [byCat, all] = await Promise.all([catIds.length ? listProducts({ categoryIds: catIds, sort }) : Promise.resolve([]), listProducts({ sort })]);
  const ids = new Set([...byCat.map((p) => p.id), ...all.filter((p) => p.brand_id != null && brandIds.has(p.brand_id)).map((p) => p.id)]);
  return all.filter((p) => ids.has(p.id)); // mantém a ordenação escolhida
}

export async function collectionCover(c: Collection): Promise<string | null> {
  const all = await listProducts({});
  return all.find((p) => p.slug === c.coverProduct)?.images?.[0]?.url ?? null;
}
