import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cliente para páginas públicas (servidor, sem sessão). */
export const publicDb = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let browser: SupabaseClient | null = null;
/** Cliente do navegador (com sessão do cliente). */
export const db = () => {
  if (!browser) browser = createClient(url, key);
  return browser;
};
