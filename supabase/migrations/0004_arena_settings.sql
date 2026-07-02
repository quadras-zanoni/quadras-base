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
