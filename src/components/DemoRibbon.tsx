'use client'

// Selo fixo do ambiente de demonstração. O layout só o monta quando DEMO_MODE=1,
// então o componente em si não precisa checar env.
export function DemoRibbon() {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
      🔎 Ambiente de demonstração
    </div>
  )
}
