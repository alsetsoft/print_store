"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LayoutGrid, Palette, Package, ShoppingCart, Loader2 } from "lucide-react"

interface Stats {
  prints: number
  bases: number
  categories: number
}

const cards = [
  {
    title: "Принти",
    key: "prints" as const,
    description: "Загальна кількість дизайнів",
    icon: Palette,
    href: "/admin/prints",
  },
  {
    title: "Основи",
    key: "bases" as const,
    description: "Доступні матеріали для друку",
    icon: Package,
    href: "/admin/bases",
  },
  {
    title: "Категорії",
    key: "categories" as const,
    description: "Категорії принтів",
    icon: LayoutGrid,
    href: "/admin/prints",
  },
  {
    title: "Замовлення",
    key: null,
    description: "Активні замовлення",
    icon: ShoppingCart,
    href: "/admin/orders",
  },
]

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchStats() {
      const [
        { count: printsCount },
        { count: basesCount },
        { count: categoriesCount },
      ] = await Promise.all([
        supabase.from("print_designs").select("*", { count: "exact", head: true }),
        supabase.from("bases").select("*", { count: "exact", head: true }),
        supabase.from("print_categories").select("*", { count: "exact", head: true }),
      ])

      setStats({
        prints: printsCount || 0,
        bases: basesCount || 0,
        categories: categoriesCount || 0,
      })
    }

    fetchStats()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Огляд</h1>
        <p className="text-muted-foreground">Загальна статистика вашого каталогу</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const value = card.key ? (stats ? stats[card.key] : null) : 0
          return (
            <a
              key={card.title}
              href={card.href}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-semibold text-foreground">
                {value === null ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  value
                )}
              </p>
              <p className="font-medium text-foreground">{card.title}</p>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
