import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Entrada da demo vestida: busca a marca do prospect no hub, grava no cookie `demo_brand`
// (que o layout lê pra vestir a UI) e manda pro /demo/start (login do dono-demo).
// SÓ existe no deploy de demonstração (DEMO_MODE=1); nas arenas reais responde 404.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (process.env.DEMO_MODE !== '1') {
    return new NextResponse('Not found', { status: 404 })
  }

  const { slug } = await params
  const hubUrl = process.env.BILLING_HUB_URL
  // Falha ao vestir a marca → segue pro /demo/start (demo genérica, ainda logada).
  // NUNCA /login: o middleware reconduz /login pra cá e viraria loop de redirect.
  if (!hubUrl) {
    return NextResponse.redirect(new URL('/demo/start', req.url))
  }

  let brand: { name?: string; color?: string | null; logo?: string | null }
  try {
    const res = await fetch(`${hubUrl}/api/demo/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.redirect(new URL('/demo/start', req.url))
    brand = await res.json()
  } catch {
    return NextResponse.redirect(new URL('/demo/start', req.url))
  }

  const jar = await cookies()
  // 30 dias: o prospect volta na demo dias depois e ela ainda tá vestida (1h expirava no meio do uso)
  const MAX_AGE = 60 * 60 * 24 * 30
  jar.set(
    'demo_brand',
    JSON.stringify({
      name: brand.name ?? '',
      color: brand.color ?? null,
      logo: brand.logo ?? null,
    }),
    { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE }
  )
  // Lembra qual demo a pessoa abriu — o middleware usa pra reconduzir raiz/login pra ela
  jar.set('demo_slug', slug, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE })

  return NextResponse.redirect(new URL('/demo/start', req.url))
}
