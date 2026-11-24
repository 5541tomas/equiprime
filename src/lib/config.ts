export const STORE = {
  name: "Equi Prime",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.equi-prime.pt",
  whatsapp: "351918540207",
  phoneDisplay: "+351 918 540 207",
  email: "geral.equiprime@gmail.com",
  city: "São João da Madeira",
  shippingCost: 3.9,
  freeShippingFrom: 100,
  vat: 0.23,
};

// Desconto de boas-vindas (cupão criado no painel → Cupões)
export const WELCOME = { code: "BEMVINDO10", percent: 10 };
