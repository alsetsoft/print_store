"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Edit2, Check, MousePointer2, Star } from "lucide-react"

// Color palette for zones
const ZONE_COLORS = [
  { border: "#22c55e", bg: "rgba(34, 197, 94, 0.2)", label: "#22c55e" },   // green
  { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.2)", label: "#3b82f6" },  // blue
  { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)", label: "#f59e0b" },  // amber
  { border: "#ef4444", bg: "rgba(239, 68, 68, 0.2)", label: "#ef4444" },   // red
  { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.2)", label: "#8b5cf6" },  // violet
  { border: "#ec4899", bg: "rgba(236, 72, 153, 0.2)", label: "#ec4899" },  // pink
  { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.2)", label: "#14b8a6" },  // teal
  { border: "#f97316", bg: "rgba(249, 115, 22, 0.2)", label: "#f97316" },  // orange
]

const getZoneColor = (index: number) => ZONE_COLORS[index % ZONE_COLORS.length]

export interface Zone {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  is_max?: boolean
  price?: number
}

interface ZoneEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  zones: Zone[]
  onZonesChange: (zones: Zone[]) => void
}

export function ZoneEditorModal({
  open,
  onOpenChange,
  imageUrl,
  zones,
  onZonesChange,
}: ZoneEditorModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const maxWidth = 600
        const maxHeight = 500
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        setImageSize({ width, height })
      }
      img.src = imageUrl
    }
  }, [open, imageUrl])

  const getRelativePosition = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  // Get the max zone for constraining new zones
  const maxZone = zones.find((z) => z.is_max)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pos = getRelativePosition(e)

    // If we have a max zone, don't allow starting outside of it
    if (maxZone) {
      const isInsideMaxZone = 
        pos.x >= maxZone.x && 
        pos.x <= maxZone.x + maxZone.width &&
        pos.y >= maxZone.y && 
        pos.y <= maxZone.y + maxZone.height
      
      if (!isInsideMaxZone) {
        // Click outside max zone - just deselect
        setSelectedZoneId(null)
        return
      }
    }

    setIsDrawing(true)
    setStartPoint(pos)
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
    setSelectedZoneId(null)
  }, [getRelativePosition, maxZone])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return
    const pos = getRelativePosition(e)
    
    let x = Math.min(startPoint.x, pos.x)
    let y = Math.min(startPoint.y, pos.y)
    let width = Math.abs(pos.x - startPoint.x)
    let height = Math.abs(pos.y - startPoint.y)

    // If we already have a max zone, constrain new zones to be inside it
    if (maxZone) {
      // Clamp coordinates to max zone bounds
      const maxRight = maxZone.x + maxZone.width
      const maxBottom = maxZone.y + maxZone.height

      // Constrain start point
      x = Math.max(maxZone.x, Math.min(x, maxRight))
      y = Math.max(maxZone.y, Math.min(y, maxBottom))

      // Constrain end point
      const endX = Math.max(maxZone.x, Math.min(x + width, maxRight))
      const endY = Math.max(maxZone.y, Math.min(y + height, maxBottom))

      width = endX - x
      height = endY - y
    }

    setCurrentRect({ x, y, width, height })
  }, [isDrawing, startPoint, getRelativePosition, maxZone])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false)
      return
    }

    if (currentRect.width > 2 && currentRect.height > 2) {
      // First zone is automatically the max zone
      const isFirstZone = zones.length === 0
      const newZone: Zone = {
        id: crypto.randomUUID(),
        name: `Zone ${zones.length + 1}`,
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
        is_max: isFirstZone,
        price: 0,
      }
      onZonesChange([...zones, newZone])
      setSelectedZoneId(newZone.id)
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentRect(null)
  }, [isDrawing, currentRect, zones, onZonesChange])

  const handleZoneClick = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    setSelectedZoneId(zoneId)
  }

  const handleDeleteZone = (zoneId: string) => {
    const updatedZones = zones.filter((z) => z.id !== zoneId)
    // If we deleted the max zone and there are still zones, make the first one max
    const deletedZone = zones.find((z) => z.id === zoneId)
    if (deletedZone?.is_max && updatedZones.length > 0) {
      updatedZones[0].is_max = true
    }
    onZonesChange(updatedZones)
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null)
    }
  }

  const handleSetMaxZone = (zoneId: string) => {
    onZonesChange(
      zones.map((z) => ({
        ...z,
        is_max: z.id === zoneId,
      }))
    )
  }

  const handleEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id)
    setEditingName(zone.name)
  }

  const handleSaveZoneName = () => {
    if (editingZoneId && editingName.trim()) {
      onZonesChange(
        zones.map((z) =>
          z.id === editingZoneId ? { ...z, name: editingName.trim() } : z
        )
      )
    }
    setEditingZoneId(null)
    setEditingName("")
  }

  const hasMaxZone = zones.some((z) => z.is_max)
  
  const handleSaveAndClose = () => {
    // Ensure at least one zone is marked as max before closing
    if (zones.length > 0 && !hasMaxZone) {
      // Auto-select first zone as max
      onZonesChange(
        zones.map((z, i) => ({
          ...z,
          is_max: i === 0,
        }))
      )
    }
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[60] flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Визначити зони для принтів
            </h2>
            <p className="text-sm text-muted-foreground">
              Намалюйте прямокутні зони на зображенні, де можна розміщувати принти
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 gap-4 overflow-hidden p-6">
          {/* Image Canvas */}
          <div className="flex flex-1 flex-col">
  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
  <MousePointer2 className="h-4 w-4" />
  <span>
    {maxZone 
      ? "Нові зони можна створювати тільки всередині макс зони"
      : "Клікніть та перетягніть для створення макс зони"
    }
  </span>
  </div>
            <div
              ref={canvasRef}
              className="relative cursor-crosshair select-none overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30"
              style={{
                width: imageSize.width || 600,
                height: imageSize.height || 400,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Base"
                  className="pointer-events-none h-full w-full select-none object-contain"
                  draggable={false}
                />
              )}

              {/* Existing zones */}
              {zones.map((zone, index) => {
                const color = getZoneColor(index)
                return (
                  <div
                    key={zone.id}
                    className={`absolute cursor-pointer select-none border-2 transition-all ${
                      selectedZoneId === zone.id ? "ring-2 ring-white ring-offset-1" : ""
                    }`}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.width}%`,
                      height: `${zone.height}%`,
                      borderColor: color.border,
                      backgroundColor: color.bg,
                    }}
                    onClick={(e) => handleZoneClick(e, zone.id)}
                  >
                    <div 
                      className="absolute -top-6 left-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: color.label }}
                    >
                      {zone.name}
                    </div>
                  </div>
                )
              })}

              {/* Current drawing rect */}
              {currentRect && currentRect.width > 0 && currentRect.height > 0 && (
                <div
                  className="absolute border-2 border-dashed border-primary bg-primary/20"
                  style={{
                    left: `${currentRect.x}%`,
                    top: `${currentRect.y}%`,
                    width: `${currentRect.width}%`,
                    height: `${currentRect.height}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Zones List */}
          <div className="w-64 flex-shrink-0">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-foreground">
                Зони ({zones.length})
              </h3>
              {zones.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>Оберіть максимальну зону</span>
                  <span className="text-destructive">*</span>
                </p>
              )}
            </div>

            {zones.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                <Plus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Намалюйте зону на зображенні
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {zones.map((zone, index) => {
                  const color = getZoneColor(index)
                  return (
                    <div
                      key={zone.id}
                      className={`rounded-lg border p-3 transition-all ${
                        selectedZoneId === zone.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedZoneId(zone.id)}
                    >
                      {editingZoneId === zone.id ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 flex-shrink-0 rounded"
                            style={{ backgroundColor: color.border }}
                          />
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveZoneName()
                              if (e.key === "Escape") {
                                setEditingZoneId(null)
                                setEditingName("")
                              }
                            }}
                          />
                          <button
                            onClick={handleSaveZoneName}
                            className="rounded p-1 text-primary hover:bg-primary/10"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSetMaxZone(zone.id)
                              }}
                              title={zone.is_max ? "Максимальна зона" : "Клікніть щоб зробити максимальною"}
                              className={`rounded-md p-1 transition-all ${
                                zone.is_max 
                                  ? "bg-amber-100 text-amber-500" 
                                  : "border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-400"
                              }`}
                            >
                              <Star className={`h-4 w-4 ${zone.is_max ? "fill-amber-500" : ""}`} />
                            </button>
                            <div
                              className="h-4 w-4 flex-shrink-0 rounded"
                              style={{ backgroundColor: color.border }}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {zone.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditZone(zone)
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteZone(zone.id)
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {Math.round(zone.width)}% x {Math.round(zone.height)}%
                        </p>
                        {zone.is_max && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Макс
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{"\u0426\u0456\u043d\u0430:"}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={zone.price ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            onZonesChange(
                              zones.map((z) =>
                                z.id === zone.id ? { ...z, price: val } : z
                              )
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-20 rounded border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
                        />
                        <span className="text-[10px] text-muted-foreground">{"\u0433\u0440\u043d"}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {zones.length > 0 && !hasMaxZone && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600">
              <Star className="h-4 w-4" />
              Оберіть максимальну зону для принта
            </p>
          )}
          {(zones.length === 0 || hasMaxZone) && <div />}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Скасувати
            </button>
            <button
              onClick={handleSaveAndClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Зберегти зони
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
