import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BILLING_HUB_URL = process.env.BILLING_HUB_URL
const BILLING_TENANT_KEY = process.env.BILLING_TENANT_KEY

const BYPASS_PATHS = [
  '/subscription',
  '/login',
  '/cadastro',
  '/reservar',
  '/api/',
  '/_next/',
  '/favicon',
  '/robots',
  '/sitemap',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sem billing configurado: fail open
  if (!BILLING_HUB_URL || !BILLING_TENANT_KEY) return NextResponse.next()

  if (BYPASS_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  try {
    const res = await fetch(
      `${BILLING_HUB_URL}/api/subscription/check?tenant_key=${BILLING_TENANT_KEY}`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) return NextResponse.next() // fail open

    const data = await res.json()

    if (!data.active) {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  } catch {
    // billing-hub indisponível — não bloqueia
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
