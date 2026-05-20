import { Sidebar } from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/layout/AuthGuard'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen" style={{ background: '#05050a' }}>
        <Sidebar />
        <main className="flex-1 pt-14 lg:pt-0 overflow-x-hidden">
          <div className="max-w-[1180px] mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
