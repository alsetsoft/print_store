"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, ChevronsUpDown, Check, Loader2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

import { useCart } from "@/lib/cart-context"
import { CartItemPreview } from "@/components/store/cart-item-preview"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

import {
  searchNovaPoshtaCities,
  getNovaPoshtaWarehouses,
  createOrder,
  generatePaymentData,
} from "./actions"

// ── Schema ──

const checkoutSchema = z.object({
  customerName: z.string().min(2, "\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0456\u043c'\u044f"),
  customerPhone: z.string().min(10, "\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443"),
  customerEmail: z.string().email("\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 email").or(z.literal("")),
  comment: z.string().optional(),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

interface City {
  ref: string
  description: string
  region: string
}

interface Warehouse {
  ref: string
  description: string
}

// ── Component ──

export function CheckoutClient() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()

  // Nova Poshta state
  const [cities, setCities] = useState<City[]>([])
  const [citySearch, setCitySearch] = useState("")
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [warehousesLoading, setWarehousesLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  // Hidden form ref for LiqPay redirect
  const liqpayFormRef = useRef<HTMLFormElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerPhone: "", customerEmail: "", comment: "" },
  })

  // ── City search with debounce ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCitySearch = useCallback((value: string) => {
    setCitySearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setCities([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setCitiesLoading(true)
      try {
        const results = await searchNovaPoshtaCities(value)
        setCities(results)
      } catch {
        setCities([])
      } finally {
        setCitiesLoading(false)
      }
    }, 300)
  }, [])

  // ── Load warehouses when city changes ──
  useEffect(() => {
    if (!selectedCity) {
      setWarehouses([])
      setSelectedWarehouse(null)
      return
    }
    let cancelled = false
    setWarehousesLoading(true)
    getNovaPoshtaWarehouses(selectedCity.ref)
      .then((data) => {
        if (!cancelled) setWarehouses(data)
      })
      .catch(() => {
        if (!cancelled) setWarehouses([])
      })
      .finally(() => {
        if (!cancelled) setWarehousesLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedCity])

  // ── Submit ──
  const onSubmit = async (values: CheckoutFormValues) => {
    if (!selectedCity || !selectedWarehouse) {
      toast.error("\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e \u0442\u0430 \u0432\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f \u041d\u043e\u0432\u043e\u0457 \u041f\u043e\u0448\u0442\u0438")
      return
    }

    setSubmitting(true)
    try {
      const { orderId, orderNumber } = await createOrder(
        {
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          customerEmail: values.customerEmail || undefined,
          comment: values.comment || undefined,
          npCityRef: selectedCity.ref,
          npCityName: selectedCity.description,
          npWarehouseRef: selectedWarehouse.ref,
          npWarehouseName: selectedWarehouse.description,
        },
        items.map((item) => ({
          id: item.id,
          type: item.type,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          colorName: item.colorName,
          sizeName: item.sizeName,
          previewDataUrl: item.previewDataUrl,
        }))
      )

      const { data, signature } = await generatePaymentData(orderId, orderNumber, totalPrice)

      // Clear cart before redirect
      clearCart()

      // Submit hidden form to LiqPay
      const form = liqpayFormRef.current!
      ;(form.elements.namedItem("data") as HTMLInputElement).value = data
      ;(form.elements.namedItem("signature") as HTMLInputElement).value = signature
      form.submit()
    } catch (e) {
      console.error("Checkout error:", e)
      toast.error("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u043f\u0440\u0438 \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043d\u0456 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f")
      setSubmitting(false)
    }
  }

  // ── Empty cart redirect ──
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="mb-4 size-16 text-muted-foreground/20" />
        <h1 className="text-xl font-bold">
          {"\u041a\u043e\u0448\u0438\u043a \u043f\u043e\u0440\u043e\u0436\u043d\u0456\u0439"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {"\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0442\u043e\u0432\u0430\u0440\u0438 \u0434\u043e \u043a\u043e\u0448\u0438\u043a\u0430, \u0449\u043e\u0431 \u043e\u0444\u043e\u0440\u043c\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
        </p>
        <Link
          href="/catalog"
          className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="size-4" />
          {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {"\u041e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043d\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 lg:flex-row">
        {/* ── Left: Form ── */}
        <div className="flex-1 space-y-6">
          {/* Contact info */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold">
              {"\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u0456 \u0434\u0430\u043d\u0456"}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">{"\u0406\u043c'\u044f \u0442\u0430 \u043f\u0440\u0456\u0437\u0432\u0438\u0449\u0435"} *</Label>
                <Input
                  id="customerName"
                  {...register("customerName")}
                  placeholder={"\u0406\u0432\u0430\u043d \u0406\u0432\u0430\u043d\u0435\u043d\u043a\u043e"}
                  className="mt-1.5"
                />
                {errors.customerName && (
                  <p className="mt-1 text-xs text-destructive">{errors.customerName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerPhone">{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"} *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  {...register("customerPhone")}
                  placeholder="+380XXXXXXXXX"
                  className="mt-1.5"
                />
                {errors.customerPhone && (
                  <p className="mt-1 text-xs text-destructive">{errors.customerPhone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...register("customerEmail")}
                  placeholder="email@example.com"
                  className="mt-1.5"
                />
                {errors.customerEmail && (
                  <p className="mt-1 text-xs text-destructive">{errors.customerEmail.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nova Poshta delivery */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold">
              {"\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u041d\u043e\u0432\u043e\u044e \u041f\u043e\u0448\u0442\u043e\u044e"}
            </h2>
            <div className="space-y-4">
              {/* City */}
              <div>
                <Label>{"\u041c\u0456\u0441\u0442\u043e"} *</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className="mt-1.5 w-full justify-between font-normal"
                    >
                      {selectedCity
                        ? selectedCity.description
                        : "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e..."}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={"\u041f\u043e\u0448\u0443\u043a \u043c\u0456\u0441\u0442\u0430..."}
                        value={citySearch}
                        onValueChange={handleCitySearch}
                      />
                      <CommandList>
                        {citiesLoading && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!citiesLoading && citySearch.length >= 2 && cities.length === 0 && (
                          <CommandEmpty>{"\u041c\u0456\u0441\u0442\u043e \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}</CommandEmpty>
                        )}
                        <CommandGroup>
                          {cities.map((city) => (
                            <CommandItem
                              key={city.ref}
                              value={city.ref}
                              onSelect={() => {
                                setSelectedCity(city)
                                setSelectedWarehouse(null)
                                setCityOpen(false)
                                setCitySearch("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  selectedCity?.ref === city.ref ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {city.description}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Warehouse */}
              <div>
                <Label>{"\u0412\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f"} *</Label>
                <Popover open={warehouseOpen} onOpenChange={setWarehouseOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={warehouseOpen}
                      disabled={!selectedCity}
                      className="mt-1.5 w-full justify-between font-normal"
                    >
                      {selectedWarehouse
                        ? selectedWarehouse.description
                        : selectedCity
                          ? "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0432\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f..."
                          : "\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e"}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={"\u041f\u043e\u0448\u0443\u043a \u0432\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f..."} />
                      <CommandList>
                        {warehousesLoading && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!warehousesLoading && warehouses.length === 0 && (
                          <CommandEmpty>{"\u0412\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}</CommandEmpty>
                        )}
                        <CommandGroup>
                          {warehouses.map((wh) => (
                            <CommandItem
                              key={wh.ref}
                              value={wh.description}
                              onSelect={() => {
                                setSelectedWarehouse(wh)
                                setWarehouseOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  selectedWarehouse?.ref === wh.ref ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {wh.description}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold">
              {"\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440"}
            </h2>
            <Textarea
              {...register("comment")}
              placeholder={"\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456 \u043f\u043e\u0431\u0430\u0436\u0430\u043d\u043d\u044f \u0434\u043e \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f..."}
              rows={3}
            />
          </div>
        </div>

        {/* ── Right: Order summary ── */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 space-y-4">
            <Link
              href="/cart"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              {"\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044f \u0434\u043e \u043a\u043e\u0448\u0438\u043a\u0430"}
            </Link>

            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">
                {"\u0412\u0430\u0448\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
              </h2>

              {/* Items list */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted/30">
                      <CartItemPreview item={item} size={96} className="size-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug line-clamp-2">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.quantity} {"\u0448\u0442."} &times; {item.price ?? 0} {"\u0433\u0440\u043d"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold">
                      {(item.price ?? 0) * item.quantity} {"\u0433\u0440\u043d"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{"\u0420\u0430\u0437\u043e\u043c"}</span>
                  <span className="text-xl font-bold">{totalPrice} {"\u0433\u0440\u043d"}</span>
                </div>
              </div>

              {/* Pay button */}
              <Button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {"\u041e\u0431\u0440\u043e\u0431\u043a\u0430..."}
                  </>
                ) : (
                  <>
                    {"\u041e\u043f\u043b\u0430\u0442\u0438\u0442\u0438"} ({totalPrice} {"\u0433\u0440\u043d"})
                  </>
                )}
              </Button>

              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                {"\u0411\u0435\u0437\u043f\u0435\u0447\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 LiqPay"}
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Hidden LiqPay form */}
      <form
        ref={liqpayFormRef}
        method="POST"
        action="https://www.liqpay.ua/api/3/checkout"
        className="hidden"
      >
        <input type="hidden" name="data" value="" />
        <input type="hidden" name="signature" value="" />
      </form>
    </>
  )
}
