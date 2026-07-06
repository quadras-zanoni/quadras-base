'use client'

import { useBrand } from '@/contexts/BrandContext'

/**
 * Marca da arena (logo ou wordmark). Lê a marca de `useBrand()` — que é o BRAND do
 * deploy (env) por padrão, ou a marca do prospect no modo demo.
 * - Com logo configurado → renderiza a imagem (className controla o tamanho).
 * - Sem logo ("none") → wordmark com o nome; `compact` mostra as iniciais (sidebar recolhida).
 */
export function BrandMark({
  className = '',
  textClassName = 'text-xl font-bold text-brand tracking-tight',
  compact = false,
}: {
  className?: string
  textClassName?: string
  compact?: boolean
}) {
  const brand = useBrand()

  if (brand.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo} alt={brand.name} className={className} />
  }

  if (compact) {
    const initials = brand.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
        {initials}
      </span>
    )
  }

  return <span className={textClassName}>{brand.name}</span>
}
