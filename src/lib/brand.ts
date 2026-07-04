// White-label por deploy. Cada arena tem seu próprio deploy Vercel com estas envs;
// sem elas, o default é a Arena do Parque (não quebra o deploy original).
//   NEXT_PUBLIC_ARENA_NAME  — nome exibido (aba, login, header público)
//   NEXT_PUBLIC_ARENA_LOGO  — caminho do logo em /public (ex: "/logo-life-beach.png").
//                             "none" = sem imagem, usa o nome como wordmark (fallback interino).
//   NEXT_PUBLIC_ARENA_THEME — paleta de cor (data-theme no <html>). "arena" (default) | "life-beach"
// São NEXT_PUBLIC_ = assadas no build; como cada arena buda separado, cada deploy fica com a sua marca.

const rawLogo = process.env.NEXT_PUBLIC_ARENA_LOGO

export const BRAND = {
  name: process.env.NEXT_PUBLIC_ARENA_NAME || 'Arena do Parque',
  // "none" → null (usa wordmark); vazio/ausente → logo padrão da Arena do Parque
  logo: rawLogo === 'none' ? null : (rawLogo || '/logo-arena-branca.png'),
  theme: process.env.NEXT_PUBLIC_ARENA_THEME || 'arena',
  // Cor da marca por deploy (opcional). Setada → o layout injeta a paleta via inline style
  // (deriva tom-fraco e hover com color-mix). Ausente → paleta default (Arena do Parque).
  brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || null,
  brandPrimary: process.env.NEXT_PUBLIC_BRAND_PRIMARY || null,
} as const

export const brandDescription = `${BRAND.name} — agende sua quadra de beach tennis`
