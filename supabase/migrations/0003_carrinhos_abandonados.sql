-- Equi Prime — carrinhos abandonados
-- Guarda os carrinhos dos visitantes para o painel de gestão mostrar os que não foram finalizados.

create table if not exists public.carts (
  id uuid primary key,                      -- gerado no navegador do cliente (aleatório)
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null default '[]'::jsonb, -- [{product_id, variant_id, title, variant, slug, image, qty, unit_price}]
  item_count int not null default 0,
  subtotal numeric(10,2) not null default 0,
  contact jsonb not null default '{}'::jsonb, -- {name, phone, email} quando o cliente os escreve no checkout
  stage text not null default 'carrinho' check (stage in ('carrinho','checkout','convertido')),
  order_id bigint references public.orders(id) on delete set null,
  contacted_at timestamptz,                  -- quando a loja tentou recuperar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz
);
create index if not exists carts_updated on public.carts(updated_at desc);

alter table public.carts enable row level security;
-- só a administração vê e gere os carrinhos; os visitantes usam as funções abaixo
drop policy if exists "admin carrinhos" on public.carts;
create policy "admin carrinhos" on public.carts for all using (public.is_admin()) with check (public.is_admin());

-- Guardar/atualizar o carrinho do visitante. Os preços vêm sempre da base de dados.
create or replace function public.save_cart(p_id uuid, p_items jsonb, p_contact jsonb default null, p_stage text default null, p_order_id bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_sub numeric(10,2) := 0;
  v_count int := 0;
  v_item jsonb;
  v_qty int;
  v_prod record;
  v_var record;
  v_unit numeric(10,2);
  v_contact jsonb;
  v_existing record;
begin
  if p_id is null then return; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) > 50 then
    raise exception 'Carrinho inválido';
  end if;

  select * into v_existing from carts where id = p_id;
  -- um carrinho já convertido em encomenda não volta atrás
  if found and v_existing.stage = 'convertido' then return; end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_qty := greatest(1, least(999, coalesce((v_item->>'qty')::int, 1)));
    select id, title, slug, price, price_promo, images into v_prod from products where id = (v_item->>'product_id')::bigint and active;
    if not found then continue; end if;
    select * into v_var from variants where false;
    if (v_item->>'variant_id') is not null then
      select * into v_var from variants where id = (v_item->>'variant_id')::bigint and product_id = v_prod.id;
    end if;
    v_unit := coalesce(v_var.price_promo, v_var.price, v_prod.price_promo, v_prod.price);
    v_sub := v_sub + v_unit * v_qty;
    v_count := v_count + v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_prod.id, 'variant_id', v_var.id, 'title', v_prod.title, 'variant', v_var.title,
      'slug', v_prod.slug, 'image', coalesce(v_var.image_url, v_prod.images->0->>'url'), 'qty', v_qty, 'unit_price', v_unit);
  end loop;

  -- contacto: só campos conhecidos e com tamanho limitado; nunca apaga o que já se sabia
  v_contact := coalesce(v_existing.contact, '{}'::jsonb);
  if p_contact is not null then
    v_contact := v_contact || jsonb_strip_nulls(jsonb_build_object(
      'name',  nullif(left(trim(p_contact->>'name'), 120), ''),
      'phone', nullif(left(trim(p_contact->>'phone'), 30), ''),
      'email', nullif(lower(left(trim(p_contact->>'email'), 160)), '')));
  end if;

  insert into carts as c (id, user_id, items, item_count, subtotal, contact, stage, order_id, converted_at, updated_at)
  values (p_id, auth.uid(), v_items, v_count, v_sub, v_contact,
          coalesce(case when p_stage in ('carrinho','checkout','convertido') then p_stage end, 'carrinho'),
          case when p_stage = 'convertido' then p_order_id end,
          case when p_stage = 'convertido' then now() end, now())
  on conflict (id) do update set
    user_id = coalesce(excluded.user_id, c.user_id),
    -- ao converter, mantém o conteúdo que o cliente encomendou
    items = case when p_stage = 'convertido' then c.items else excluded.items end,
    item_count = case when p_stage = 'convertido' then c.item_count else excluded.item_count end,
    subtotal = case when p_stage = 'convertido' then c.subtotal else excluded.subtotal end,
    contact = excluded.contact,
    -- o estágio só avança (carrinho → checkout → convertido)
    stage = case
      when excluded.stage = 'convertido' then 'convertido'
      when excluded.stage = 'checkout' or c.stage = 'checkout' then 'checkout'
      else 'carrinho' end,
    order_id = coalesce(excluded.order_id, c.order_id),
    converted_at = coalesce(excluded.converted_at, c.converted_at),
    updated_at = now();
end $$;
grant execute on function public.save_cart(uuid, jsonb, jsonb, text, bigint) to anon, authenticated;

-- Devolve os artigos de um carrinho (para o link "recuperar carrinho" enviado ao cliente)
create or replace function public.get_cart(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select items from carts where id = p_id and stage <> 'convertido'
$$;
grant execute on function public.get_cart(uuid) to anon, authenticated;
