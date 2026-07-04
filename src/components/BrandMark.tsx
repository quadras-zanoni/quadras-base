import { BRAND } from '@/lib/brand'

/**
 * Marca da arena (logo ou wordmark). Lê a config de `BRAND` (env por deploy).
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
  if (BRAND.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND.logo} alt={BRAND.name} className={className} />
  }

  if (compact) {
    const initials = BRAND.name
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

  return <span className={textClassName}>{BRAND.name}</span>
}
