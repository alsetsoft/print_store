"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { BasesTable } from "@/components/admin/bases/bases-table"
import { BasesHeader } from "@/components/admin/bases/bases-header"
import { Loader2 } from "lucide-react"

interface Base {
  id: string
  name: string
  description: string | null
  price: number | null
  sku: string | null
  image_url: string | null
  base_categories: { id: number; name: string } | null
  base_subcategories: { id: number; name: string } | null
  base_colors: { color_id: number; colors: { id: number; name: string; hex_code: string | null } | null }[] | null
}

interface PageData {
  bases: Base[]
  categories: { id: number; name: string }[]
  subcategories: { id: number; name: string; base_category_id: number }[]
  colors: { id: number; name: string; hex_code: string | null }[]
  sizes: { id: number; name: string; sort_order: number | null }[]
}

export default function BasesPage() {
  const [data, setData] = useState<PageData | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [
      { data: bases },
      { data: categories },
      { data: subcategories },
      { data: colors },
      { data: sizes },
    ] = await Promise.all([
      supabase
        .from("bases")
        .select(`
          *,
          base_categories:base_category_id(id, name),
          base_subcategories:base_subcategory_id(id, name),
          base_colors(color_id, colors:color_id(id, name, hex_code))
        `)
        .order("created_at", { ascending: false }),
      supabase.from("base_categories").select("id, name").order("name"),
      supabase.from("base_subcategories").select("id, name, base_category_id").order("name"),
      supabase.from("colors").select("id, name, hex_code").order("name"),
      supabase.from("sizes").select("id, name, sort_order").order("sort_order"),
    ])

    setData({
      bases: (bases || []) as Base[],
      categories: categories || [],
      subcategories: subcategories || [],
      colors: colors || [],
      sizes: sizes || [],
    })
  }, [])

  useEffect(() => {
    // Ensure is_max column exists in image_zones table
    fetch("/api/migrate-zones").then(() => fetchData()).catch(() => fetchData())
  }, [fetchData])

  return (
    <div className="p-8">
      <BasesHeader
        totalCount={data?.bases.length ?? 0}
        categories={data?.categories ?? []}
        subcategories={data?.subcategories ?? []}
        colors={data?.colors ?? []}
        sizes={data?.sizes ?? []}
        onSuccess={fetchData}
      />

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-accent/20 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Основа — це базовий продукт (футболка, чашка, кепка тощо) на який наноситься принт.
          </p>
        </div>
        {!data ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <BasesTable
            bases={data.bases}
            categories={data.categories}
            subcategories={data.subcategories}
            colors={data.colors}
            sizes={data.sizes}
            onSuccess={fetchData}
          />
        )}
      </div>
    </div>
  )
}
