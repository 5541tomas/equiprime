// Filtros das listagens: junta valores escritos de formas diferentes ("PÔNEI", "Pônei", "Pony")
// num só valor apresentável, e ordena tamanhos de forma natural (XS, S, M… / 36, 38…).
import type { Product } from "./types";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const SYNONYMS: Record<string, string> = {
  pony: "Pónei", ponei: "Pónei", cob: "Cob", completo: "Completo", full: "Completo", "extra-cheio": "Extra-Cheio",
  "mini shetland": "Mini Shetland", shetland: "Shetland",
  "full grip": "Full Grip", "aderencia total": "Full Grip", "knee grip": "Knee Grip", "grip no joelho": "Knee Grip", grip: "Grip",
  bordoo: "Bordô", bordo: "Bordô", "azul marinho": "Azul-marinho", "azul-marinho": "Azul-marinho", navy: "Azul-marinho",
  "azul turquesa": "Azul-turquesa", "azul-turquesa": "Azul-turquesa", maca: "Maçã",
};
const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "2xl", "xxl", "3xl", "4xl", "5xl", "mini shetland", "shetland", "pónei", "ponei", "cob", "completo", "extra-cheio"];
const isLetterSize = (v: string) => SIZE_ORDER.includes(strip(v)) || /^\d?x*[sml]$/i.test(v.trim());

export const GROUPS = ["Tamanho", "Cor", "Grip", "Sabor", "Modalidade"] as const;

function canonGroup(key: string, value: string): string | null {
  const k = strip(key);
  // alguns produtos têm tamanhos guardados na opção "Cor"
  if (k === "cor" && isLetterSize(value)) return "Tamanho";
  const hit = GROUPS.find((g) => strip(g) === k);
  return hit ?? null;
}

export function canonValue(v: string): string {
  const s = strip(v);
  if (SYNONYMS[s]) return SYNONYMS[s];
  if (/^[\dxsml]+$/i.test(v.trim())) return v.trim().toUpperCase(); // xl -> XL, 95cm fica abaixo
  const t = v.trim();
  return t === t.toUpperCase() && t.length > 3 ? t[0] + t.slice(1).toLowerCase() : t[0].toUpperCase() + t.slice(1);
}

export function sortValues(group: string, values: string[]) {
  if (group !== "Tamanho") return values.sort((a, b) => a.localeCompare(b, "pt"));
  const rank = (v: string) => {
    const i = SIZE_ORDER.indexOf(strip(v));
    if (i >= 0) return i;
    const n = parseFloat(v.replace(",", "."));
    return Number.isNaN(n) ? 1000 : 100 + n;
  };
  return values.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt"));
}

/** Valores de cada grupo de opções de um produto (só variantes com stock). */
export function productOptions(p: Product): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const v of p.variants ?? []) {
    if (!v.active || (v.stock != null && v.stock <= 0)) continue;
    for (const [k, val] of Object.entries(v.options ?? {})) {
      const g = canonGroup(k, val);
      if (!g || !val) continue;
      (out[g] ??= new Set()).add(canonValue(val));
    }
  }
  return out;
}

export const effectivePrice = (p: Product) =>
  p.price_promo != null && Number(p.price_promo) < Number(p.price) ? Number(p.price_promo) : Number(p.price);

export const PRICE_RANGES = [
  { key: "0-25", label: "Até 25 €", min: 0, max: 25 },
  { key: "25-50", label: "25 € – 50 €", min: 25, max: 50 },
  { key: "50-100", label: "50 € – 100 €", min: 50, max: 100 },
  { key: "100+", label: "Mais de 100 €", min: 100, max: Infinity },
];
