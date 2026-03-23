"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Edit2, Check, MousePointer2 } from "lucide-react"

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pos = getRelativePosition(e)
    setIsDrawing(true)
    setStartPoint(pos)
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
    setSelectedZoneId(null)
  }, [getRelativePosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return
    const pos = getRelativePosition(e)
    
    const x = Math.min(startPoint.x, pos.x)
    const y = Math.min(startPoint.y, pos.y)
    const width = Math.abs(pos.x - startPoint.x)
    const height = Math.abs(pos.y - startPoint.y)

    setCurrentRect({ x, y, width, height })
  }, [isDrawing, startPoint, getRelativePosition])

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
    onZonesChange(zones.filter((z) => z.id !== zoneId))
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null)
    }
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

  const handleSaveAndClose = () => {
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
              <span>Клікніть та перетягніть для створення зони</span>
            </div>
            <div
              ref={canvasRef}
              className="relative cursor-crosshair overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30"
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
                  className="pointer-events-none h-full w-full object-contain"
                  draggable={false}
                />
              )}

              {/* Existing zones */}
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute border-2 transition-all ${
                    zone.is_max
                      ? selectedZoneId === zone.id
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20"
                      : selectedZoneId === zone.id
                      ? "border-primary bg-primary/20"
                      : "border-primary/60 bg-primary/10 hover:border-primary hover:bg-primary/20"
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onClick={(e) => handleZoneClick(e, zone.id)}
                >
                  <div className={`absolute -top-6 left-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
                    zone.is_max ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                  }`}>
                    {zone.name}{zone.is_max ? " (макс)" : ""}
                  </div>
                </div>
              ))}

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
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Зони ({zones.length})
              </h3>
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
                {zones.map((zone) => (
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
                          <span className={`h-3 w-3 rounded-sm ${zone.is_max ? "bg-amber-500" : "bg-primary"}`} />
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
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {Math.round(zone.width)}% x {Math.round(zone.height)}%
                      </p>
                      {/* is_max toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // If setting this zone as max, unset is_max on all other zones
                          const newZones = zones.map((z) =>
                            z.id === zone.id
                              ? { ...z, is_max: true }
                              : { ...z, is_max: false }
                          )
                          onZonesChange(newZones)
                        }}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          zone.is_max
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                        }`}
                      >
                        {zone.is_max ? "Головна" : "Зробити головною"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
  )
}
