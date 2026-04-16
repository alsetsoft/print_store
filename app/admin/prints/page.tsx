"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { PrintsTable } from "@/components/admin/prints/prints-table"
import { PrintsHeader } from "@/components/admin/prints/prints-header"
import { Loader2 } from "lucide-react"

interface Print {
  id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  print_categories: { id: string; name: string } | null
  print_subcategories: { id: string; name: string } | null
  created_at: string
}

interface Category {
  id: string
  name: string
}

export default function PrintsPage() {
  const [prints, setPrints] = useState<Print[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [{ data: printsData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from("print_designs")
        .select(`
          *,
          print_categories:print_category_id (id, name),
          print_subcategories:print_subcategory_id (id, name)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("print_categories").select("*").order("name"),
    ])

    setPrints((printsData || []) as Print[])
    setCategories(categoriesData || [])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="p-6 lg:p-8">
      <PrintsHeader
        totalCount={prints?.length ?? 0}
        categories={categories}
        onSuccess={fetchData}
      />

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-accent/30 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs">i</span>
            <span suppressHydrationWarning>
              Призначайте один принт на декілька матеріалів одночасно. Якщо ви додасте новий принт та призначите його на 3 матеріали — система одразу створить 3 нових товари у каталозі.
            </span>
          </div>
        </div>
        {prints === null ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PrintsTable prints={prints} categories={categories} onSuccess={fetchData} />
        )}
      </div>
    </div>
  )
}
