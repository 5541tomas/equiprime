"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { db } from "./supabase";
import type { CartItem } from "./types";

export type Profile = {
  id: string; email: string | null; name: string | null; phone: string | null; nif: string | null;
  address: string | null; postal_code: string | null; city: string | null; country: string | null;
  company: string | null; b2b_status: "none" | "pending" | "approved" | "rejected";
  is_admin: boolean; newsletter: boolean;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  isB2B: boolean;
  refreshProfile: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  setQty: (product_id: number, variant_id: number | null, qty: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  wishlist: Set<number>;
  toggleWishlist: (productId: number) => Promise<"added" | "removed" | "login">;
  wholesale: (productIds: number[]) => Promise<Map<string, number>>;
};

const StoreCtx = createContext<Ctx | null>(null);
const CART_KEY = "equiprime-cart";
const wkey = (p: number, v: number | null) => `${p}:${v ?? ""}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [wcache] = useState(() => new Map<string, number>());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    const sb = db();
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const refreshProfile = useCallback(async () => {
    if (!session) { setProfile(null); setWishlist(new Set()); return; }
    const sb = db();
    const [{ data: p }, { data: w }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
      sb.from("wishlist").select("product_id"),
    ]);
    setProfile(p as Profile | null);
    setWishlist(new Set((w ?? []).map((r) => r.product_id as number)));
  }, [session]);

  useEffect(() => { refreshProfile(); wcache.clear(); }, [refreshProfile, wcache]);

  const isB2B = profile?.b2b_status === "approved";

  const wholesale = useCallback(async (ids: number[]) => {
    if (!isB2B) return new Map<string, number>();
    const missing = ids.filter((id) => !wcache.has(wkey(id, null)));
    if (missing.length) {
      const { data } = await db().rpc("wholesale_prices", { p_product_ids: missing });
      for (const r of (data ?? []) as { product_id: number; variant_id: number | null; price: number }[]) {
        wcache.set(wkey(r.product_id, r.variant_id), Number(r.price));
        const base = wkey(r.product_id, null);
        // preço "a partir de" do produto = o mais baixo
        if (!wcache.has(base) || Number(r.price) < wcache.get(base)!) wcache.set(base, Number(r.price));
      }
    }
    return wcache;
  }, [isB2B, wcache]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.product_id === item.product_id && x.variant_id === item.variant_id);
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], qty: Math.min(999, n[i].qty + item.qty) };
        return n;
      }
      return [...c, item];
    });
    setCartOpen(true);
  }, []);

  const setQty = useCallback((pid: number, vid: number | null, qty: number) => {
    setCart((c) =>
      qty <= 0
        ? c.filter((x) => !(x.product_id === pid && x.variant_id === vid))
        : c.map((x) => (x.product_id === pid && x.variant_id === vid ? { ...x, qty: Math.min(999, qty) } : x))
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(async (productId: number) => {
    if (!session) return "login" as const;
    const sb = db();
    if (wishlist.has(productId)) {
      await sb.from("wishlist").delete().eq("product_id", productId).eq("user_id", session.user.id);
      setWishlist((w) => { const n = new Set(w); n.delete(productId); return n; });
      return "removed" as const;
    }
    await sb.from("wishlist").insert({ product_id: productId, user_id: session.user.id });
    setWishlist((w) => new Set(w).add(productId));
    return "added" as const;
  }, [session, wishlist]);

  const value = useMemo<Ctx>(() => ({
    ready, session, profile, isB2B, refreshProfile,
    cart, cartCount: cart.reduce((s, i) => s + i.qty, 0), addToCart, setQty, clearCart,
    cartOpen, setCartOpen, wishlist, toggleWishlist, wholesale,
  }), [ready, session, profile, isB2B, refreshProfile, cart, addToCart, setQty, clearCart, cartOpen, wishlist, toggleWishlist, wholesale]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fora do StoreProvider");
  return c;
}

export { wkey };
