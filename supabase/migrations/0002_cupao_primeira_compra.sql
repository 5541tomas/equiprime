-- Equi Prime — cupões só para a primeira compra (ex.: BEMVINDO10) e descontos que não se aplicam a vales de oferta
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
  v_disc_base numeric(10,2) := 0; -- valor sobre o qual se aplicam descontos (exclui vales de oferta)
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
    if v_prod.slug not like 'vale-de-oferta%' then v_disc_base := v_disc_base + v_unit * v_qty; end if;
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
    if v_coupon.kind = 'percent' then v_discount := round(v_disc_base * v_coupon.value / 100, 2);
    elsif v_coupon.kind = 'fixed' then v_discount := least(v_coupon.value, v_disc_base);
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
