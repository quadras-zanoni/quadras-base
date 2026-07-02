// ============================================================
// Teste de isolamento multi-tenant — visão do atacante (anon).
// ------------------------------------------------------------
// Prova, usando a MESMA anon key pública que vai pro navegador, que
// depois da migration 0003 o acesso anônimo direto às tabelas foi
// fechado e só as 3 RPCs mínimas respondem.
//
// QUANDO RODAR: na Fase 2, depois de aplicar 0001+0002+0003 no banco
// E semear pelo menos 1 quadra ativa + 1 booking de uma arena (owner)
// — senão os checks de leitura ficam INCONCLUSIVOS (vazio por falta de
// dado não prova bloqueio). O teste avisa quando está inconclusivo;
// nunca finge "pass".
//
// USO (PowerShell):
//   $env:NEXT_PUBLIC_SUPABASE_URL="https://cagkwoqyannbmputqxlz.supabase.co"
//   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
//   $env:SEED_HAS_DATA="1"                              # após semear >=1 quadra+booking
//   $env:SEED_OWNER_ID="<uuid de uma arena semeada>"   # p/ checks 4-5 das RPCs
//   node supabase/tests/isolation.test.mjs
//
// Sem SEED_HAS_DATA, os checks de leitura anon ficam INCONCLUSIVOS (0 linhas
// num banco vazio não distingue "bloqueado" de "sem dado"). Nunca finge pass.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const seedOwner = process.env.SEED_OWNER_ID || null
// Prova de que há dado no banco. Sem isto, "anon vê 0 linhas" é ambíguo
// (0 por bloqueio RLS vs 0 por banco vazio) → marca-se INCONCLUSIVO, não pass.
const hasData = process.env.SEED_HAS_DATA === '1'

if (!url || !key) {
  console.error('✗ Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}

const sb = createClient(url, key)
let failed = 0
let inconclusive = 0

function pass(name) { console.log(`  ✓ ${name}`) }
function fail(name, detail) { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
function skip(name, why) { inconclusive++; console.log(`  ~ ${name} — INCONCLUSIVO: ${why}`) }

console.log('\nIsolamento multi-tenant (anon) — banco:', url, '\n')

// 1) anon NÃO pode ler bookings cru (vazaria client_name/client_phone) ------
{
  const { data, error } = await sb.from('bookings').select('client_name, client_phone').limit(5)
  if (error) pass('anon bloqueado em SELECT bookings (erro RLS)')
  else if ((data || []).length > 0) fail('anon LEU dados de cliente em bookings', `${data.length} linha(s) vazaram`)
  else if (hasData) pass('anon retorna 0 bookings mesmo havendo dado semeado (RLS bloqueia)')
  else skip('anon SELECT bookings', 'retornou 0, mas sem dado garantido no banco não prova bloqueio — rode com SEED_HAS_DATA=1 e >=1 booking semeado')
}

// 2) anon NÃO pode ler courts cru ------------------------------------------
{
  const { data, error } = await sb.from('courts').select('*').limit(5)
  if (error) pass('anon bloqueado em SELECT courts (erro RLS)')
  else if ((data || []).length > 0) fail('anon LEU courts diretamente', `${data.length} linha(s)`)
  else if (hasData) pass('anon retorna 0 courts mesmo havendo dado semeado (RLS bloqueia)')
  else skip('anon SELECT courts', 'retornou 0, mas sem dado garantido no banco não prova bloqueio — rode com SEED_HAS_DATA=1 e >=1 quadra semeada')
}

// 3) anon NÃO pode inserir booking cru -------------------------------------
{
  const { error } = await sb.from('bookings').insert({
    owner_id: '00000000-0000-0000-0000-000000000000',
    court_id: '00000000-0000-0000-0000-000000000000',
    court_name: 'x', client_name: 'atk', client_phone: '0',
    date: '2099-01-01', start_time: '08:00', end_time: '09:00',
    value: 0, status: 'pendente',
  })
  if (error) pass('anon bloqueado em INSERT bookings direto')
  else fail('anon INSERIU booking direto na tabela', 'policy public_insert_bookings ainda ativa')
}

// 4) RPC get_booked_slots NÃO expõe dados de cliente -----------------------
if (seedOwner) {
  const { data, error } = await sb.rpc('get_booked_slots', {
    p_owner_id: seedOwner, p_court_id: '00000000-0000-0000-0000-000000000000', p_date: '2099-01-01',
  })
  if (error) fail('get_booked_slots retornou erro', error.message)
  else {
    const cols = data && data[0] ? Object.keys(data[0]) : []
    const leaked = cols.filter(c => c === 'client_name' || c === 'client_phone' || c === 'value')
    if (leaked.length) fail('get_booked_slots vazou colunas sensíveis', leaked.join(','))
    else pass('get_booked_slots responde só com start_time/end_time')
  }
} else skip('get_booked_slots sem dados sensíveis', 'defina SEED_OWNER_ID com dados semeados')

// 5) RPC get_public_courts funciona (caminho feliz) ------------------------
if (seedOwner) {
  const { error } = await sb.rpc('get_public_courts', { p_owner_id: seedOwner })
  if (error) fail('get_public_courts retornou erro', error.message)
  else pass('get_public_courts acessível ao anon')
} else skip('get_public_courts caminho feliz', 'defina SEED_OWNER_ID')

console.log('')
if (failed > 0) { console.error(`RESULTADO: ${failed} FALHA(S), ${inconclusive} inconclusivo(s).`); process.exit(1) }
if (inconclusive > 0) console.warn(`RESULTADO: sem falhas, mas ${inconclusive} inconclusivo(s) — rode com SEED_OWNER_ID + dados semeados pra fechar.`)
else console.log('RESULTADO: todos os checks de isolamento passaram. ✓')
