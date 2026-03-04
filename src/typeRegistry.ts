import type { AppType } from './types.ts'

export type TypeCategory = 'Frontend' | 'Backend' | 'DevOps' | 'Other'

export interface TypeMeta {
  label: string
  classes: string
  category: TypeCategory
}

export const typeRegistry: Record<string, TypeMeta> = {
  vite:      { label: 'Vite',      classes: 'text-emerald-400 bg-emerald-400/10', category: 'Frontend' },
  nextjs:    { label: 'Next.js',   classes: 'text-white bg-white/10',             category: 'Frontend' },
  nuxt:      { label: 'Nuxt',      classes: 'text-teal-400 bg-teal-400/10',       category: 'Frontend' },
  astro:     { label: 'Astro',     classes: 'text-orange-400 bg-orange-400/10',    category: 'Frontend' },
  remix:     { label: 'Remix',     classes: 'text-blue-400 bg-blue-400/10',        category: 'Frontend' },
  svelte:    { label: 'Svelte',    classes: 'text-orange-500 bg-orange-500/10',    category: 'Frontend' },
  streamlit: { label: 'Streamlit', classes: 'text-purple-400 bg-purple-400/10',    category: 'Frontend' },

  fastapi:   { label: 'FastAPI',   classes: 'text-sky-400 bg-sky-400/10',          category: 'Backend' },
  django:    { label: 'Django',    classes: 'text-green-400 bg-green-400/10',      category: 'Backend' },
  flask:     { label: 'Flask',     classes: 'text-slate-400 bg-slate-400/10',      category: 'Backend' },
  express:   { label: 'Express',   classes: 'text-lime-400 bg-lime-400/10',        category: 'Backend' },
  node:      { label: 'Node',      classes: 'text-yellow-400 bg-yellow-400/10',    category: 'Backend' },
  spring:    { label: 'Spring',    classes: 'text-green-500 bg-green-500/10',      category: 'Backend' },
  laravel:   { label: 'Laravel',   classes: 'text-rose-400 bg-rose-400/10',        category: 'Backend' },
  go:        { label: 'Go',        classes: 'text-cyan-400 bg-cyan-400/10',        category: 'Backend' },
  rust:      { label: 'Rust',      classes: 'text-amber-500 bg-amber-500/10',      category: 'Backend' },
  ruby:      { label: 'Ruby',      classes: 'text-red-400 bg-red-400/10',          category: 'Backend' },

  docker:    { label: 'Docker',    classes: 'text-blue-500 bg-blue-500/10',        category: 'DevOps' },

  other:     { label: 'Other',     classes: 'text-neutral-400 bg-neutral-400/10',  category: 'Other' },
  grouped:   { label: 'Grouped',   classes: 'text-indigo-400 bg-indigo-400/10',    category: 'Other' },
}

export function getTypeClasses(type: string): string {
  return (typeRegistry[type] || typeRegistry.other).classes
}

/** App types available for selection in forms (excludes 'grouped'), flat list */
export const selectableTypes: { value: AppType; label: string }[] = Object.entries(typeRegistry)
  .filter(([key]) => key !== 'grouped')
  .map(([value, meta]) => ({ value: value as AppType, label: meta.label }))

/** Grouped by category for <optgroup> dropdowns */
export const groupedSelectableTypes: { category: TypeCategory; types: { value: AppType; label: string }[] }[] = (() => {
  const categoryOrder: TypeCategory[] = ['Frontend', 'Backend', 'DevOps', 'Other']
  const grouped = new Map<TypeCategory, { value: AppType; label: string }[]>()
  for (const cat of categoryOrder) grouped.set(cat, [])

  for (const [key, meta] of Object.entries(typeRegistry)) {
    if (key === 'grouped') continue
    grouped.get(meta.category)!.push({ value: key as AppType, label: meta.label })
  }

  return categoryOrder
    .filter(cat => grouped.get(cat)!.length > 0)
    .map(cat => ({ category: cat, types: grouped.get(cat)! }))
})()
