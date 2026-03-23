"use client"

import { useState } from "react"
import { X, Loader2, Check, ImageIcon, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Base {
  id: string
  name: string
  image_url: string | null
  price: number
}

interface Print {
  id: string
  name: string
  image_url: string | null
  price: number | null
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bases: Base[]
  prints: Print[]
  onSuccess?: () => void
}

export function ProductFormDialog({
  open,
  onOpenChange,
  bases,
  prints,
  onSuccess,
}: ProductFormDialogProps) {
  const [step, setStep] = useState<"bases" | "print" | "confirm">("bases")
  const [selectedBaseIds, setSelectedBaseIds] = useState<string[]>([])
  const [selectedPrintId, setSelectedPrintId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchBases, setSearchBases] = useState("")
  const [searchPrints, setSearchPrints] = useState("")
  const supabase = createClient()

  const filteredBases = bases.filter((b) =>
    b.name.toLowerCase().includes(searchBases.toLowerCase())
  )

  const filteredPrints = prints.filter((p) =>
    p.name.toLowerCase().includes(searchPrints.toLowerCase())
  )

  const selectedBases = bases.filter((b) => selectedBaseIds.includes(b.id))
  const selectedPrint = prints.find((p) => p.id === selectedPrintId)

  const toggleBase = (id: string) => {
    setSelectedBaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAllBases = () => {
    setSelectedBaseIds(filteredBases.map((b) => b.id))
  }

  const clearSelection = () => {
    setSelectedBaseIds([])
  }

  const handleCreate = async () => {
    if (selectedBaseIds.length === 0 || !selectedPrintId) return

    setIsLoading(true)
    try {
      // Create a product for each selected base
      const productsToCreate = selectedBaseIds.map((baseId) => {
        const base = bases.find((b) => b.id === baseId)
        const print = prints.find((p) => p.id === selectedPrintId)
        return {
          name: `${base?.name || "Base"} - ${print?.name || "Print"}`,
          base_id: parseInt(baseId),
          print_id: parseInt(selectedPrintId),
          price: (Number(base?.price) || 0) + (Number(print?.price) || 0),
          is_active: true,
        }
      })

      const { error } = await supabase.from("products").insert(productsToCreate)

      if (error) {
        console.error("Error creating products:", error)
        throw error
      }

      // Reset and close
      setSelectedBaseIds([])
      setSelectedPrintId(null)
      setStep("bases")
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error("Failed to create products:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetAndClose = () => {
    setSelectedBaseIds([])
    setSelectedPrintId(null)
    setStep("bases")
    setSearchBases("")
    setSearchPrints("")
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Створити товари
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "bases" && "Крок 1: Оберіть основи (можна декілька)"}
              {step === "print" && "Крок 2: Оберіть принт"}
              {step === "confirm" && "Крок 3: Підтвердження"}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === "bases"
                ? "bg-primary text-primary-foreground"
                : "bg-primary/20 text-primary"
            }`}
          >
            {selectedBaseIds.length > 0 && step !== "bases" ? (
              <Check className="h-4 w-4" />
            ) : (
              "1"
            )}
          </div>
          <span className="text-sm text-muted-foreground">Основи</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === "print"
                ? "bg-primary text-primary-foreground"
                : step === "confirm"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {selectedPrintId && step === "confirm" ? (
              <Check className="h-4 w-4" />
            ) : (
              "2"
            )}
          </div>
          <span className="text-sm text-muted-foreground">Принт</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === "confirm"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            3
          </div>
          <span className="text-sm text-muted-foreground">Підтвердження</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select bases */}
          {step === "bases" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Пошук основ..."
                  value={searchBases}
                  onChange={(e) => setSearchBases(e.target.value)}
                  className="w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllBases}
                    className="rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Обрати все
                  </button>
                  {selectedBaseIds.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    >
                      Очистити ({selectedBaseIds.length})
                    </button>
                  )}
                </div>
              </div>

              {filteredBases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {searchBases
                      ? "Основ не знайдено"
                      : "Спочатку створіть основи в розділі Основи"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredBases.map((base) => {
                    const isSelected = selectedBaseIds.includes(base.id)
                    return (
                      <div
                        key={base.id}
                        onClick={() => toggleBase(base.id)}
                        className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square bg-muted">
                          {base.image_url ? (
                            <img
                              src={base.image_url}
                              alt={base.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        {/* Selection checkbox */}
                        <div
                          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white bg-white/80"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {base.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(Number(base.price) || 0) + (Number(selectedPrint?.price) || 0)} ₴
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select print */}
          {step === "print" && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Пошук принтів..."
                  value={searchPrints}
                  onChange={(e) => setSearchPrints(e.target.value)}
                  className="w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {filteredPrints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {searchPrints
                      ? "Принтів не знайдено"
                      : "Спочатку створіть принти в розділі Принти"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {filteredPrints.map((print) => {
                    const isSelected = selectedPrintId === print.id
                    return (
                      <div
                        key={print.id}
                        onClick={() => setSelectedPrintId(print.id)}
                        className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square bg-muted">
                          {print.image_url ? (
                            <img
                              src={print.image_url}
                              alt={print.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {print.name}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === "confirm" && (
            <div>
              <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-3 font-medium text-foreground">
                  Буде створено {selectedBaseIds.length} товар
                  {selectedBaseIds.length > 1 ? "ів" : ""}:
                </h3>
                <div className="flex items-start gap-4">
                  {/* Selected bases */}
                  <div className="flex-1">
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Основи ({selectedBases.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBases.slice(0, 6).map((base) => (
                        <div
                          key={base.id}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                            {base.image_url ? (
                              <img
                                src={base.image_url}
                                alt={base.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm">{base.name}</span>
                        </div>
                      ))}
                      {selectedBases.length > 6 && (
                        <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                          +{selectedBases.length - 6} ще
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plus sign */}
                  <div className="flex h-10 w-10 items-center justify-center text-2xl text-muted-foreground">
                    +
                  </div>

                  {/* Selected print */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Принт
                    </p>
                    {selectedPrint && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                        <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                          {selectedPrint.image_url ? (
                            <img
                              src={selectedPrint.image_url}
                              alt={selectedPrint.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm">{selectedPrint.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview grid */}
              <h4 className="mb-3 text-sm font-medium text-foreground">
                Попередній перегляд товарів:
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {selectedBases.slice(0, 8).map((base) => (
                  <div
                    key={base.id}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <div className="relative aspect-square bg-muted">
                      {base.image_url ? (
                        <img
                          src={base.image_url}
                          alt={base.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      {selectedPrint?.image_url && (
                        <div className="absolute bottom-2 right-2 h-10 w-10 overflow-hidden rounded border-2 border-white bg-white shadow">
                          <img
                            src={selectedPrint.image_url}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-foreground line-clamp-1">
                        {base.name} - {selectedPrint?.name}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {base.price} ₴
                      </p>
                    </div>
                  </div>
                ))}
                {selectedBases.length > 8 && (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      +{selectedBases.length - 8} ще
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-border px-6 py-4">
          <button
            onClick={() => {
              if (step === "print") setStep("bases")
              else if (step === "confirm") setStep("print")
              else resetAndClose()
            }}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {step === "bases" ? "Скасувати" : "Назад"}
          </button>

          {step === "bases" && (
            <button
              onClick={() => setStep("print")}
              disabled={selectedBaseIds.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Далі
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {step === "print" && (
            <button
              onClick={() => setStep("confirm")}
              disabled={!selectedPrintId}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Далі
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {step === "confirm" && (
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Створити {selectedBaseIds.length} товар
              {selectedBaseIds.length > 1 ? "ів" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
