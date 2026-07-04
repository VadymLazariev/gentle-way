const OFF_SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v2'

export type OffNutriments = {
  'energy-kcal_100g'?: number
  'energy-kcal_serving'?: number
  proteins_100g?: number
  proteins_serving?: number
  carbohydrates_100g?: number
  carbohydrates_serving?: number
  fat_100g?: number
  fat_serving?: number
  'serving_size'?: string
}

export type OffProduct = {
  code: string
  product_name?: string
  brands?: string
  nutriments?: OffNutriments
  serving_size?: string
  serving_quantity?: number
}

export type OffSearchHit = {
  code: string
  product_name?: string
  brands?: string
  nutriments?: OffNutriments
}

export type ParsedFoodMacros = {
  offProductId: string
  barcode: string | null
  name: string
  brand: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  servingSizeG: number | null
  servingDescription: string | null
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
}

function num(value: number | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return value
}

function parseServingSizeG(product: OffProduct): number | null {
  if (product.serving_quantity != null && !Number.isNaN(product.serving_quantity)) {
    return product.serving_quantity
  }
  const raw = product.serving_size ?? product.nutriments?.['serving_size']
  if (!raw) return null
  const match = raw.match(/([\d.]+)\s*g/i)
  return match ? Number(match[1]) : null
}

export function parseOffProduct(product: OffProduct): ParsedFoodMacros | null {
  const name = product.product_name?.trim()
  if (!name || !product.code) return null

  const n = product.nutriments
  const servingSizeG = parseServingSizeG(product)

  return {
    offProductId: product.code,
    barcode: product.code.length >= 8 ? product.code : null,
    name,
    brand: product.brands?.split(',')[0]?.trim() ?? null,
    caloriesPer100g: num(n?.['energy-kcal_100g']),
    proteinPer100g: num(n?.proteins_100g),
    carbsPer100g: num(n?.carbohydrates_100g),
    fatPer100g: num(n?.fat_100g),
    servingSizeG,
    servingDescription: product.serving_size ?? n?.['serving_size'] ?? null,
    caloriesPerServing: num(n?.['energy-kcal_serving']),
    proteinPerServing: num(n?.proteins_serving),
    carbsPerServing: num(n?.carbohydrates_serving),
    fatPerServing: num(n?.fat_serving),
  }
}

function matchesSearchQuery(product: ParsedFoodMacros, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
  if (terms.length === 0) return true

  const haystack = `${product.name} ${product.brand ?? ''}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export async function searchOpenFoodFacts(query: string, pageSize = 20): Promise<ParsedFoodMacros[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    action: 'process',
    search_terms: trimmed,
    json: '1',
    page_size: String(pageSize),
    sort_by: 'unique_scans_n',
    fields: 'code,product_name,brands,nutriments,serving_size,serving_quantity',
  })

  const res = await fetch(`${OFF_SEARCH_BASE}?${params.toString()}`)
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`)

  const json = (await res.json()) as { products?: OffProduct[] }
  return (json.products ?? [])
    .map(parseOffProduct)
    .filter((p): p is ParsedFoodMacros => p != null)
    .filter((p) => matchesSearchQuery(p, trimmed))
}

export async function fetchOpenFoodFactsByBarcode(barcode: string): Promise<ParsedFoodMacros | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  const res = await fetch(
    `${OFF_PRODUCT_BASE}/product/${encodeURIComponent(trimmed)}?fields=code,product_name,brands,nutriments,serving_size,serving_quantity`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts product fetch failed (${res.status})`)

  const json = (await res.json()) as { product?: OffProduct; status?: number }
  if (json.status === 0 || !json.product) return null
  return parseOffProduct(json.product)
}
