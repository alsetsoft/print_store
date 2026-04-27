"use client"

import { useState } from "react"
import { ImageIcon, Layers, Palette, Ruler, ShoppingBag, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export interface OrderItemView {
  id: string
  itemType: string
  itemTypeLabel: string
  name: string
  price: number
  quantity: number
  imageUrl: string | null
  previewDataUrl: string | null
  colorName: string | null
  sizeName: string | null
  printName: string | null
  zoneCount: number
}

interface OrderItemsListProps {
  items: OrderItemView[]
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  const [openItem, setOpenItem] = useState<OrderItemView | null>(null)

  if (items.length === 0) {
    return (
      <Empty className="rounded-lg border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBag className="size-6" />
          </EmptyMedia>
          <EmptyTitle>{"У цьому замовленні немає товарів"}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            onPreviewClick={() => setOpenItem(item)}
          />
        ))}
      </ul>

      <Dialog open={openItem !== null} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-w-2xl p-0 sm:p-0">
          <DialogTitle className="sr-only">{openItem?.name ?? ""}</DialogTitle>
          {openItem && <OrderItemDialogContent item={openItem} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function OrderItemRow({
  item,
  onPreviewClick,
}: {
  item: OrderItemView
  onPreviewClick: () => void
}) {
  const previewSrc = item.previewDataUrl ?? item.imageUrl
  const lineTotal = Math.round(item.price * item.quantity)

  return (
    <li className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onPreviewClick}
          aria-label={"Відкрити прев'ю"}
          className="group relative size-20 shrink-0 overflow-hidden rounded-md border bg-muted/30 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-24"
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={item.name}
              className="size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-6 text-muted-foreground/40" />
            </div>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.itemTypeLabel}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold sm:text-base">
                {lineTotal} {"грн"}
              </p>
              {item.quantity > 1 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {Math.round(item.price)} {"×"} {item.quantity}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {item.colorName && (
              <SpecLine icon={<Palette className="size-3.5" />}>{item.colorName}</SpecLine>
            )}
            {item.sizeName && (
              <SpecLine icon={<Ruler className="size-3.5" />}>{item.sizeName}</SpecLine>
            )}
            {item.printName && (
              <SpecLine icon={<Sparkles className="size-3.5" />}>{item.printName}</SpecLine>
            )}
            {item.zoneCount > 0 && (
              <SpecLine icon={<Layers className="size-3.5" />}>
                {item.zoneCount}{" "}
                {item.zoneCount === 1
                  ? "зона друку"
                  : "зони друку"}
              </SpecLine>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function SpecLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      <span className="text-foreground/80">{children}</span>
    </span>
  )
}

function OrderItemDialogContent({ item }: { item: OrderItemView }) {
  const previewSrc = item.previewDataUrl ?? item.imageUrl

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-center bg-muted/30 p-4 sm:p-6">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={item.name}
            className="max-h-[60vh] w-auto object-contain"
          />
        ) : (
          <div className="flex aspect-square w-full max-w-md items-center justify-center">
            <ImageIcon className="size-12 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="space-y-2 border-t p-4 sm:p-5">
        <p className="text-base font-semibold">{item.name}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {item.colorName && (
            <SpecLine icon={<Palette className="size-4" />}>{item.colorName}</SpecLine>
          )}
          {item.sizeName && (
            <SpecLine icon={<Ruler className="size-4" />}>{item.sizeName}</SpecLine>
          )}
          {item.printName && (
            <SpecLine icon={<Sparkles className="size-4" />}>{item.printName}</SpecLine>
          )}
          {item.zoneCount > 0 && (
            <SpecLine icon={<Layers className="size-4" />}>
              {item.zoneCount}{" "}
              {item.zoneCount === 1
                ? "зона друку"
                : "зони друку"}
            </SpecLine>
          )}
        </div>
      </div>
    </div>
  )
}
