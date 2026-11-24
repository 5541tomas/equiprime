"use client";

import { useState } from "react";
import { STORE } from "@/lib/config";
import { IconWhatsApp, IconX } from "./icons";

type Kind = "roupa" | "cabeca" | "maos" | "cavalo" | "pes";

/** Escolhe o tipo de guia pelo nome do produto. */
export function sizeGuideKind(title: string): Kind | null {
  const t = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/toque|capacete/.test(t)) return "cabeca";
  if (/luva/.test(t)) return "maos";
  if (/manta|cobrejao|suadouro|protetor de dorso|orelheira|cabecada|cabecao|redea|caneleira|cloche|boleto|ligadura/.test(t)) return "cavalo";
  if (/meia|bota|polaina/.test(t)) return "pes";
  if (/calca|camisola|sweat|pullover|polo|t-shirt|tshirt|casaco|impermeavel|colete|blusa|camisa/.test(t)) return "roupa";
  return null;
}

const GUIDES: Record<Kind, { title: string; intro: string; steps: { name: string; how: string }[]; tip: string }> = {
  roupa: {
    title: "Como escolher o tamanho da roupa",
    intro: "Meça o corpo (não a roupa), com uma fita métrica justa mas sem apertar.",
    steps: [
      { name: "Peito", how: "À volta da parte mais larga do peito, com os braços relaxados." },
      { name: "Cintura", how: "À volta da parte mais estreita da cintura, normalmente acima do umbigo." },
      { name: "Anca", how: "À volta da parte mais larga da anca, com os pés juntos." },
      { name: "Entrepernas (calças)", how: "Do cimo da parte interior da coxa até ao tornozelo." },
    ],
    tip: "As calças de equitação são justas por natureza. Se ficar entre dois tamanhos, escolha o maior.",
  },
  cabeca: {
    title: "Como escolher o tamanho do toque",
    intro: "O tamanho do toque é a circunferência da cabeça em centímetros.",
    steps: [
      { name: "Circunferência", how: "Passe a fita cerca de 1 cm acima das sobrancelhas e das orelhas, à volta da parte mais larga da cabeça." },
      { name: "Escolha", how: "Compare a medida com o intervalo indicado em cada tamanho (por exemplo, S (53–55) = 53 a 55 cm)." },
      { name: "Ajuste", how: "O toque deve ficar firme, sem abanar quando abana a cabeça, e sem fazer pressão." },
    ],
    tip: "Por segurança, nunca escolha um toque largo à espera que o forro compense.",
  },
  maos: {
    title: "Como escolher o tamanho das luvas",
    intro: "Meça a mão com que escreve, que costuma ser a maior.",
    steps: [
      { name: "Largura da mão", how: "À volta da palma, logo abaixo dos nós dos dedos, sem contar o polegar." },
      { name: "Comprimento", how: "Da base da palma até à ponta do dedo do meio." },
    ],
    tip: "As luvas de equitação devem ficar justas: com o uso cedem ligeiramente.",
  },
  cavalo: {
    title: "Como escolher o tamanho para o cavalo",
    intro: "Os tamanhos Pónei, Cob e Completo correspondem à estrutura do cavalo.",
    steps: [
      { name: "Pónei", how: "Póneis e cavalos pequenos." },
      { name: "Cob", how: "Cavalos de porte médio ou com cabeça mais pequena (ex.: muitos Lusitanos)." },
      { name: "Completo (Full)", how: "Cavalos de porte grande." },
      { name: "Mantas e cobrejões", how: "Meça do centro do peito, ao longo do flanco, até à parte de trás da garupa." },
    ],
    tip: "Se tiver um equipamento que assenta bem ao seu cavalo, envie-nos a medida e dizemos-lhe o tamanho certo.",
  },
  pes: {
    title: "Como escolher o tamanho das meias",
    intro: "Use como referência o número que calça habitualmente.",
    steps: [
      { name: "Número", how: "Escolha o tamanho que inclui o número do seu calçado." },
      { name: "Com botas altas", how: "As meias devem chegar acima da altura da bota para evitar fricção." },
    ],
    tip: "Entre dois tamanhos, escolha o maior.",
  },
};

export default function SizeGuide({ title, productTitle }: { title?: string; productTitle: string }) {
  const kind = sizeGuideKind(productTitle);
  const [open, setOpen] = useState(false);
  if (!kind) return null;
  const g = GUIDES[kind];
  const wa = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Olá! Preciso de ajuda com o tamanho de "${productTitle}". As minhas medidas são: `)}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold underline underline-offset-2 hover:text-leather">
        {title ?? "Guia de tamanhos"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-label={g.title}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ivory p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-serif text-3xl leading-tight">{g.title}</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar guia"><IconX /></button>
            </div>
            <p className="text-sm text-muted">{g.intro}</p>
            <ol className="mt-5 space-y-3">
              {g.steps.map((s, i) => (
                <li key={s.name} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-ivory">{i + 1}</span>
                  <span><strong>{s.name}.</strong> {s.how}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-xl bg-sand p-4 text-sm">💡 {g.tip}</p>
            <a href={wa} target="_blank" rel="noopener" className="btn-whatsapp mt-5 w-full"><IconWhatsApp size={18} /> Envie-nos as suas medidas</a>
            <p className="mt-2 text-center text-xs text-muted">Respondemos com o tamanho certo para si.</p>
          </div>
        </div>
      )}
    </>
  );
}
