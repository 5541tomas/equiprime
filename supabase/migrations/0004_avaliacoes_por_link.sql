-- Equi Prime — avaliações por link (sem conta), só para quem comprou
-- Cada encomenda tem um código secreto; o link /avaliar?t=<código> deixa avaliar os produtos dessa encomenda.

alter table public.orders add column if not exists review_token uuid not null default gen_random_uuid();
create unique index if not exists orders_review_token on public.orders(review_token);
alter table public.reviews add column if not exists order_id bigint references public.orders(id) on delete set null;
create unique index if not exists reviews_order_product on public.reviews(order_id, product_id) where order_id is not null;

-- Produtos da encomenda que podem ser avaliados (vales de oferta excluídos)
create or replace function public.get_review_order(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', split_part(coalesce(o.customer->>'name', ''), ' ', 1),
    'items', coalesce((
      select jsonb_agg(x) from (
        select distinct on ((i->>'product_id')::bigint)
          jsonb_build_object(
            'product_id', (i->>'product_id')::bigint,
            'title', i->>'title',
            'slug', i->>'slug',
            'image', (select p.images->0->>'url' from products p where p.id = (i->>'product_id')::bigint),
            'done', exists (select 1 from reviews r where r.order_id = o.id and r.product_id = (i->>'product_id')::bigint)
          ) as x
        from jsonb_array_elements(o.items) i
        where coalesce(i->>'slug', '') not like 'vale-de-oferta%'
      ) t), '[]'::jsonb))
  from orders o
  where o.review_token = p_token and o.status in ('confirmada', 'paga', 'enviada', 'concluida')
$$;
grant execute on function public.get_review_order(uuid) to anon, authenticated;

-- Guardar as avaliações (ficam por aprovar no painel). Devolve quantas foram guardadas.
create or replace function public.submit_order_reviews(p_token uuid, p_reviews jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_r jsonb;
  v_pid bigint;
  v_rating int;
  v_n int := 0;
begin
  select * into v_order from orders where review_token = p_token and status in ('confirmada', 'paga', 'enviada', 'concluida');
  if not found then raise exception 'Link de avaliação inválido'; end if;
  if jsonb_typeof(p_reviews) <> 'array' or jsonb_array_length(p_reviews) > 30 then raise exception 'Pedido inválido'; end if;

  for v_r in select * from jsonb_array_elements(p_reviews) loop
    v_pid := (v_r->>'product_id')::bigint;
    v_rating := (v_r->>'rating')::int;
    if v_rating is null or v_rating < 1 or v_rating > 5 then continue; end if;
    -- só produtos que estão mesmo na encomenda
    if not exists (select 1 from jsonb_array_elements(v_order.items) i
                   where (i->>'product_id')::bigint = v_pid and coalesce(i->>'slug', '') not like 'vale-de-oferta%') then
      continue;
    end if;
    insert into reviews (product_id, user_id, author_name, rating, comment, approved, order_id)
    values (v_pid, v_order.user_id, coalesce(nullif(split_part(v_order.customer->>'name', ' ', 1), ''), 'Cliente'),
            v_rating, left(coalesce(trim(v_r->>'comment'), ''), 1500), false, v_order.id)
    on conflict (order_id, product_id) where order_id is not null do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
grant execute on function public.submit_order_reviews(uuid, jsonb) to anon, authenticated;
