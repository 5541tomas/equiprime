// Dados das coleções (sem acesso à base de dados — pode ser usado no navegador)
export type Collection = {
  slug: string;
  title: string;
  short: string;          // nome curto para o menu
  eyebrow: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  coverProduct: string;   // produto cuja primeira foto ilustra a coleção
  categories: string[];   // categorias incluídas (com subcategorias)
  brands: string[];       // marcas incluídas (todos os produtos da marca)
  brandHighlights: string[];
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "moda-equestre",
    title: "Moda Equestre",
    short: "Moda Equestre",
    eyebrow: "Para o cavaleiro",
    intro: "Calças, camisolas, polos e acessórios com estilo — para treinar, competir e para o dia a dia. Marcas que dificilmente encontra noutras lojas em Portugal.",
    seoTitle: "Moda Equestre — Calças, Polos e Camisolas de Equitação",
    seoDescription: "Moda equestre Pomme, Maximilian Equestrian e Equestro: calças de equitação, polos de concurso, camisolas e luvas. Envio rápido e ajuda com tamanhos por WhatsApp.",
    coverProduct: "calcas-pomme-nellie-bling-gold-rose-shadow",
    categories: ["cavaleiro", "acessorios"],
    brands: [],
    brandHighlights: ["pomme", "maximilian-equestrian", "equestro"],
  },
  {
    slug: "mimos-para-o-cavalo",
    title: "Mimos para o Cavalo",
    short: "Mimos para o Cavalo",
    eyebrow: "Para o cavalo",
    intro: "Guloseimas, lambedores e brinquedos anti-tédio para recompensar e entreter o seu cavalo na box. O presente que ele (e quem monta) vai adorar.",
    seoTitle: "Mimos para o Cavalo — Guloseimas Likit, Stud Muffins e Horslyx",
    seoDescription: "Guloseimas, lambedores e brinquedos para cavalos: Likit, Stud Muffins e Horslyx. Recompensas e brinquedos anti-tédio para a box.",
    coverProduct: "likit-granola-stall-ball-brinquedo",
    categories: ["cuidados-likits"],
    brands: ["likit", "stud-muffins", "horslyx"],
    brandHighlights: ["likit", "stud-muffins", "horslyx"],
  },
];

export const getCollection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug) ?? null;

