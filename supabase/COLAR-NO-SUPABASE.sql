-- Equi Prime — colar TUDO no Supabase → SQL Editor → New query → Run
-- Inclui: (1) código BEMVINDO10 só na 1.ª compra  (2) carrinhos abandonados
-- Pode ser corrido mais de uma vez sem problema.

-- Equi Prime — cupões só para a primeira compra (ex.: BEMVINDO10)
-- Colar no Supabase → SQL Editor → Run. Pode ser corrido mais de uma vez.

alter table public.coupons add column if not exists first_order_only boolean not null default false;
update public.coupons set first_order_only = true where code = 'BEMVINDO10';

create or replace function public.create_order(
  p_items jsonb,        -- [{variant_id, product_id, qty}]
  p_customer jsonb,
  p_delivery text,
  p_coupon text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_b2b boolean := public.is_b2b();
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_unit numeric(10,2);
  v_qty int;
  v_prod record;
  v_var record;
  v_coupon record;
  v_free_ship boolean := false;
  v_order_id bigint;
begin
  if p_delivery not in ('ctt','levantamento') then raise exception 'Entrega inválida'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'Carrinho vazio'; end if;
  if coalesce(trim(p_customer->>'name'),'') = '' or coalesce(trim(p_customer->>'phone'),'') = '' then
    raise exception 'Nome e telefone são obrigatórios';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(999, coalesce((v_item->>'qty')::int, 1)));
    select * into v_prod from products where id = (v_item->>'product_id')::bigint and active;
    if not found then raise exception 'Produto indisponível'; end if;
    select * into v_var from variants where false; -- registo vazio (todos os campos null)
    if (v_item->>'variant_id') is null
       and exists (select 1 from variants where product_id = v_prod.id and active) then
      raise exception 'Escolha uma opção para: %', v_prod.title;
    end if;
    if (v_item->>'variant_id') is not null then
      select * into v_var from variants
        where id = (v_item->>'variant_id')::bigint and product_id = v_prod.id and active;
      if not found then raise exception 'Variante indisponível: %', v_prod.title; end if;
      if v_var.stock is not null and v_var.stock < v_qty then
        raise exception 'Stock insuficiente: % (%)', v_prod.title, v_var.title;
      end if;
    end if;

    if v_b2b then
      v_unit := coalesce(v_var.price_wholesale, v_prod.price_wholesale,
                         round(coalesce(v_var.price, v_prod.price) / 1.23, 2));
    else
      v_unit := coalesce(v_var.price_promo, v_var.price, v_prod.price_promo, v_prod.price);
    end if;

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_prod.id, 'variant_id', v_var.id, 'title', v_prod.title,
      'variant', v_var.title, 'slug', v_prod.slug, 'qty', v_qty, 'unit_price', v_unit);
  end loop;

  if p_coupon is not null and trim(p_coupon) <> '' then
    select * into v_coupon from coupons where code = upper(trim(p_coupon)) and active
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses < max_uses)
      and v_subtotal >= min_total
      and not (b2c_only and v_b2b);
    if not found then raise exception 'Cupão inválido ou expirado'; end if;
    -- cupões de primeira compra: recusar se já houver encomenda com o mesmo telefone, e-mail ou conta
    if v_coupon.first_order_only and exists (
      select 1 from orders o where o.status <> 'cancelada' and (
        (auth.uid() is not null and o.user_id = auth.uid())
        -- compara os últimos 9 dígitos (912 345 678 = +351 912345678)
        or (length(regexp_replace(coalesce(p_customer->>'phone',''), '\D', '', 'g')) >= 9
            and right(regexp_replace(coalesce(o.customer->>'phone',''), '\D', '', 'g'), 9) = right(regexp_replace(coalesce(p_customer->>'phone',''), '\D', '', 'g'), 9))
        or (coalesce(p_customer->>'email','') <> '' and lower(o.customer->>'email') = lower(p_customer->>'email'))
      )) then
      raise exception 'O código % é válido apenas na primeira compra', v_coupon.code;
    end if;
    if v_coupon.kind = 'percent' then v_discount := round(v_subtotal * v_coupon.value / 100, 2);
    elsif v_coupon.kind = 'fixed' then v_discount := least(v_coupon.value, v_subtotal);
    else v_free_ship := true; end if;
    update coupons set uses = uses + 1 where code = v_coupon.code;
  end if;

  if p_delivery = 'ctt' and not v_free_ship and (v_subtotal - v_discount) < 100 then
    v_shipping := 3.90;
  end if;

  insert into orders (user_id, is_b2b, customer, delivery, items, subtotal, discount, shipping, total, coupon_code, notes)
  values (auth.uid(), v_b2b, p_customer, p_delivery, v_items, v_subtotal, v_discount, v_shipping,
          v_subtotal - v_discount + v_shipping, upper(nullif(trim(p_coupon),'')), p_notes)
  returning id into v_order_id;

  -- reserva stock
  update variants v set stock = v.stock - (i->>'qty')::int
    from jsonb_array_elements(v_items) i
    where v.id = (i->>'variant_id')::bigint and v.stock is not null;

  return jsonb_build_object('id', v_order_id, 'items', v_items, 'subtotal', v_subtotal,
    'discount', v_discount, 'shipping', v_shipping, 'total', v_subtotal - v_discount + v_shipping,
    'is_b2b', v_b2b);
end $$;
grant execute on function public.create_order(jsonb, jsonb, text, text, text) to anon, authenticated;

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
