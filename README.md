# Equi Prime — loja online

Loja de equipamento equestre em Next.js + Supabase. As encomendas são registadas na base de dados e enviadas ao WhatsApp da loja (+351 918 540 207) para confirmação.

## Funcionalidades
- Catálogo com categorias, marcas, pesquisa e ordenação; variantes (cor / tamanho) e stock opcional
- Carrinho e checkout → mensagem de WhatsApp com o resumo da encomenda
- Portes 3,90 € (grátis acima de 100 €) ou levantamento
- Conta de cliente: encomendas, dados, lista de desejos
- Revenda (B2B): pedido de conta, aprovação no painel, preços sem IVA só visíveis a revendedores aprovados
- Cupões (% , € ou portes grátis), avaliações com moderação, newsletter (exportação CSV)
- Painel de gestão em `/admin`: encomendas, produtos, fotos, cupões, avaliações, clientes
- SEO: mesmos endereços que a loja Shopkit (`/product/...`, `/category/...`, `/brand/...`), sitemap, dados estruturados

## Instalação
1. Criar projeto no Supabase (região UE) e correr `supabase/migrations/0001_schema.sql` no SQL Editor.
2. Copiar `.env.example` para `.env.local` e preencher.
3. `npm install && npm run dev`
4. Importar produtos: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-shopkit.mjs <pasta>`
5. Criar a sua conta na loja e torná-la administradora no SQL Editor:
   `update profiles set is_admin = true where email = 'o-seu-email';`

## Alojamento
Netlify (plano gratuito) — ligar o repositório, definir as variáveis de ambiente e apontar o domínio.
