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
  if (!hubUrl) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  let brand: { name?: string; color?: string | null; logo?: string | null }
  try {
    const res = await fetch(`${hubUrl}/api/demo/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.redirect(new URL('/login', req.url))
    brand = await res.json()
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const jar = await cookies()
  jar.set(
    'demo_brand',
    JSON.stringify({
      name: brand.name ?? '',
      color: brand.color ?? null,
      logo: brand.logo ?? null,
    }),
    { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 }
  )

  return NextResponse.redirect(new URL('/demo/start', req.url))
}
