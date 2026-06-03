import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gestão de Quadras',
  description: 'Sistema de gestão para quadras esportivas de beach tennis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
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
