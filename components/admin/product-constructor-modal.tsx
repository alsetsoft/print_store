"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCcw, FlipHorizontal2,
  Maximize2, Minimize2, CheckSquare, Square, Loader2, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { CompositeBase, CompositePrint, Zone, BaseImage } from "@/components/admin/composite-card"

interface PrintPlacement {
  zone_id: number
  x: number
  y: number
  scale: number
  is_mirrored: boolean
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
  initialConfig?: PrintConfig | null
  onClose: () => void
  onSaved: (productId: string, config: PrintConfig) => void
}

export function ProductConstructorModal({ base, print, productId, initialConfig, onClose, onSaved }: ProductConstructorModalProps) {
  const images = base.images

  const [imgIndex, setImgIndex] = useState(initialConfig?.imageIndex ?? 0)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    initialConfig?.zoneId ?? images[0]?.zones[0]?.id ?? null
  )
  const [printPosition, setPrintPosition] = useState({ x: initialConfig?.x ?? 50, y: initialConfig?.y ?? 50 })
  const [printScale, setPrintScale] = useState(initialConfig?.scale ?? 50)
  const [printFlipped, setPrintFlipped] = useState(initialConfig?.flipped ?? false)
  const [isPrintSelected, setIsPrintSelected] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<"shrink" | "grow" | null>(null)
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [resizeStartScale, setResizeStartScale] = useState(50)
  const [imageRect, setImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Use ref for placements - NO useState to avoid re-render loops
  const placementsRef = useRef<Record<string, PrintPlacement>>({})
  const printStateRef = useRef({ x: printPosition.x, y: printPosition.y, scale: printScale, flipped: printFlipped })
  const selectedZoneIdRef = useRef<string | null>(selectedZoneId)

  // Keep refs in sync every render (no useEffect needed)
  printStateRef.current = { x: printPosition.x, y: printPosition.y, scale: printScale, flipped: printFlipped }
  selectedZoneIdRef.current = selectedZoneId

  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const rafRef = useRef<number | null>(null)
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null)

  const currentImage = images[imgIndex]
  const currentZone = currentImage?.zones.find((z) => z.id === selectedZoneId) ?? currentImage?.zones[0] ?? null

  // Load placements from database on mount — pure ref, no state
  useEffect(() => {
    let mounted = true
    async function loadPlacements() {
      const supabase = createClient()
      const { data } = await supabase
        .from("product_print_placements")
        .select("*")
        .eq("product_id", parseInt(productId))
      
      if (!mounted) return
      
      if (data && data.length > 0) {
        const placementsMap: Record<string, PrintPlacement> = {}
        data.forEach((p) => {
          placementsMap[String(p.zone_id)] = {
            zone_id: p.zone_id,
            x: Number(p.x),
            y: Number(p.y),
            scale: Number(p.scale),
            is_mirrored: p.is_mirrored ?? false,
          }
        })
        // Store in ref only — no state update, no re-render loop
        placementsRef.current = placementsMap
        
        // Apply current zone's placement
        const currentZoneId = selectedZoneIdRef.current
        if (currentZoneId && placementsMap[currentZoneId]) {
          const p = placementsMap[currentZoneId]
          setPrintPosition({ x: p.x, y: p.y })
          setPrintScale(p.scale)
          setPrintFlipped(p.is_mirrored)
        }
      }
    }
    loadPlacements()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // Handle image index change
  const handleImageChange = useCallback((newIndex: number) => {
    // Save current zone state to ref before switching
    if (selectedZoneIdRef.current) {
      const state = printStateRef.current
      placementsRef.current[selectedZoneIdRef.current] = {
        zone_id: parseInt(selectedZoneIdRef.current),
        x: state.x, y: state.y, scale: state.scale, is_mirrored: state.flipped,
      }
    }
    setImgIndex(newIndex)
    const newFirstZone = images[newIndex]?.zones[0]
    if (newFirstZone) {
      setSelectedZoneId(newFirstZone.id)
      const p = placementsRef.current[newFirstZone.id]
      if (p) { setPrintPosition({ x: p.x, y: p.y }); setPrintScale(p.scale); setPrintFlipped(p.is_mirrored) }
      else { setPrintPosition({ x: 50, y: 50 }); setPrintScale(50); setPrintFlipped(false) }
    }
  }, [images])

  // Handle zone selection change
  const handleZoneChange = useCallback((newZoneId: string) => {
    if (selectedZoneIdRef.current && selectedZoneIdRef.current !== newZoneId) {
      // Save current zone state to ref
      const state = printStateRef.current
      placementsRef.current[selectedZoneIdRef.current] = {
        zone_id: parseInt(selectedZoneIdRef.current),
        x: state.x, y: state.y, scale: state.scale, is_mirrored: state.flipped,
      }
    }
    setSelectedZoneId(newZoneId)
    const p = placementsRef.current[newZoneId]
    if (p) { setPrintPosition({ x: p.x, y: p.y }); setPrintScale(p.scale); setPrintFlipped(p.is_mirrored) }
    else { setPrintPosition({ x: 50, y: 50 }); setPrintScale(50); setPrintFlipped(false) }
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Global mouseup
  useEffect(() => {
    const up = () => { setIsDragging(false); setIsResizing(null) }
    window.addEventListener("mouseup", up)
    return () => window.removeEventListener("mouseup", up)
  }, [])

  const updateImageRect = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return
    const img = imageRef.current
    const canvas = canvasRef.current
    const cr = canvas.getBoundingClientRect()
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

  const constrainPos = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  }), [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing) {
      const dx = e.clientX - resizeStartPos.x
      const dy = e.clientY - resizeStartPos.y
      const delta = isResizing === "shrink" ? -(dx + dy) / 3 : (dx + dy) / 3
      setPrintScale((s) => Math.max(10, Math.min(100, resizeStartScale + delta)))
      return
    }
    if (!isDragging || !canvasRef.current || !currentZone || !imageRect) return
    const cr = canvasRef.current.getBoundingClientRect()
    const zl = imageRect.left + (currentZone.x / 100) * imageRect.width
    const zt = imageRect.top + (currentZone.y / 100) * imageRect.height
    const zw = (currentZone.width / 100) * imageRect.width
    const zh = (currentZone.height / 100) * imageRect.height
    const mx = e.clientX - cr.left - zl
    const my = e.clientY - cr.top - zt
    const newPos = constrainPos((mx / zw) * 100, (my / zh) * 100)
    pendingPosRef.current = newPos
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPosRef.current) setPrintPosition(pendingPosRef.current)
        rafRef.current = null
      })
    }
  }, [isDragging, isResizing, resizeStartPos, resizeStartScale, currentZone, imageRect, constrainPos])

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(null)
    if (pendingPosRef.current) { setPrintPosition(pendingPosRef.current); pendingPosRef.current = null }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  const handleReset = () => {
    setPrintPosition({ x: 50, y: 50 })
    setPrintScale(50)
    setPrintFlipped(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Save current zone to ref before building save payload
    if (selectedZoneId) {
      placementsRef.current[selectedZoneId] = {
        zone_id: parseInt(selectedZoneId),
        x: printPosition.x, y: printPosition.y,
        scale: printScale, is_mirrored: printFlipped,
      }
    }
    
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
            zone_id: p.zone_id, x: p.x, y: p.y, scale: p.scale, is_mirrored: p.is_mirrored,
          }))
        )
      }
      
      await supabase.from("products").update({ print_config: config }).eq("id", productId)
      onSaved(productId, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("[v0] Save print config failed:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-foreground">{base.name}</h2>
            <p className="text-sm text-muted-foreground">+ {print.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                saved
                  ? "bg-primary/10 text-primary"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                saving && "opacity-60 cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saved ? "Збережено" : "Зберегти"}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 gap-0">

          {/* Left panel: image switcher + zone picker */}
          <div className="flex w-60 shrink-0 flex-col border-r border-border">
            {/* Image tabs */}
            {images.length > 1 && (
              <div className="border-b border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Вигляд</p>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => handleImageChange(idx)}
                      className={cn(
                        "h-12 w-12 overflow-hidden rounded-lg border-2 transition-all",
                        imgIndex === idx ? "border-primary" : "border-border hover:border-primary/50"
                      )}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zone picker */}
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Зони</p>
              {currentImage?.zones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Зони не налаштовані для цього зображення</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {currentImage?.zones.map((z) => {
                    const active = (selectedZoneId ?? currentImage.zones[0]?.id) === z.id
                    return (
                      <button
                        key={z.id}
                        onClick={() => handleZoneChange(z.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:border-primary/40"
                        )}
                      >
                        {active
                          ? <CheckSquare className="h-4 w-4 shrink-0" />
                          : <Square className="h-4 w-4 shrink-0" />
                        }
                        {z.name || `Зона ${z.id}`}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="border-t border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Розмір принту</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintScale((s) => Math.max(10, s - 10))}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={printScale}
                    onChange={(e) => setPrintScale(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <button
                  onClick={() => setPrintScale((s) => Math.min(100, s + 10))}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setPrintFlipped((f) => !f)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-all",
                    printFlipped ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  Дзеркало
                </button>
                <button
                  onClick={handleReset}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Скинути
                </button>
              </div>
            </div>
          </div>

          {/* Main canvas */}
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/20 p-6">
            {currentImage ? (
              <div
                ref={canvasRef}
                className="relative select-none"
                style={{ width: "100%", maxWidth: 520, aspectRatio: "1 / 1" }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
                    className="absolute rounded-sm border-2 border-dashed border-primary/60 bg-primary/5"
                    style={{
                      left: imageRect.left + (currentZone.x / 100) * imageRect.width,
                      top: imageRect.top + (currentZone.y / 100) * imageRect.height,
                      width: (currentZone.width / 100) * imageRect.width,
                      height: (currentZone.height / 100) * imageRect.height,
                    }}
                    onClick={() => setIsPrintSelected(false)}
                  >
                    {print.image_url && (
                      <div
                        className={cn(
                          "absolute cursor-move",
                          isPrintSelected ? "outline outline-2 outline-dashed outline-foreground/60" : "",
                          isDragging ? "" : "transition-[left,top] duration-75"
                        )}
                        style={{
                          left: `${printPosition.x}%`,
                          top: `${printPosition.y}%`,
                          width: `${printScale}%`,
                          height: `${printScale}%`,
                          transform: `translate(-50%, -50%)${printFlipped ? " scaleX(-1)" : ""}`,
                          willChange: isDragging ? "left, top" : "auto",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsPrintSelected(true)
                          setIsDragging(true)
                        }}
                        onClick={(e) => { e.stopPropagation(); setIsPrintSelected(true) }}
                      >
                        <img
                          src={print.image_url}
                          alt={print.name}
                          className="pointer-events-none h-full w-full object-contain drop-shadow-md"
                          draggable={false}
                        />

                        {isPrintSelected && (
                          <>
                            {/* Top-left: shrink */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation(); e.preventDefault()
                                setIsResizing("shrink")
                                setResizeStartPos({ x: e.clientX, y: e.clientY })
                                setResizeStartScale(printScale)
                              }}
                              className="absolute -left-4 -top-4 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110"
                            >
                              <Minimize2 className="h-3.5 w-3.5 text-foreground" />
                            </div>
                            {/* Top-right: deselect */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsPrintSelected(false) }}
                              className="absolute -right-4 -top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110"
                            >
                              <X className="h-3.5 w-3.5 text-foreground" />
                            </button>
                            {/* Bottom-left: flip */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setPrintFlipped((f) => !f) }}
                              className="absolute -bottom-4 -left-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110"
                            >
                              <FlipHorizontal2 className="h-3.5 w-3.5 text-foreground" />
                            </button>
                            {/* Bottom-right: grow */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation(); e.preventDefault()
                                setIsResizing("grow")
                                setResizeStartPos({ x: e.clientX, y: e.clientY })
                                setResizeStartScale(printScale)
                              }}
                              className="absolute -bottom-4 -right-4 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110"
                            >
                              <Maximize2 className="h-3.5 w-3.5 text-foreground" />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentImage.zones.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                    <div className="rounded-xl border border-border bg-card p-5 text-center shadow-lg">
                      <p className="font-medium text-foreground">Зони не налаштовані</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Додайте зони до цієї основи у вкладці «Основи»
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Немає зображень</p>
            )}

            {/* Image nav arrows */}
            {images.length > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleImageChange(Math.max(0, imgIndex - 1))}
                  disabled={imgIndex === 0}
                  className="rounded-full border border-border bg-card p-2 shadow disabled:opacity-30 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  {currentImage?.label || `${imgIndex + 1} / ${images.length}`}
                </span>
                <button
                  onClick={() => handleImageChange(Math.min(images.length - 1, imgIndex + 1))}
                  disabled={imgIndex === images.length - 1}
                  className="rounded-full border border-border bg-card p-2 shadow disabled:opacity-30 hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
