-- ============================================================
-- Quadras CRM - 0003: blindagem do acesso público (multi-tenant)
-- ------------------------------------------------------------
-- Pré-requisito pro banco COMPARTILHADO entre arenas.
--
-- Problema corrigido: no 0001 o acesso anônimo (página pública de
-- reserva) era aberto demais —
--   public_read_bookings    using(true)        -> anon lia TODOS os
--       bookings (com client_name/client_phone) de TODAS as arenas;
--   public_insert_bookings  with check(true)   -> anon inseria booking
--       em qualquer arena via API crua;
--   public_read_active_courts using(status=..) -> anon listava quadras
--       de TODAS as arenas.
-- Num banco por cliente isso era quase inofensivo; num banco compartilhado
-- vira vazamento de dados entre clientes.
--
-- Correção: remover o acesso anon direto às tabelas e expor só o mínimo
-- via 3 funções SECURITY DEFINER, sempre filtradas por owner_id.
-- As policies owner_all_* (auth.uid() = owner_id) ficam INTACTAS:
-- o painel autenticado continua idêntico.
--
-- Idempotente.
-- ============================================================

-- 1) Remover as policies públicas inseguras --------------------------------
drop policy if exists "public_read_bookings"     on bookings;
drop policy if exists "public_insert_bookings"   on bookings;
drop policy if exists "public_read_active_courts" on courts;

-- 2) Quadras ativas de UMA arena (não expõe as outras) ---------------------
create or replace function public.get_public_courts(p_owner_id uuid)
returns setof courts
language sql
security definer
set search_path = public
stable
as $$
  select * from courts
  where owner_id = p_owner_id
    and status = 'ativa';
$$;

-- 3) Slots OCUPADOS de uma quadra/data — SEM dados de cliente --------------
--    Retorna só o necessário pra montar a grade de horários.
--    (cancelados não contam)
create or replace function public.get_booked_slots(
  p_owner_id uuid,
  p_court_id uuid,
  p_date     text
)
returns table (start_time text, end_time text)
language sql
security definer
set search_path = public
stable
as $$
  select start_time, end_time from bookings
  where owner_id = p_owner_id
    and court_id = p_court_id
    and date     = p_date
    and status  <> 'cancelado';
$$;

-- 4) Criar reserva(s) pública(s) — sempre 'pendente', all-or-nothing -------
--    p_slots: jsonb [{ "start_time": "08:00", "end_time": "09:00" }, ...]
--    Função plpgsql roda em 1 transação: se qualquer slot falhar (ex.: a
--    trava uq_booking_active_slot pegar reserva dupla em corrida), NADA é
--    gravado. Valida que a quadra é ativa e pertence à arena informada.
create or replace function public.create_public_bookings(
  p_owner_id     uuid,
  p_court_id     uuid,
  p_court_name   text,
  p_client_name  text,
  p_client_phone text,
  p_date         text,
  p_slots        jsonb,
  p_value        numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot  jsonb;
  v_count integer := 0;
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
    insert into bookings (
      owner_id, court_id, court_name, client_name, client_phone,
      notes, date, start_time, end_time, value, status
    ) values (
      p_owner_id, p_court_id, p_court_name, p_client_name, p_client_phone,
      '', p_date, v_slot->>'start_time', v_slot->>'end_time', p_value, 'pendente'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 5) Permissões: somente estas 3 RPCs ficam acessíveis ao público (anon) ---
revoke all on function public.get_public_courts(uuid) from public;
grant  execute on function public.get_public_courts(uuid) to anon, authenticated;

revoke all on function public.get_booked_slots(uuid, uuid, text) from public;
grant  execute on function public.get_booked_slots(uuid, uuid, text) to anon, authenticated;

revoke all on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric) from public;
grant  execute on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric) to anon, authenticated;
