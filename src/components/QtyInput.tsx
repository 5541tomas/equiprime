"use client";

export default function QtyInput({ value, onChange, small, max = 999 }: { value: number; onChange: (n: number) => void; small?: boolean; max?: number }) {
  const b = small ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white">
      <button type="button" className={`${b} text-lg`} onClick={() => onChange(value - 1)} aria-label="Diminuir quantidade">−</button>
      <span className={`${small ? "w-6 text-sm" : "w-8"} text-center`} aria-live="polite">{value}</span>
      <button type="button" className={`${b} text-lg disabled:opacity-30`} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Aumentar quantidade">+</button>
    </div>
  );
}
