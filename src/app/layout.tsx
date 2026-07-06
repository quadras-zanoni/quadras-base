import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandProvider } from '@/contexts/BrandContext'
import { Toaster } from 'react-hot-toast'
import { BRAND, brandDescription, type Brand } from '@/lib/brand'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: BRAND.name,
  description: brandDescription,
}

const HEX = /^#[0-9a-fA-F]{6}$/

// Resolve a marca do request. FORA do modo demo, devolve o BRAND do deploy SEM tocar
// em cookie — comportamento byte-a-byte igual ao original (não vira dynamic rendering).
// SÓ quando DEMO_MODE === '1' (existe apenas no deploy de demonstração) é que lê o
// cookie `demo_brand` setado pela rota /demo/[slug]. Valores validados (hex, tamanho).
async function resolveBrand(): Promise<Brand> {
  if (process.env.DEMO_MODE !== '1') return BRAND
  try {
    const raw = (await cookies()).get('demo_brand')?.value
    if (!raw) return BRAND
    const p = JSON.parse(raw) as { name?: string; color?: string; logo?: string }
    const color = typeof p.color === 'string' && HEX.test(p.color) ? p.color : null
    return {
      name: typeof p.name === 'string' && p.name ? p.name.slice(0, 60) : BRAND.name,
      logo: typeof p.logo === 'string' && p.logo ? p.logo : null,
      theme: BRAND.theme,
      brandColor: color ?? BRAND.brandColor,
      brandPrimary: color ?? BRAND.brandPrimary,
    }
  } catch {
    return BRAND
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await resolveBrand()

  // Paleta da marca: se houver cor (do deploy ou do cookie de demo), sobrescreve as CSS
  // vars via inline style (tom-fraco e hover derivados com color-mix). Sem cor = default.
  const brandVars = brand.brandColor
    ? ({
        '--color-brand': brand.brandColor,
        '--color-brand-weak': `color-mix(in srgb, ${brand.brandColor} 14%, #ffffff)`,
        '--color-primary': brand.brandPrimary || brand.brandColor,
        '--color-primary-hover': `color-mix(in srgb, ${brand.brandPrimary || brand.brandColor} 82%, #000000)`,
      } as React.CSSProperties)
    : undefined

  return (
    <html lang="pt-BR" data-theme={brand.theme} style={brandVars} className={inter.variable}>
      <body>
        <BrandProvider value={brand}>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter, sans-serif)',
                  background: '#ffffff',
                  color: '#1e293b',
                  border: '1px solid #e8ebed',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
                },
              }}
            />
          </AuthProvider>
        </BrandProvider>
      </body>
    </html>
  )
}
