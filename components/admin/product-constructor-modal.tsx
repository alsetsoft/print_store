"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  X, ZoomIn, ZoomOut, RotateCcw, FlipHorizontal2,
  Maximize2, Minimize2, Loader2, Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { CompositeBase, CompositePrint, BaseImage } from "@/components/admin/composite-card"

interface PrintPlacement {
  zone_id: number
  x: number
  y: number
  scale: number
  is_mirrored: boolean
  print_id: number | null
  print_image_url: string | null
}

export interface PrintConfig {
  x: number
  y: number
  scale: number
  flipped: boolean
  zoneId: string | null
  imageIndex: number
}

interface ProductConstructorModalProps {
  base: CompositeBase
  print: CompositePrint
  productId: string
  productName?: string
  productDescription?: string | null
  initialConfig?: PrintConfig | null
  allowedPlacements?: Array<{ imageId: string; zoneId: string }>
  initialPrimary?: { imageId: string; zoneId: string } | null
  onClose: () => void
  onSaved: (productId: string, config: PrintConfig) => void
}

type GestureKind = "drag" | "resize" | "pinch" | null

interface Gesture {
  kind: Exclude<GestureKind, null>
  pointerIds: number[]
  // resize (matches /create): direction + starting client coords + starting scale.
  dir?: "shrink" | "grow"
  startClient?: { x: number; y: number }
  startScale?: number
  // pinch: starting two-pointer distance (px) + starting scale + starting center (zone %).
  startPinchDist?: number
  startPinchScale?: number
  startPinchCenter?: { x: number; y: number }
  startPinchMidpoint?: { x: number; y: number } // in zone %
}

const SNAP_THRESHOLD = 3 // % inside zone where print snaps to center

export function ProductConstructorModal({
  base,
  print,
  productId,
  productName: initialProductName,
  productDescription: initialProductDescription,
  initialConfig,
  allowedPlacements,
  initialPrimary,
  onClose,
  onSaved,
}: ProductConstructorModalProps) {
  // Filter images/zones to what the generator picked, plus the MAX zone of each
  // included image (so admin can always reposition on the largest zone).
  const visibleImages: BaseImage[] = useMemo(() => {
    const allowed = allowedPlacements && allowedPlacements.length > 0 ? allowedPlacements : null
    if (!allowed) return base.images
    return base.images
      .map((img) => {
        const inAllowed = allowed.some((p) => p.imageId === img.id)
        if (!inAllowed) return { ...img, zones: [] as typeof img.zones }
        const zones = img.zones.filter(
          (z) => z.is_max || allowed.some((p) => p.imageId === img.id && p.zoneId === z.id),
        )
        return { ...img, zones }
      })
      .filter((img) => img.zones.length > 0)
  }, [base.images, allowedPlacements])

  const hasImages = visibleImages.length > 0

  // Resolve initial image/zone indices.
  const initialImgIdx = useMemo(() => {
    if (!hasImages) return 0
    if (
      initialConfig?.imageIndex != null &&
      initialConfig.imageIndex >= 0 &&
      initialConfig.imageIndex < visibleImages.length
    ) {
      return initialConfig.imageIndex
    }
    if (initialPrimary) {
      const i = visibleImages.findIndex((img) => img.id === initialPrimary.imageId)
      if (i >= 0) return i
    }
    return 0
  }, [hasImages, visibleImages, initialConfig?.imageIndex, initialPrimary])

  const initialZoneId = useMemo(() => {
    const img = visibleImages[initialImgIdx]
    if (!img) return null
    if (initialConfig?.zoneId && img.zones.some((z) => z.id === initialConfig.zoneId)) {
      return initialConfig.zoneId
    }
    if (initialPrimary && img.zones.some((z) => z.id === initialPrimary.zoneId)) {
      return initialPrimary.zoneId
    }
    return img.zones[0]?.id ?? null
  }, [visibleImages, initialImgIdx, initialConfig?.zoneId, initialPrimary])

  const [imgIndex, setImgIndex] = useState(initialImgIdx)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(initialZoneId)
  const [printPosition, setPrintPosition] = useState({
    x: initialConfig?.x ?? 50,
    y: initialConfig?.y ?? 50,
  })
  const [printScale, setPrintScale] = useState(initialConfig?.scale ?? 50)
  const [printFlipped, setPrintFlipped] = useState(initialConfig?.flipped ?? false)
  const [printAspect, setPrintAspect] = useState(1)
  const [isPrintSelected, setIsPrintSelected] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isPinching, setIsPinching] = useState(false)
  const [imageRect, setImageRect] = useState<{
    left: number; top: number; width: number; height: number
  } | null>(null)
  const [snappedAxis, setSnappedAxis] = useState<{ x: boolean; y: boolean }>({ x: false, y: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [productName, setProductName] = useState(initialProductName ?? "")
  const [productDescription, setProductDescription] = useState(initialProductDescription ?? "")

  // Placements cache: zoneId → placement. Ref-only to avoid re-render loops.
  const placementsRef = useRef<Record<string, PrintPlacement>>({})
  // Bumped whenever `placementsRef` changes in a way that should re-render the canvas
  // (e.g. after initial DB load resolves per-zone print URLs).
  const [placementsVersion, setPlacementsVersion] = useState(0)

  // Pointer + gesture tracking.
  const pointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())
  const gestureRef = useRef<Gesture | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingStateRef = useRef<{
    pos?: { x: number; y: number }
    scale?: number
    snap?: { x: boolean; y: boolean }
  }>({})

  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)

  const currentImage = visibleImages[imgIndex]
  const currentZone = currentImage?.zones.find((z) => z.id === selectedZoneId) ?? currentImage?.zones[0] ?? null

  // Resolve which print image to render for the current zone. Non-primary zones
  // can carry their own `print_id` in `product_print_placements`; fall back to
  // the product's primary print image. Depend on `placementsVersion` so the
  // canvas re-renders after the initial DB load populates per-zone URLs.
  void placementsVersion
  const activePrintUrl =
    (selectedZoneId && placementsRef.current[selectedZoneId]?.print_image_url) || print.image_url

  // Load placements from DB once (with each zone's assigned print).
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("product_print_placements")
        .select("zone_id, x, y, scale, is_mirrored, print_id, print_designs:print_id (image_url)")
        .eq("product_id", parseInt(productId))
      if (!mounted || !data) return
      const map: Record<string, PrintPlacement> = {}
      for (const p of data as unknown as Array<{
        zone_id: number
        x: number | string
        y: number | string
        scale: number | string
        is_mirrored: boolean | null
        print_id: number | null
        print_designs: { image_url: string | null } | { image_url: string | null }[] | null
      }>) {
        const pd = Array.isArray(p.print_designs) ? p.print_designs[0] : p.print_designs
        map[String(p.zone_id)] = {
          zone_id: p.zone_id,
          x: Number(p.x),
          y: Number(p.y),
          scale: Number(p.scale),
          is_mirrored: p.is_mirrored ?? false,
          print_id: p.print_id ?? null,
          print_image_url: pd?.image_url ?? null,
        }
      }
      placementsRef.current = map
      if (selectedZoneId && map[selectedZoneId]) {
        const p = map[selectedZoneId]
        setPrintPosition({ x: p.x, y: p.y })
        setPrintScale(p.scale)
        setPrintFlipped(p.is_mirrored)
        // Trigger a re-render so the right print image appears on the loaded zone.
        setPlacementsVersion((v) => v + 1)
      }
    })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Recompute displayed image bounds inside the canvas container.
  const updateImageRect = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return
    const img = imageRef.current
    const canvas = canvasRef.current
    const cr = canvas.getBoundingClientRect()
    if (!img.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight
    const cRatio = cr.width / cr.height
    let rw: number, rh: number
    if (ratio > cRatio) { rw = cr.width; rh = cr.width / ratio }
    else { rh = cr.height; rw = cr.height * ratio }
    setImageRect({ left: (cr.width - rw) / 2, top: (cr.height - rh) / 2, width: rw, height: rh })
  }, [])

  useEffect(() => {
    window.addEventListener("resize", updateImageRect)
    return () => window.removeEventListener("resize", updateImageRect)
  }, [updateImageRect])

  // Save the current draft for the zone we're leaving. Preserve the zone's
  // assigned print (print_id + image URL) so non-primary zones keep their
  // original print when we later reinsert all placements.
  const stashCurrentPlacement = useCallback((zoneId: string | null) => {
    if (!zoneId) return
    const prev = placementsRef.current[zoneId]
    placementsRef.current[zoneId] = {
      zone_id: parseInt(zoneId),
      x: printPosition.x,
      y: printPosition.y,
      scale: printScale,
      is_mirrored: printFlipped,
      print_id: prev?.print_id ?? null,
      print_image_url: prev?.print_image_url ?? null,
    }
  }, [printPosition.x, printPosition.y, printScale, printFlipped])

  // Apply a placement into local state (or defaults).
  const applyPlacement = useCallback((zoneId: string | null) => {
    if (!zoneId) return
    const p = placementsRef.current[zoneId]
    if (p) {
      setPrintPosition({ x: p.x, y: p.y })
      setPrintScale(p.scale)
      setPrintFlipped(p.is_mirrored)
    } else {
      setPrintPosition({ x: 50, y: 50 })
      setPrintScale(50)
      setPrintFlipped(false)
    }
  }, [])

  const handleImageChange = useCallback((newIndex: number) => {
    if (newIndex === imgIndex) return
    stashCurrentPlacement(selectedZoneId)
    setImgIndex(newIndex)
    const nextImg = visibleImages[newIndex]
    const nextZoneId = nextImg?.zones[0]?.id ?? null
    setSelectedZoneId(nextZoneId)
    applyPlacement(nextZoneId)
    setIsPrintSelected(false)
  }, [imgIndex, selectedZoneId, stashCurrentPlacement, visibleImages, applyPlacement])

  const handleZoneChange = useCallback((newZoneId: string) => {
    if (newZoneId === selectedZoneId) return
    stashCurrentPlacement(selectedZoneId)
    setSelectedZoneId(newZoneId)
    applyPlacement(newZoneId)
    setIsPrintSelected(false)
  }, [selectedZoneId, stashCurrentPlacement, applyPlacement])

  const handleReset = () => {
    setPrintPosition({ x: 50, y: 50 })
    setPrintScale(50)
    setPrintFlipped(false)
  }

  // ——— Geometry helpers ———
  const getZonePx = useCallback(() => {
    if (!imageRect || !currentZone) return null
    return {
      left: imageRect.left + (currentZone.x / 100) * imageRect.width,
      top: imageRect.top + (currentZone.y / 100) * imageRect.height,
      width: (currentZone.width / 100) * imageRect.width,
      height: (currentZone.height / 100) * imageRect.height,
    }
  }, [imageRect, currentZone])

  const clientToZonePct = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const zone = getZonePx()
    if (!canvas || !zone) return null
    const cr = canvas.getBoundingClientRect()
    const x = ((clientX - cr.left - zone.left) / zone.width) * 100
    const y = ((clientY - cr.top - zone.top) / zone.height) * 100
    return { x, y }
  }, [getZonePx])

  const halfSizePct = useCallback((scaleOverride?: number) => {
    const zone = getZonePx()
    if (!zone) return { halfX: 0, halfY: 0 }
    const scale = scaleOverride ?? printScale
    const halfX = scale / 2
    const halfY = (((scale / 100) * zone.width) / printAspect / zone.height) * 50
    return { halfX, halfY }
  }, [getZonePx, printScale, printAspect])

  const constrainPos = useCallback((x: number, y: number, halfX: number, halfY: number) => ({
    x: Math.max(halfX, Math.min(100 - halfX, x)),
    y: Math.max(halfY, Math.min(100 - halfY, y)),
  }), [])

  const scheduleCommit = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      const pending = pendingStateRef.current
      if (pending.pos) setPrintPosition(pending.pos)
      if (pending.scale != null) setPrintScale(pending.scale)
      if (pending.snap) setSnappedAxis(pending.snap)
      pendingStateRef.current = {}
      rafRef.current = null
    })
  }, [])

  // ——— Gesture starters ———
  const startDrag = useCallback((pointerId: number) => {
    gestureRef.current = { kind: "drag", pointerIds: [pointerId] }
    setIsDragging(true)
    setIsResizing(false)
    setIsPinching(false)
    setIsPrintSelected(true)
  }, [])

  const startPinch = useCallback((idA: number, idB: number) => {
    const a = pointersRef.current.get(idA)
    const b = pointersRef.current.get(idB)
    if (!a || !b) return
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const midPx = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }
    const midPct = clientToZonePct(midPx.clientX, midPx.clientY)
    if (!midPct) return
    gestureRef.current = {
      kind: "pinch",
      pointerIds: [idA, idB],
      startPinchDist: dist,
      startPinchScale: printScale,
      startPinchCenter: { x: printPosition.x, y: printPosition.y },
      startPinchMidpoint: midPct,
    }
    setIsDragging(false)
    setIsResizing(false)
    setIsPinching(true)
  }, [clientToZonePct, printScale, printPosition.x, printPosition.y])

  // ——— Print-element pointer handlers ———
  const onPrintPointerDown = (e: React.PointerEvent) => {
    if (!currentZone || !imageRect) return
    e.stopPropagation()
    try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (pointersRef.current.size === 1) {
      startDrag(e.pointerId)
    } else if (pointersRef.current.size === 2) {
      const ids = Array.from(pointersRef.current.keys())
      startPinch(ids[0], ids[1])
    }
  }

  const onResizePointerDown = (dir: "shrink" | "grow") => (e: React.PointerEvent) => {
    if (!currentZone) return
    e.stopPropagation()
    e.preventDefault()
    try { (e.target as Element).setPointerCapture(e.pointerId) } catch {}
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
    gestureRef.current = {
      kind: "resize",
      pointerIds: [e.pointerId],
      dir,
      startClient: { x: e.clientX, y: e.clientY },
      startScale: printScale,
    }
    setIsResizing(true)
    setIsDragging(false)
    setIsPinching(false)
    setIsPrintSelected(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current
    if (!g) return
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    if (g.kind === "drag" && g.pointerIds[0] === e.pointerId) {
      // /create-style: print center follows the cursor (no grab-offset).
      const pct = clientToZonePct(e.clientX, e.clientY)
      if (!pct) return
      const { halfX, halfY } = halfSizePct()
      const constrained = constrainPos(pct.x, pct.y, halfX, halfY)
      let { x: nx, y: ny } = constrained
      const snapX = Math.abs(nx - 50) < SNAP_THRESHOLD
      const snapY = Math.abs(ny - 50) < SNAP_THRESHOLD
      if (snapX) nx = 50
      if (snapY) ny = 50
      pendingStateRef.current.pos = { x: nx, y: ny }
      pendingStateRef.current.snap = { x: snapX, y: snapY }
      scheduleCommit()
    } else if (g.kind === "resize" && g.pointerIds[0] === e.pointerId) {
      // /create-style: delta = ±(dx + dy) / 3 depending on direction.
      if (!g.startClient || g.startScale == null || !g.dir) return
      const dx = e.clientX - g.startClient.x
      const dy = e.clientY - g.startClient.y
      const delta = g.dir === "shrink" ? -(dx + dy) / 3 : (dx + dy) / 3
      const newScale = Math.max(10, Math.min(100, g.startScale + delta))
      const { halfX, halfY } = halfSizePct(newScale)
      const pos = constrainPos(printPosition.x, printPosition.y, halfX, halfY)
      pendingStateRef.current.scale = newScale
      pendingStateRef.current.pos = pos
      scheduleCommit()
    } else if (g.kind === "pinch" && g.pointerIds.length === 2) {
      const [idA, idB] = g.pointerIds
      const a = pointersRef.current.get(idA)
      const b = pointersRef.current.get(idB)
      if (!a || !b || g.startPinchDist == null || g.startPinchScale == null || !g.startPinchCenter || !g.startPinchMidpoint) return
      const curDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const newScale = Math.max(10, Math.min(100, g.startPinchScale * (curDist / g.startPinchDist)))
      const midPct = clientToZonePct((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
      if (!midPct) return
      const nx = g.startPinchCenter.x + (midPct.x - g.startPinchMidpoint.x)
      const ny = g.startPinchCenter.y + (midPct.y - g.startPinchMidpoint.y)
      const { halfX, halfY } = halfSizePct(newScale)
      const pos = constrainPos(nx, ny, halfX, halfY)
      pendingStateRef.current.scale = newScale
      pendingStateRef.current.pos = pos
      scheduleCommit()
    }
  }

  const endPointer = useCallback((pointerId: number) => {
    pointersRef.current.delete(pointerId)
    const g = gestureRef.current
    if (!g) return
    if (!g.pointerIds.includes(pointerId)) return

    if (g.kind === "pinch") {
      const remaining = g.pointerIds.find((id) => id !== pointerId)
      if (remaining != null && pointersRef.current.has(remaining)) {
        // Transition back to single-finger drag seamlessly.
        setIsPinching(false)
        startDrag(remaining)
        return
      }
    }
    gestureRef.current = null
    setIsDragging(false)
    setIsResizing(false)
    setIsPinching(false)
    setSnappedAxis({ x: false, y: false })
    // Flush any pending state.
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const pending = pendingStateRef.current
    if (pending.pos) setPrintPosition(pending.pos)
    if (pending.scale != null) setPrintScale(pending.scale)
    pendingStateRef.current = {}
  }, [startDrag])

  const onPointerUp = (e: React.PointerEvent) => { endPointer(e.pointerId) }
  const onPointerCancel = (e: React.PointerEvent) => { endPointer(e.pointerId) }

  const handleSave = async () => {
    setSaving(true)
    if (selectedZoneId) {
      const prev = placementsRef.current[selectedZoneId]
      placementsRef.current[selectedZoneId] = {
        zone_id: parseInt(selectedZoneId),
        x: printPosition.x,
        y: printPosition.y,
        scale: printScale,
        is_mirrored: printFlipped,
        print_id: prev?.print_id ?? null,
        print_image_url: prev?.print_image_url ?? null,
      }
    }
    const primaryPrintId = print.id ? parseInt(print.id) : null
    const config: PrintConfig = {
      x: printPosition.x,
      y: printPosition.y,
      scale: printScale,
      flipped: printFlipped,
      zoneId: selectedZoneId,
      imageIndex: imgIndex,
    }
    try {
      const supabase = createClient()
      const placementsToSave = Object.values(placementsRef.current)
      if (placementsToSave.length > 0) {
        await supabase.from("product_print_placements").delete().eq("product_id", parseInt(productId))
        await supabase.from("product_print_placements").insert(
          placementsToSave.map((p) => ({
            product_id: parseInt(productId),
            zone_id: p.zone_id,
            x: p.x, y: p.y, scale: p.scale, is_mirrored: p.is_mirrored,
            // Keep the per-zone print assignment (falls back to the product's primary).
            print_id: p.print_id ?? primaryPrintId,
          }))
        )
      }
      // Persist the currently-edited (image, zone) as the primary so that the
      // product preview reflects whatever the admin last positioned.
      const productUpdate: Record<string, unknown> = {}
      if (productName.trim()) {
        productUpdate.name = productName.trim()
        productUpdate.description = productDescription.trim() || null
      }
      if (currentImage) productUpdate.base_image_id = parseInt(currentImage.id)
      if (selectedZoneId) productUpdate.zone_id = parseInt(selectedZoneId)
      if (Object.keys(productUpdate).length > 0) {
        await supabase.from("products").update(productUpdate).eq("id", parseInt(productId))
      }
      onSaved(productId, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("[v0] Save print config failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const showImagePicker = visibleImages.length > 1
  const showZonePicker = currentImage && currentImage.zones.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <div className="flex h-[100dvh] sm:h-[90vh] w-full sm:max-w-5xl flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <div className="min-w-0 flex-1 mr-2 sm:mr-4">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={`${base.name} + ${print.name}`}
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder={"\u041E\u043F\u0438\u0441 \u0442\u043E\u0432\u0430\u0440\u0443..."}
              rows={1}
              className="mt-1 w-full resize-none bg-transparent text-xs text-muted-foreground outline-none border-b border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">{base.name} + {print.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                saved ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90",
                saving && "opacity-60 cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E" : "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438"}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 gap-0">

          {/* Sidebar */}
          <div className="flex w-full sm:w-60 shrink-0 flex-row sm:flex-col border-b sm:border-b-0 sm:border-r border-border overflow-x-auto sm:overflow-x-visible max-h-[160px] sm:max-h-none">

            {showImagePicker && (
              <div className="border-b border-border p-3 shrink-0 sm:shrink">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {"\u0412\u0438\u0433\u043B\u044F\u0434"}
                </p>
                <div className="flex sm:flex-wrap gap-2">
                  {visibleImages.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => handleImageChange(idx)}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-muted/30 transition-all",
                        imgIndex === idx
                          ? "border-primary ring-2 ring-primary/30 scale-[1.03]"
                          : "border-border hover:border-primary/50"
                      )}
                      title={img.label}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showZonePicker && (
              <div className="flex-1 overflow-y-auto p-3 min-w-[180px]">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {"\u0417\u043E\u043D\u0438"}
                </p>
                <div className="flex sm:flex-col flex-row gap-1.5">
                  {currentImage?.zones.map((z) => {
                    const active = selectedZoneId === z.id
                    return (
                      <button
                        key={z.id}
                        onClick={() => handleZoneChange(z.id)}
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                          active
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-foreground hover:border-primary/40 hover:bg-muted/40"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            active ? "bg-primary" : "bg-muted-foreground/40"
                          )}
                        />
                        <span className="truncate">{z.name || `\u0417\u043E\u043D\u0430 ${z.id}`}</span>
                        {z.is_max && (
                          <span
                            className={cn(
                              "ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                              active
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                            title="\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430 \u0437\u043E\u043D\u0430"
                          >
                            MAX
                          </span>
                        )}
                        {!z.is_max && typeof z.price === "number" && z.price > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground">+{z.price}₴</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="border-t border-border p-3 shrink-0 sm:shrink">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {"\u0420\u043E\u0437\u043C\u0456\u0440"}
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">{Math.round(printScale)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintScale((s) => Math.max(10, s - 10))}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                  aria-label="zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={printScale}
                  onChange={(e) => setPrintScale(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <button
                  onClick={() => setPrintScale((s) => Math.min(100, s + 10))}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                  aria-label="zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setPrintFlipped((f) => !f)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-all",
                    printFlipped
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  {"\u0414\u0437\u0435\u0440\u043A\u0430\u043B\u043E"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {"\u0421\u043A\u0438\u043D\u0443\u0442\u0438"}
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-4 sm:p-6">
            {!hasImages ? (
              <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
                <p className="font-medium text-foreground">
                  {"\u041D\u0435\u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0445 \u0437\u043E\u043D"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {"\u041F\u0435\u0440\u0435\u0441\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u0442\u043E\u0432\u0430\u0440 \u0447\u0435\u0440\u0435\u0437 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440 \u0430\u0431\u043E \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u0437\u043E\u043D\u0438 \u0434\u043E \u043E\u0441\u043D\u043E\u0432\u0438."}
                </p>
              </div>
            ) : currentImage ? (
              <div
                ref={canvasRef}
                className="relative select-none"
                style={{ width: "100%", maxWidth: 520, aspectRatio: "1 / 1", touchAction: "none" }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onPointerLeave={() => { /* keep gesture until explicit up/cancel via capture */ }}
              >
                <img
                  ref={imageRef}
                  src={currentImage.url}
                  alt={currentImage.label}
                  className="pointer-events-none h-full w-full object-contain"
                  draggable={false}
                  onLoad={updateImageRect}
                />

                {currentZone && imageRect && (
                  <div
                    ref={zoneRef}
                    className="absolute rounded-sm border-2 border-dashed border-primary/60 bg-primary/5"
                    style={{
                      left: imageRect.left + (currentZone.x / 100) * imageRect.width,
                      top: imageRect.top + (currentZone.y / 100) * imageRect.height,
                      width: (currentZone.width / 100) * imageRect.width,
                      height: (currentZone.height / 100) * imageRect.height,
                      touchAction: "none",
                    }}
                    onClick={() => setIsPrintSelected(false)}
                  >
                    {/* Zone label chip (shown only when idle). */}
                    {!isDragging && !isResizing && !isPinching && currentZone.name && (
                      <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                        {currentZone.name}
                      </span>
                    )}

                    {/* Snap guides */}
                    {isDragging && (snappedAxis.x || snappedAxis.y) && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {snappedAxis.x && (
                          <div
                            className="absolute left-1/2 top-0 h-full -translate-x-1/2"
                            style={{ width: 0, borderLeft: "1px dashed #d946ef" }}
                          />
                        )}
                        {snappedAxis.y && (
                          <div
                            className="absolute left-0 top-1/2 w-full -translate-y-1/2"
                            style={{ height: 0, borderTop: "1px dashed #d946ef" }}
                          />
                        )}
                      </div>
                    )}

                    {activePrintUrl && (
                      <div
                        className={cn(
                          "absolute",
                          isPrintSelected ? "outline-1 outline-dashed outline-foreground/60" : "",
                          isDragging ? "cursor-grabbing" : "cursor-grab",
                        )}
                        style={{
                          left: `${printPosition.x}%`,
                          top: `${printPosition.y}%`,
                          width: `${printScale}%`,
                          aspectRatio: `${printAspect}`,
                          transform: "translate(-50%, -50%)",
                          touchAction: "none",
                          willChange: isDragging || isResizing || isPinching ? "left, top, width" : "auto",
                        }}
                        onPointerDown={onPrintPointerDown}
                        onClick={(e) => { e.stopPropagation(); setIsPrintSelected(true) }}
                      >
                        <img
                          src={activePrintUrl}
                          alt={print.name}
                          className="pointer-events-none h-full w-full object-contain drop-shadow-md"
                          style={printFlipped ? { transform: "scaleX(-1)" } : undefined}
                          draggable={false}
                          onLoad={(e) => {
                            const img = e.currentTarget
                            if (img.naturalWidth && img.naturalHeight) {
                              setPrintAspect(img.naturalWidth / img.naturalHeight)
                            }
                          }}
                        />

                        {isPrintSelected && (
                          <>
                            {/* Top-left: shrink */}
                            <div
                              onPointerDown={onResizePointerDown("shrink")}
                              className="absolute -left-4 -top-4 z-30 flex h-9 w-9 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md transition-transform hover:scale-110"
                              style={{ touchAction: "none" }}
                              aria-label="shrink"
                            >
                              <Minimize2 className="h-4 w-4 text-foreground" />
                            </div>
                            {/* Bottom-left: flip */}
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); setPrintFlipped((f) => !f) }}
                              className={cn(
                                "absolute -bottom-4 -left-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-card shadow-md transition-transform hover:scale-110",
                                printFlipped ? "border-primary text-primary" : "border-border text-foreground",
                              )}
                              aria-label="flip"
                            >
                              <FlipHorizontal2 className="h-4 w-4" />
                            </button>
                            {/* Bottom-right: grow */}
                            <div
                              onPointerDown={onResizePointerDown("grow")}
                              className="absolute -bottom-4 -right-4 z-30 flex h-9 w-9 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md transition-transform hover:scale-110"
                              style={{ touchAction: "none" }}
                              aria-label="resize"
                            >
                              <Maximize2 className="h-4 w-4 text-foreground" />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
