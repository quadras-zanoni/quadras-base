import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { BRAND, brandDescription } from '@/lib/brand'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Paleta da marca por deploy: se NEXT_PUBLIC_BRAND_COLOR estiver setada, sobrescreve as
  // CSS vars via inline style (tom-fraco e hover derivados com color-mix). Sem env = default.
  const brandVars = BRAND.brandColor
    ? ({
        '--color-brand': BRAND.brandColor,
        '--color-brand-weak': `color-mix(in srgb, ${BRAND.brandColor} 14%, #ffffff)`,
        '--color-primary': BRAND.brandPrimary || BRAND.brandColor,
        '--color-primary-hover': `color-mix(in srgb, ${BRAND.brandPrimary || BRAND.brandColor} 82%, #000000)`,
      } as React.CSSProperties)
    : undefined

  return (
    <html lang="pt-BR" data-theme={BRAND.theme} style={brandVars} className={inter.variable}>
      <body>
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
      </body>
    </html>
  )
}
