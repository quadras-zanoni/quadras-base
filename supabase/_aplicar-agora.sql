-- ============================================================
-- APLICAR AGORA no SQL Editor do Supabase (projeto cagkwoqyannbmputqxlz)
-- Combina 0004 (arena_settings) + 0005 (modalidades/preco/slug).
-- Idempotente: seguro rodar mesmo que parte ja tenha rodado.
-- Gerado em 2026-07-02.
-- ============================================================

-- ===== 0004 =====
-- ============================================================
-- Quadras CRM - 0004: configurações da arena
-- ------------------------------------------------------------
-- Guarda o número de WhatsApp da arena, usado pelo botão
-- "Avisar a arena no WhatsApp" na página pública de reserva
-- (modelo click-to-chat / wa.me — o próprio cliente dispara
-- a mensagem do WhatsApp dele para o número da arena).
--
-- Um registro por arena (owner_id é a chave). Segue o mesmo
-- padrão de segurança do 0003: o painel autenticado lê/grava
-- via RLS (auth.uid() = owner_id); o público lê SOMENTE o
-- número, via função SECURITY DEFINER filtrada por owner_id.
--
-- Idempotente.
-- ============================================================

-- 1) Tabela ----------------------------------------------------------------
create table if not exists arena_settings (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  notify_whatsapp text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2) RLS: cada dono gerencia só a própria configuração ---------------------
alter table arena_settings enable row level security;

drop policy if exists "owner_all_arena_settings" on arena_settings;
create policy "owner_all_arena_settings" on arena_settings
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 3) RPC pública: expõe SÓ o número de uma arena ---------------------------
--    (a página pública precisa dele pra montar o link wa.me)
create or replace function public.get_public_arena(p_owner_id uuid)
returns table (notify_whatsapp text)
language sql
security definer
set search_path = public
stable
as $$
  select notify_whatsapp from arena_settings where owner_id = p_owner_id;
$$;

revoke all on function public.get_public_arena(uuid) from public;
grant  execute on function public.get_public_arena(uuid) to anon, authenticated;


-- ===== 0005 =====
-- ============================================================
-- Quadras CRM - 0005: modalidades múltiplas, preço por faixa,
--                     link curto (slug) e modalidade na reserva
-- ------------------------------------------------------------
-- Três features:
--  1) Quadra passa a ter MÚLTIPLAS modalidades (volei/beach_tennis/
--     futevolei). A coluna antiga `type` (1 só) vira opcional e é
--     migrada para o array `modalities`.
--  2) Preço por FAIXA (dia da semana + intervalo de horário). O
--     `price_per_hour` continua como PREÇO BASE (fallback). As faixas
--     ficam em `price_tiers` (jsonb): [{days:[int], start, end, price}].
--     days: 0=Dom .. 6=Sáb (convenção JS getDay()).
--  3) Link público curto: arena_settings ganha `slug` (único). A rota
--     /reservar/[x] passa a aceitar slug OU o owner_id (retrocompat).
--  + bookings ganha `modality` (o que o cliente escolheu jogar).
--
-- Segue o padrão de segurança do 0003/0004 (SECURITY DEFINER, filtrado
-- por owner_id). get_public_courts NÃO muda: retorna `setof courts`,
-- então as colunas novas já vêm automaticamente.
--
-- Idempotente.
-- ============================================================

-- 1) courts: modalidades + faixas de preço ---------------------------------
alter table courts add column if not exists modalities  text[] not null default '{}';
alter table courts add column if not exists price_tiers jsonb  not null default '[]';
alter table courts alter column type drop not null;

-- migra o tipo único antigo para o array de modalidades (só onde vazio).
-- tipos que não existem mais (futsal/society/tenis/outro) viram beach_tennis
-- por padrão — o dono reajusta num clique.
update courts
set modalities = array[
  case type
    when 'volei'        then 'volei'
    when 'beach_tennis' then 'beach_tennis'
    else 'beach_tennis'
  end
]
where coalesce(array_length(modalities, 1), 0) = 0;

-- 2) bookings: modalidade escolhida pelo cliente ---------------------------
alter table bookings add column if not exists modality text;

-- 3) arena_settings: slug do link público ----------------------------------
alter table arena_settings add column if not exists slug text;
-- slugs preenchidos são únicos entre arenas (null é permitido / ignorado)
create unique index if not exists uq_arena_slug on arena_settings (slug) where slug is not null;

-- 4) get_public_arena: passa a expor o slug também -------------------------
--    (mudou o tipo de retorno → precisa dropar antes de recriar)
drop function if exists public.get_public_arena(uuid);
create or replace function public.get_public_arena(p_owner_id uuid)
returns table (notify_whatsapp text, slug text)
language sql security definer set search_path = public stable
as $$
  select notify_whatsapp, slug from arena_settings where owner_id = p_owner_id;
$$;
revoke all on function public.get_public_arena(uuid) from public;
grant  execute on function public.get_public_arena(uuid) to anon, authenticated;

-- 5) resolver slug -> owner_id (rota pública /reservar/[slug]) --------------
create or replace function public.resolve_arena_slug(p_slug text)
returns uuid
language sql security definer set search_path = public stable
as $$
  select owner_id from arena_settings where slug = p_slug limit 1;
$$;
revoke all on function public.resolve_arena_slug(text) from public;
grant  execute on function public.resolve_arena_slug(text) to anon, authenticated;

-- 6) create_public_bookings: + modalidade, + valor POR SLOT ----------------
--    Com faixas de preço, cada slot pode ter valor diferente. O valor vem
--    dentro de cada item de p_slots ({start_time,end_time,value}); se não
--    vier, cai no p_value (retrocompat).
--    A assinatura mudou (novo param) → dropa a versão antiga antes.
drop function if exists public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric);
create or replace function public.create_public_bookings(
  p_owner_id     uuid,
  p_court_id     uuid,
  p_court_name   text,
  p_client_name  text,
  p_client_phone text,
  p_date         text,
  p_slots        jsonb,
  p_value        numeric,
  p_modality     text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_slot  jsonb;
  v_count integer := 0;
  v_val   numeric;
begin
  if not exists (
    select 1 from courts
    where id = p_court_id and owner_id = p_owner_id and status = 'ativa'
  ) then
    raise exception 'Quadra inválida para esta arena';
  end if;

  if jsonb_array_length(coalesce(p_slots, '[]'::jsonb)) = 0 then
    raise exception 'Nenhum horário informado';
  end if;

  for v_slot in select * from jsonb_array_elements(p_slots)
  loop
    v_val := coalesce((v_slot->>'value')::numeric, p_value);
    insert into bookings (
      owner_id, court_id, court_name, client_name, client_phone,
      notes, date, start_time, end_time, value, status, modality
    ) values (
      p_owner_id, p_court_id, p_court_name, p_client_name, p_client_phone,
      '', p_date, v_slot->>'start_time', v_slot->>'end_time', v_val, 'pendente', p_modality
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
revoke all on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric, text) from public;
grant  execute on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric, text) to anon, authenticated;
