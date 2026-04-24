export type SortKey = "popular" | "newest" | "price-asc" | "price-desc"

export const DEFAULT_SORT: SortKey = "popular"

export function parseSort<K extends SortKey>(raw: string | undefined, allowed: readonly K[]): K {
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as K) : (DEFAULT_SORT as K)
}

type Orderable = {
  order: (column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => Orderable
}

export function applySort<Q extends Orderable>(
  query: Q,
  key: SortKey,
  opts: { priceColumn?: string } = {}
): Q {
  const priceColumn = opts.priceColumn ?? "price"
  switch (key) {
    case "popular":
      return query
        .order("is_popular", { ascending: false })
        .order("created_at", { ascending: false }) as Q
    case "newest":
      return query.order("created_at", { ascending: false }) as Q
    case "price-asc":
      return query.order(priceColumn, { ascending: true, nullsFirst: false }) as Q
    case "price-desc":
      return query.order(priceColumn, { ascending: false, nullsFirst: false }) as Q
  }
}
