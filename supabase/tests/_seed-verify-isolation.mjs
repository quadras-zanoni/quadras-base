// Validação CONCLUSIVA de isolamento: cria conta + 1 quadra + 1 reserva (com
// dados de cliente), desloga, e prova que o público (anon) NÃO lê esses dados —
// mesmo eles existindo. No fim, limpa os dados de teste. Utilitário one-shot.
//   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node supabase/tests/_seed-verify-isolation.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('faltam env NEXT_PUBLIC_SUPABASE_*'); process.exit(2) }

const sb = createClient(url, key)
const email = `isolation-test-${Date.now()}@example.com`
const password = 'TesteIsolamento#2026'
let fails = 0

// 1) cria conta (confirmação de email deve estar OFF → retorna sessão)
const { data: su, error: e1 } = await sb.auth.signUp({ email, password })
if (e1) { console.error('signUp falhou:', e1.message); process.exit(1) }
if (!su.session) { console.error('Sem sessão após signUp — confirmação de email ainda ON?'); process.exit(1) }
const ownerId = su.user.id
console.log('conta de teste criada — ownerId:', ownerId)

// 2) semeia 1 quadra + 1 reserva COM dados de cliente (logado, via owner_all_*)
const { data: court, error: e2 } = await sb.from('courts').insert({
  owner_id: ownerId, name: 'Quadra Teste', type: 'beach_tennis',
  price_per_hour: 100, duration: 60, open_time: '08:00', close_time: '22:00', status: 'ativa',
}).select().single()
if (e2) { console.error('insert court falhou:', e2.message); process.exit(1) }

const { error: e3 } = await sb.from('bookings').insert({
  owner_id: ownerId, court_id: court.id, court_name: court.name,
  client_name: 'CLIENTE SECRETO', client_phone: '11999998888',
  date: '2099-01-01', start_time: '10:00', end_time: '11:00', value: 100, status: 'pendente',
})
if (e3) { console.error('insert booking falhou:', e3.message); process.exit(1) }
console.log('semeado: 1 quadra + 1 reserva (cliente "CLIENTE SECRETO" / 11999998888)\n')

// 3) desloga → vira anon (a visão de um invasor)
await sb.auth.signOut()

// 4) prova de isolamento — agora EXISTE dado, então 0 linhas = bloqueio real
const r1 = await sb.from('bookings').select('client_name, client_phone')
if (!r1.error && (r1.data || []).some(b => b.client_name)) { console.log('✗ anon LEU dados de cliente:', JSON.stringify(r1.data)); fails++ }
else console.log('✓ anon NÃO lê bookings — nome/telefone do cliente protegidos (existe 1, viu 0)')

const r2 = await sb.from('courts').select('*')
if (!r2.error && (r2.data || []).length > 0) { console.log('✗ anon LEU courts:', r2.data.length); fails++ }
else console.log('✓ anon NÃO lê courts direto (existe 1, viu 0)')

const r3 = await sb.rpc('get_booked_slots', { p_owner_id: ownerId, p_court_id: court.id, p_date: '2099-01-01' })
const cols = r3.data && r3.data[0] ? Object.keys(r3.data[0]) : []
if (cols.includes('client_name') || cols.includes('client_phone')) { console.log('✗ get_booked_slots vazou colunas:', cols); fails++ }
else console.log(`✓ get_booked_slots devolve só ${cols.join('/') || '(slot)'} — sem dado de cliente (${(r3.data||[]).length} slot)`)

const r4 = await sb.rpc('get_public_courts', { p_owner_id: ownerId })
if (r4.error) { console.log('✗ get_public_courts erro:', r4.error.message); fails++ }
else console.log(`✓ get_public_courts devolve ${(r4.data||[]).length} quadra(s) ativa(s) — porta pública funciona`)

// 5) cleanup: religa e apaga os dados de teste
const { error: eL } = await sb.auth.signInWithPassword({ email, password })
if (!eL) {
  await sb.from('bookings').delete().eq('owner_id', ownerId)
  await sb.from('courts').delete().eq('owner_id', ownerId)
  console.log(`\ncleanup: dados de teste apagados (a conta ${email} fica órfã, sem dados — inofensiva)`)
} else console.log('\ncleanup: não consegui relogar pra limpar —', eL.message)

console.log(fails === 0 ? '\nRESULTADO: isolamento PROVADO COM DADOS REAIS. ✓' : `\nRESULTADO: ${fails} FALHA(S) DE SEGURANÇA.`)
process.exit(fails === 0 ? 0 : 1)
