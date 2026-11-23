-- Equi Prime — esquema da loja
create extension if not exists pg_trgm;

-- ---------- Catálogo ----------
create table public.categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  position int not null default 0,
  active boolean not null default true
);

create table public.brands (
  id bigint generated always as identity primary key,
  title text not null,
  slug text not null unique,
  logo_url text
);

create table public.products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  excerpt text not null default '',
  brand_id bigint references public.brands(id) on delete set null,
  -- preços em euros, IVA incluído (B2C)
  price numeric(10,2) not null,
  price_promo numeric(10,2),
  -- preço de revenda, SEM IVA (B2B). null = preço B2C sem IVA
  price_wholesale numeric(10,2),
  images jsonb not null default '[]'::jsonb, -- [{url, alt}]
  seo_title text,
  seo_description text,
  active boolean not null default true,
  featured boolean not null default false,
  is_new boolean not null default false,
  position int not null default 0,
  shopkit_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_title_trgm on public.products using gin (title gin_trgm_ops);

create table public.product_categories (
  product_id bigint references public.products(id) on delete cascade,
  category_id bigint references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  title text not null,                -- ex.: "Preto / 36"
  options jsonb not null default '{}'::jsonb, -- ex.: {"Cor": "Preto", "Tamanho": "36"}
  price numeric(10,2),                -- null = preço do produto
  price_promo numeric(10,2),
  price_wholesale numeric(10,2),
  stock int,                          -- null = sem controlo de stock
  sku text,
  image_url text,
  active boolean not null default true,
  position int not null default 0
);
create index variants_product on public.variants(product_id);

-- ---------- Clientes ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  nif text,
  address text,
  postal_code text,
  city text,
  country text default 'Portugal',
  company text,
  b2b_status text not null default 'none' check (b2b_status in ('none','pending','approved','rejected')),
  is_admin boolean not null default false,
  newsletter boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_b2b() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select b2b_status = 'approved' from public.profiles where id = auth.uid()), false)
$$;

-- impede o cliente de se promover a admin ou de se aprovar como revenda
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    if new.b2b_status is distinct from old.b2b_status
       and not (old.b2b_status in ('none','rejected') and new.b2b_status = 'pending') then
      new.b2b_status := old.b2b_status;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

create table public.wishlist (
  user_id uuid references auth.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.newsletter (
  email text primary key,
  created_at timestamptz not null default now()
);

-- ---------- Vendas ----------
create table public.coupons (
  code text primary key,              -- guardado em maiúsculas
  kind text not null check (kind in ('percent','fixed','free_shipping')),
  value numeric(10,2) not null default 0,
  min_total numeric(10,2) not null default 0,
  max_uses int,
  uses int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  b2c_only boolean not null default false
);

create table public.orders (
  id bigint generated always as identity (start with 1001) primary key,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente','confirmada','paga','enviada','concluida','cancelada')),
  is_b2b boolean not null default false,
  customer jsonb not null,            -- nome, telefone, email, nif, morada…
  delivery text not null check (delivery in ('ctt','levantamento')),
  items jsonb not null,               -- [{product_id, variant_id, title, variant, qty, unit_price}]
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon_code text,
  notes text,
  admin_notes text,
  created_at timestamptz not null default now()
);
create index orders_user on public.orders(user_id);

-- ---------- Regras de acesso (RLS) ----------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.variants enable row level security;
alter table public.profiles enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;

create policy "catálogo público" on public.categories for select using (active or public.is_admin());
create policy "marcas públicas" on public.brands for select using (true);
create policy "produtos públicos" on public.products for select using (active or public.is_admin());
create policy "produto-categoria público" on public.product_categories for select using (true);
create policy "variantes públicas" on public.variants for select using (active or public.is_admin());

create policy "admin categorias" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin marcas" on public.brands for all using (public.is_admin()) with check (public.is_admin());
create policy "admin produtos" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admin produto-categoria" on public.product_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin variantes" on public.variants for all using (public.is_admin()) with check (public.is_admin());

create policy "perfil próprio" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "editar perfil próprio" on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy "wishlist própria" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "avaliações aprovadas" on public.reviews for select using (approved or user_id = auth.uid() or public.is_admin());
create policy "criar avaliação" on public.reviews for insert with check (user_id = auth.uid() and approved = false);
create policy "admin avaliações" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

create policy "subscrever newsletter" on public.newsletter for insert with check (true);
create policy "admin newsletter" on public.newsletter for select using (public.is_admin());
create policy "admin newsletter apagar" on public.newsletter for delete using (public.is_admin());

create policy "admin cupões" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy "encomendas próprias" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "admin encomendas" on public.orders for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Criar encomenda (preços calculados no servidor) ----------
-- O cliente envia só ids e quantidades; os preços vêm sempre da base de dados.
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
    v_var := null;
    if v_item ? 'variant_id' and v_item->>'variant_id' is not null then
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

-- validar cupão no carrinho (sem o consumir)
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'kind', kind, 'value', value)
  from coupons where code = upper(trim(p_code)) and active
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses < max_uses)
    and p_subtotal >= min_total
    and not (b2c_only and public.is_b2b())
$$;
grant execute on function public.check_coupon(text, numeric) to anon, authenticated;

-- média de avaliações por produto
create or replace view public.product_ratings with (security_invoker = true) as
  select product_id, round(avg(rating)::numeric, 1) as avg, count(*) as count
  from public.reviews where approved group by product_id;

-- ---------- Armazenamento de imagens ----------
insert into storage.buckets (id, name, public) values ('products', 'products', true)
  on conflict (id) do nothing;
create policy "imagens públicas" on storage.objects for select using (bucket_id = 'products');
create policy "admin envia imagens" on storage.objects for insert with check (bucket_id = 'products' and public.is_admin());
create policy "admin apaga imagens" on storage.objects for delete using (bucket_id = 'products' and public.is_admin());

-- ---------- Preços de revenda: escondidos do público ----------
revoke select on public.products from anon, authenticated;
grant select (id, slug, title, description, excerpt, brand_id, price, price_promo, images,
  seo_title, seo_description, active, featured, is_new, position, shopkit_id, created_at, updated_at)
  on public.products to anon, authenticated;
revoke select on public.variants from anon, authenticated;
grant select (id, product_id, title, options, price, price_promo, stock, sku, image_url, active, position)
  on public.variants to anon, authenticated;

-- devolve preços de revenda (sem IVA) apenas a revendedores aprovados e admin
create or replace function public.wholesale_prices(p_product_ids bigint[])
returns table(product_id bigint, variant_id bigint, price numeric)
language sql stable security definer set search_path = public as $$
  select p.id, v.id,
    coalesce(v.price_wholesale, p.price_wholesale, round(coalesce(v.price, p.price) / 1.23, 2))
  from products p left join variants v on v.product_id = p.id and v.active
  where p.id = any(p_product_ids) and (public.is_b2b() or public.is_admin())
$$;
grant execute on function public.wholesale_prices(bigint[]) to authenticated;

-- preços de revenda "em bruto" para o painel de gestão
create or replace function public.admin_wholesale(p_product_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'product', (select price_wholesale from products where id = p_product_id),
    'variants', coalesce((select jsonb_object_agg(id::text, price_wholesale) from variants where product_id = p_product_id), '{}'::jsonb)
  ) end
$$;
grant execute on function public.admin_wholesale(bigint) to authenticated;

-- devolve o stock quando uma encomenda é cancelada (e volta a retirar se for reativada)
create or replace function public.order_stock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare sign int;
begin
  if new.status = old.status then return new; end if;
  if new.status = 'cancelada' then sign := 1;
  elsif old.status = 'cancelada' then sign := -1;
  else return new; end if;
  update variants v set stock = v.stock + sign * (i->>'qty')::int
    from jsonb_array_elements(new.items) i
    where v.id = (i->>'variant_id')::bigint and v.stock is not null;
  return new;
end $$;
create trigger orders_stock after update of status on public.orders
  for each row execute function public.order_stock_on_cancel();
