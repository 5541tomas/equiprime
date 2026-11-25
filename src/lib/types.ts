export type Img = { url: string; alt?: string };
export type Category = { id: number; parent_id: number | null; title: string; slug: string; position: number };
export type Brand = { id: number; title: string; slug: string; logo_url: string | null };
export type Variant = {
  id: number; product_id: number; title: string; options: Record<string, string>; price: number | null; price_promo: number | null;
  stock: number | null; sku: string | null; image_url: string | null; active: boolean; position: number;
};
export type Product = {
  id: number; slug: string; title: string; description: string; excerpt: string;
  brand_id: number | null; price: number; price_promo: number | null; images: Img[];
  seo_title: string | null; seo_description: string | null; active: boolean;
  featured: boolean; is_new: boolean; position: number; created_at: string;
  brands?: Brand | null; variants?: Variant[];
};
export type CartItem = {
  product_id: number; variant_id: number | null; slug: string; title: string;
  variant: string | null; image: string | null; unit_price: number; qty: number;
};
export type Order = {
  id: number; status: string; is_b2b: boolean; delivery: string; created_at: string;
  customer: Record<string, string>; items: (CartItem & { unit_price: number })[];
  subtotal: number; discount: number; shipping: number; total: number;
  coupon_code: string | null; notes: string | null; admin_notes: string | null; user_id: string | null;
  review_token?: string; // existe depois de ativar as avaliações por link
};
