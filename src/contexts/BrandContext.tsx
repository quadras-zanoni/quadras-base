'use client'

// Marca da arena disponível pros componentes client (BrandMark, header público).
// O DEFAULT do context é o BRAND estático (env por deploy) — então, sem Provider ou
// fora do modo demo, useBrand() devolve exatamente a marca do deploy. No modo demo,
// o layout passa a marca do prospect (lida do cookie) como value.
import { createContext, useContext } from 'react'
import { BRAND, type Brand } from '@/lib/brand'

const BrandContext = createContext<Brand>(BRAND)

export function BrandProvider({ value, children }: { value: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  return useContext(BrandContext)
}
