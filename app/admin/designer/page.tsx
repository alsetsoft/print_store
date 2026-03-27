"use client"

import { useState, useEffect } from "react"
import { Package, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProductConstructorModal, PrintConfig } from "@/components/admin/product-constructor-modal"
import type { CompositeBase, CompositePrint, Zone, BaseImage } from "@/components/admin/composite-card"

interface RawProduct {
  id: number
  name: string
  print_config: PrintConfig | null
  bases: {
    id: number
    name: string
  } | null
  print_designs: {
    id: number
    name: string
    image_url: string | null
  } | null
}

interface ProductWithImages {
  id: string
  name: string
  print_config: PrintConfig | null
  base: CompositeBase | null
  print: CompositePrint | null
}

function DesignerContent() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductWithImages | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data: productsData } = await supabase
      .from("products")
      .select(`
        id, name, print_config,
        bases:base_id (id, name),
        print_designs:print_id (id, name, image_url)
      `)
      .order("created_at", { ascending: false })

    // Enrich products with base images and zones
    const enriched: ProductWithImages[] = await Promise.all(
      ((productsData || []) as RawProduct[]).map(async (p) => {
        if (!p.bases) return { 
          id: String(p.id), 
          name: p.name, 
          print_config: p.print_config,
          base: null, 
          print: p.print_designs ? {
            id: String(p.print_designs.id),
            name: p.print_designs.name,
            image_url: p.print_designs.image_url
          } : null
        }

        // Fetch base images
        const { data: imagesData } = await supabase
          .from("base_images")
          .select("id, url, sort_order")
          .eq("base_id", p.bases.id)
          .order("sort_order")

        const images: BaseImage[] = await Promise.all(
          (imagesData || []).map(async (img) => {
            // Parse URL - can be JSON string with {url, label} or plain URL string
            let imageUrl = img.url
            let imageLabel = "Зображення"
            if (typeof img.url === "string") {
              try {
                const parsed = JSON.parse(img.url)
                if (parsed && typeof parsed.url === "string") {
                  imageUrl = parsed.url
                  imageLabel = parsed.label || imageLabel
                }
              } catch {
                // Not JSON, use as-is
              }
            }

            // Fetch zones for this image
            const { data: zonesData } = await supabase
              .from("image_zones")
              .select("id, name, x, y, width, height, is_max")
              .eq("base_image_id", img.id)

            return {
              id: String(img.id),
              url: imageUrl,
              label: imageLabel,
              colorId: null,
              zones: (zonesData || []).map((z) => ({
                id: String(z.id),
                name: z.name,
                x: Number(z.x),
                y: Number(z.y),
                width: Number(z.width),
                height: Number(z.height),
                is_max: z.is_max ?? false,
              })),
            }
          })
        )

        const base: CompositeBase = { 
          id: String(p.bases.id), 
          name: p.bases.name, 
          images 
        }
        
        return { 
          id: String(p.id), 
          name: p.name,
          print_config: p.print_config,
          base, 
          print: p.print_designs ? {
            id: String(p.print_designs.id),
            name: p.print_designs.name,
            image_url: p.print_designs.image_url
          } : null
        }
      })
    )

    setProducts(enriched)
    setLoading(false)
  }

  const handleSaved = (productId: string, config: PrintConfig) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, print_config: config } : p))
    )
  }

  // Get first image URL for preview
  const getPreviewUrl = (product: ProductWithImages) => {
    if (product.base?.images?.[0]?.url) {
      return product.base.images[0].url
    }
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Product List */}
      <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Вибрати товар</h2>
          <p className="text-sm text-muted-foreground">Оберіть товар для налаштування</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Немає товарів</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const previewUrl = getPreviewUrl(product)
              const isSelected = selectedProduct?.id === product.id
              
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`relative rounded-lg border-2 p-2 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-muted mb-2">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Show print overlay if exists */}
                    {product.print?.image_url && (
                      <div className="absolute inset-2 flex items-center justify-center pointer-events-none">
                        <img
                          src={product.print.image_url}
                          alt={product.print.name}
                          className="max-h-[40%] max-w-[40%] object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {product.base?.name || product.name}
                  </p>
                  {product.print && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      + {product.print.name}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Area - Empty State or Modal Trigger */}
      <div className="flex-1 flex items-center justify-center">
        {!selectedProduct ? (
          <div className="text-center">
            <Package className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Оберіть товар</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Виберіть товар зі списку ліворуч для налаштування принта
            </p>
          </div>
        ) : !selectedProduct.base || !selectedProduct.print ? (
          <div className="text-center">
            <Package className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Неповний товар</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Цей товар не має основи або принта
            </p>
          </div>
        ) : null}
      </div>

      {/* Product Constructor Modal */}
      {selectedProduct?.base && selectedProduct?.print && (
        <ProductConstructorModal
          base={selectedProduct.base}
          print={selectedProduct.print}
          productId={selectedProduct.id}
          initialConfig={selectedProduct.print_config}
          onClose={() => {
            setSelectedProduct(null)
            fetchProducts()
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default function DesignerPage() {
  return <DesignerContent />
}
