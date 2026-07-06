import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Login do dono-demo feito NO SERVIDOR — a senha (DEMO_OWNER_PASSWORD) nunca vai ao
// browser. Devolve só os tokens da sessão pro client montar a sessão via setSession.
// SÓ existe no deploy de demonstração (DEMO_MODE=1).
export async function POST() {
  if (process.env.DEMO_MODE !== '1') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const email = process.env.DEMO_OWNER_EMAIL
  const password = process.env.DEMO_OWNER_PASSWORD
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!email || !password || !url || !anon) {
    return NextResponse.json({ error: 'demo não configurada' }, { status: 500 })
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return NextResponse.json({ error: 'falha no login da demo' }, { status: 500 })
  }

  return NextResponse.json(
    { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
