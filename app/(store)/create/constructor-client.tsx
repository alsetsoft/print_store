"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  ImagePlus, Type, QrCode, Paintbrush, Sparkles,
  ZoomIn, ZoomOut, FlipHorizontal2, Trash2,
  Maximize2, Minimize2, X,
  Upload, AlignLeft, AlignCenter, AlignRight,
  RotateCcw, Layers, ArrowLeft, Search, Repeat, ShoppingCart, Check, ChevronDown, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZoneData {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  is_max: boolean
  price: number | null
}

interface ImageData {
  id: string
  url: string
  label: string
  sort_order: number
  color_id: string | null
  zones: ZoneData[]
}

interface ColorData {
  id: string
  name: string
  hex: string
}

interface PrintData {
  id: string
  name: string
  image_url: string | null
  category_id: number | null
  subcategory_id: number | null
}

interface PrintCategoryData {
  id: number
  name: string
}

interface PrintSubcategoryData {
  id: number
  name: string
  print_category_id: number
}

interface BaseData {
  id: string
  name: string
  price: string | number | null
}

export type ElementType = "image" | "print" | "text" | "qr" | "ai"

export interface CanvasElement {
  id: string
  type: ElementType
  zoneId: string
  position: { x: number; y: number }
  scale: number
  flipped: boolean
  imageUrl?: string
  text?: string
  textColor?: string
  fontFamily?: string
  textAlign?: "left" | "center" | "right"
}

interface SizeData {
  id: string
  name: string
  sort_order: number
  price: number | null
}

interface ConstructorClientProps {
  base: BaseData
  images: ImageData[]
  colors: ColorData[]
  sizes: SizeData[]
  prints: PrintData[]
  printCategories: PrintCategoryData[]
  printSubcategories: PrintSubcategoryData[]
}

// Add to cart imports
import { useCart } from "@/lib/cart-context"
import { useRouter, useSearchParams } from "next/navigation"
import { generateDalleImage } from "./actions"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { type: ElementType; icon: typeof ImagePlus; label: string }[] = [
  { type: "image", icon: ImagePlus, label: "\u041c\u0430\u043b\u044e\u043d\u043e\u043a" },
  { type: "print", icon: Paintbrush, label: "\u041f\u0440\u0438\u043d\u0442\u0438" },
  { type: "text", icon: Type, label: "\u0422\u0435\u043a\u0441\u0442" },
  { type: "qr", icon: QrCode, label: "QR-\u043a\u043e\u0434" },
  { type: "ai", icon: Sparkles, label: "AI" },
]

const FONTS = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Mono" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier" },
]

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#F44336", "#9E9E9E",
  "#80CBC4", "#03A9F4", "#9C27B0", "#FFC107",
  "#E91E8C", "#FF5722", "#4CAF50", "#1B5E20",
  "#795548", "#FFEB3B", "#0D47A1", "#3F51B5",
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConstructorClient({ base: initialBase, images: initialImages, colors: initialColors, prints, printCategories, printSubcategories, sizes: initialSizes }: ConstructorClientProps) {
  // Dynamic base state (changes when user picks a new base)
  const [currentBase, setCurrentBase] = useState(initialBase)
  const [allImages, setAllImages] = useState(initialImages)
  const [currentColors, setCurrentColors] = useState(initialColors)
  const [currentSizes, setCurrentSizes] = useState(initialSizes)
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(initialSizes[0]?.id ?? null)
  const [basePickerOpen, setBasePickerOpen] = useState(false)
  const { addItem, updateItem } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()
  const printParamRef = useRef(false)

  // Edit mode — restore state from localStorage
  const [editCartItemId, setEditCartItemId] = useState<string | null>(null)
  const [editCartItemType, setEditCartItemType] = useState<"custom" | null>(null)
  const editRestoredRef = useRef(false)

  // Color filter — defaults to first color that has images, or null (show all)
  const [selectedColorId, setSelectedColorId] = useState<string | null>(() => {
    const firstColorWithImages = initialColors.find((c) =>
      initialImages.some((img) => img.color_id === c.id)
    )
    return firstColorWithImages?.id ?? null
  })

  // Filtered images by selected color
  const currentImages = selectedColorId
    ? allImages.filter((img) => img.color_id === selectedColorId)
    : allImages

  // Image / view state
  const [imgIndex, setImgIndex] = useState(0)
  const safeImgIndex = imgIndex >= currentImages.length ? 0 : imgIndex
  const currentImage = currentImages[safeImgIndex]

  // Zone state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    currentImage?.zones[0]?.id ?? null
  )
  const currentZone = currentImage?.zones.find((z) => z.id === selectedZoneId)
    ?? currentImage?.zones[0] ?? null

  // Elements on canvas
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const selectedElementIdRef = useRef<string | null>(null)
  selectedElementIdRef.current = selectedElementId
  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null

  // Active tab
  const [activeTab, setActiveTab] = useState<ElementType>("image")

  // Mobile
  const isMobile = useIsMobile()
  const [viewsOpen, setViewsOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [zonesDrawerOpen, setZonesDrawerOpen] = useState(false)
  const [addElementDrawerOpen, setAddElementDrawerOpen] = useState(false)

  // Canvas measurement
  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageRect, setImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<"shrink" | "grow" | null>(null)
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [resizeStartScale, setResizeStartScale] = useState(50)
  const rafRef = useRef<number | null>(null)
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null)
  const [snappedAxis, setSnappedAxis] = useState<{ x: boolean; y: boolean }>({ x: false, y: false })

  // Right panel form state
  const [textInput, setTextInput] = useState("")
  const [textColor, setTextColor] = useState("#000000")
  const [textFont, setTextFont] = useState("sans-serif")
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center")
  const [qrInput, setQrInput] = useState("")
  const [fonts, setFonts] = useState(FONTS)

  // -------------------------------------------------------------------------
  // Restore edit state from localStorage
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (editRestoredRef.current) return
    try {
      const raw = localStorage.getItem("printmarket_edit_item")
      if (!raw) return
      localStorage.removeItem("printmarket_edit_item")
      editRestoredRef.current = true

      const cartItem = JSON.parse(raw)
      if (!cartItem.constructorState) return

      const cs = cartItem.constructorState
      setEditCartItemId(cartItem.id)
      setEditCartItemType(cartItem.type)

      // Restore base if different
      if (cs.baseId !== String(initialBase.id)) {
        handleBaseChange(Number(cs.baseId)).then(() => {
          // State is set inside handleBaseChange; restore elements after
          setSelectedColorId(cs.colorId)
          setSelectedSizeId(cs.sizeId)
          setImgIndex(cs.imgIndex ?? 0)
          setElements(cs.elements as CanvasElement[])
        })
      } else {
        if (cs.colorId) setSelectedColorId(cs.colorId)
        if (cs.sizeId) setSelectedSizeId(cs.sizeId)
        if (cs.imgIndex != null) setImgIndex(cs.imgIndex)
        setElements(cs.elements as CanvasElement[])
      }
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Auto-add print from URL param (?printId=X)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (printParamRef.current) return
    if (editRestoredRef.current) return
    if (!selectedZoneId) return
    const printId = searchParams.get("printId")
    if (!printId) return
    printParamRef.current = true

    const supabase = createClient()
    supabase
      .from("print_designs")
      .select("id, name, image_url")
      .eq("id", parseInt(printId))
      .single()
      .then(({ data }) => {
        if (data?.image_url) {
          addElement({ type: "print", imageUrl: data.image_url })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId])

  // -------------------------------------------------------------------------
  // Measure image position within canvas
  // -------------------------------------------------------------------------

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
    // Handle cached images where onLoad may have already fired
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      updateImageRect()
    }
    return () => window.removeEventListener("resize", updateImageRect)
  }, [updateImageRect, safeImgIndex])

  // Global mouseup
  useEffect(() => {
    const up = () => {
      setIsDragging(false)
      setIsResizing(null)
      setSnappedAxis({ x: false, y: false })
      const pos = pendingPosRef.current
      const elId = selectedElementIdRef.current
      if (pos && elId) {
        pendingPosRef.current = null
        setElements((prev) =>
          prev.map((el) =>
            el.id === elId ? { ...el, position: pos } : el
          )
        )
      }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Image change / zone change
  // -------------------------------------------------------------------------

  const handleImageChange = useCallback((newIndex: number) => {
    setImgIndex(newIndex)
    const newFirstZone = currentImages[newIndex]?.zones[0]
    if (newFirstZone) setSelectedZoneId(newFirstZone.id)
    setSelectedElementId(null)
  }, [currentImages])

  // -------------------------------------------------------------------------
  // Base change handler
  // -------------------------------------------------------------------------

  const handleBaseChange = useCallback(async (baseId: number) => {
    const supabase = createClient()

    const { data: baseRow } = await supabase
      .from("bases")
      .select("id, name, price, image_url")
      .eq("id", baseId)
      .single()

    if (!baseRow) return

    const [imagesRes, colorsRes, sizesRes] = await Promise.all([
      supabase
        .from("base_images")
        .select("id, base_id, url, sort_order, color_id")
        .eq("base_id", baseRow.id)
        .order("sort_order"),
      supabase
        .from("base_colors")
        .select("id, color_id, colors:color_id(id, name, hex_code)")
        .eq("base_id", baseRow.id),
      supabase
        .from("base_sizes")
        .select("size_id, price, sizes:size_id(id, name, sort_order)")
        .eq("base_id", baseRow.id),
    ])

    const rawImgs = (imagesRes.data ?? []) as Array<{
      id: number; base_id: number; url: string; sort_order: number; color_id: number | null
    }>

    const imgIds = rawImgs.map((img) => img.id)
    const zonesRes = imgIds.length > 0
      ? await supabase
          .from("image_zones")
          .select("id, base_image_id, name, x, y, width, height, is_max, price")
          .in("base_image_id", imgIds)
      : { data: [] }

    const allZones = (zonesRes.data ?? []) as Array<{
      id: number; base_image_id: number; name: string
      x: number; y: number; width: number; height: number; is_max: boolean; price: number | null
    }>

    const zonesByImg = new Map<number, typeof allZones>()
    for (const z of allZones) {
      const arr = zonesByImg.get(z.base_image_id) ?? []
      arr.push(z)
      zonesByImg.set(z.base_image_id, arr)
    }

    const decodeLabel = (raw: string) => {
      const idx = raw.indexOf("__lbl__")
      if (idx === -1) return { url: raw, label: "" }
      return { url: raw.substring(0, idx), label: raw.substring(idx + 7) }
    }

    const newImages: ImageData[] = rawImgs.map((img) => {
      const decoded = decodeLabel(img.url)
      const zones = (zonesByImg.get(img.id) ?? []).map((z) => ({
        id: String(z.id),
        name: z.name,
        x: Number(z.x),
        y: Number(z.y),
        width: Number(z.width),
        height: Number(z.height),
        is_max: z.is_max,
        price: z.price != null ? Number(z.price) : null,
      }))
      return {
        id: String(img.id),
        url: decoded.url,
        label: decoded.label,
        sort_order: img.sort_order,
        color_id: img.color_id ? String(img.color_id) : null,
        zones,
      }
    })

    const newColors: ColorData[] = ((colorsRes.data ?? []) as unknown as Array<{
      id: number; color_id: number
      colors: { id: number; name: string; hex_code: string } | null
    }>)
      .filter((bc) => bc.colors)
      .map((bc) => ({
        id: String(bc.colors!.id),
        name: bc.colors!.name,
        hex: bc.colors!.hex_code,
      }))

    const newSizes: SizeData[] = ((sizesRes.data ?? []) as unknown as Array<{
      size_id: number; price: number | null
      sizes: { id: number; name: string; sort_order: number | null } | null
    }>)
      .filter((bs) => bs.sizes)
      .map((bs) => ({
        id: String(bs.sizes!.id),
        name: bs.sizes!.name,
        sort_order: bs.sizes!.sort_order ?? 0,
        price: bs.price,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)

    setCurrentBase({
      id: String(baseRow.id),
      name: baseRow.name,
      price: baseRow.price,
    })
    setAllImages(newImages)
    setCurrentColors(newColors)
    setCurrentSizes(newSizes)
    setSelectedSizeId(newSizes[0]?.id ?? null)
    // Default to the first color that has images
    const firstColor = newColors.find((c) =>
      newImages.some((img) => img.color_id === c.id)
    )
    setSelectedColorId(firstColor?.id ?? null)
    const filteredByColor = firstColor
      ? newImages.filter((img) => img.color_id === firstColor.id)
      : newImages
    setImgIndex(0)
    setSelectedZoneId(filteredByColor[0]?.zones[0]?.id ?? null)
    setElements([])
    setSelectedElementId(null)
    setBasePickerOpen(false)
  }, [])

  // -------------------------------------------------------------------------
  // Constrain position within 0-100
  // -------------------------------------------------------------------------

  const SNAP_THRESHOLD = 3 // % distance to snap to center

  const constrainPos = useCallback((x: number, y: number, halfX: number, halfY: number) => ({
    x: Math.max(halfX, Math.min(100 - halfX, x)),
    y: Math.max(halfY, Math.min(100 - halfY, y)),
  }), [])

  // -------------------------------------------------------------------------
  // Drag & resize handlers
  // -------------------------------------------------------------------------

  // Keep a ref to elements so drag handlers can read current state without stale closures
  const aspectMapRef = useRef<Record<string, number>>({})
  const elementsRef = useRef(elements)
  elementsRef.current = elements

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const elId = selectedElementIdRef.current
    if (!elId) return

    if (isResizing) {
      const dx = e.clientX - resizeStartPos.x
      const dy = e.clientY - resizeStartPos.y
      const delta = isResizing === "shrink" ? -(dx + dy) / 3 : (dx + dy) / 3
      const newScale = Math.max(10, Math.min(100, resizeStartScale + delta))
      const el = elementsRef.current.find((el) => el.id === elId)
      const zone = el ? currentImage?.zones.find((z) => z.id === el.zoneId) : null
      if (zone && imageRect) {
        const zw = (zone.width / 100) * imageRect.width
        const zh = (zone.height / 100) * imageRect.height
        const aspect = aspectMapRef.current[elId] ?? 1
        const halfX = newScale / 2
        const halfY = (newScale / 100 * zw / aspect) / zh * 50
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== elId) return el
            const pos = constrainPos(el.position.x, el.position.y, halfX, halfY)
            return { ...el, scale: newScale, position: pos }
          })
        )
      } else {
        setElements((prev) =>
          prev.map((el) => el.id === elId ? { ...el, scale: newScale } : el)
        )
      }
      return
    }

    if (!isDragging || !canvasRef.current || !imageRect) return

    const currentEl = elementsRef.current.find((el) => el.id === elId)
    if (!currentEl) return
    const zone = currentImage?.zones.find((z) => z.id === currentEl.zoneId)
    if (!zone) return

    const cr = canvasRef.current.getBoundingClientRect()
    const zl = imageRect.left + (zone.x / 100) * imageRect.width
    const zt = imageRect.top + (zone.y / 100) * imageRect.height
    const zw = (zone.width / 100) * imageRect.width
    const zh = (zone.height / 100) * imageRect.height
    const mx = e.clientX - cr.left - zl
    const my = e.clientY - cr.top - zt
    const aspect = aspectMapRef.current[elId] ?? 1
    const halfX = currentEl.scale / 2
    const halfY = (currentEl.scale / 100 * zw / aspect) / zh * 50
    const newPos = constrainPos((mx / zw) * 100, (my / zh) * 100, halfX, halfY)
    const snapX = Math.abs(newPos.x - 50) < SNAP_THRESHOLD
    const snapY = Math.abs(newPos.y - 50) < SNAP_THRESHOLD
    if (snapX) newPos.x = 50
    if (snapY) newPos.y = 50
    setSnappedAxis({ x: snapX, y: snapY })
    pendingPosRef.current = newPos
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        const pos = pendingPosRef.current
        const id = selectedElementIdRef.current
        if (pos && id) {
          setElements((prev) =>
            prev.map((el) =>
              el.id === id ? { ...el, position: pos } : el
            )
          )
        }
        rafRef.current = null
      })
    }
  }, [isDragging, isResizing, resizeStartPos, resizeStartScale, currentImage, imageRect, constrainPos])

  const handlePointerUp = () => {
    setIsDragging(false)
    setIsResizing(null)
    setSnappedAxis({ x: false, y: false })
    const pos = pendingPosRef.current
    const elId = selectedElementIdRef.current
    if (pos && elId) {
      pendingPosRef.current = null
      setElements((prev) =>
        prev.map((el) =>
          el.id === elId ? { ...el, position: pos } : el
        )
      )
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  // -------------------------------------------------------------------------
  // Add elements
  // -------------------------------------------------------------------------

  const addElement = useCallback((partial: Omit<CanvasElement, "id" | "zoneId" | "position" | "scale" | "flipped">) => {
    if (!selectedZoneId) return
    const newEl: CanvasElement = {
      id: uid(),
      zoneId: selectedZoneId,
      position: { x: 50, y: 50 },
      scale: 50,
      flipped: false,
      ...partial,
    }
    setElements((prev) => [...prev, newEl])
    setSelectedElementId(newEl.id)
  }, [selectedZoneId])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      addElement({ type: "image", imageUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [addElement])

  const handleAddPrint = useCallback((p: PrintData) => {
    if (!p.image_url) return
    addElement({ type: "print", imageUrl: p.image_url })
  }, [addElement])

  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return
    addElement({
      type: "text",
      text: textInput.trim(),
      textColor,
      fontFamily: textFont,
      textAlign,
    })
    setTextInput("")
  }, [textInput, textColor, textFont, textAlign, addElement])

  const handleFontUpload = useCallback((file: File) => {
    const name = file.name.replace(/\.(ttf|woff2?|otf)$/i, "")
    const fontFamily = `custom-${name}`
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const fontFace = new FontFace(fontFamily, reader.result as ArrayBuffer)
        await fontFace.load()
        document.fonts.add(fontFace)
        setFonts((prev) => {
          if (prev.some((f) => f.value === fontFamily)) return prev
          return [...prev, { value: fontFamily, label: name }]
        })
        setTextFont(fontFamily)
      } catch (err) {
        console.error("Failed to load font:", err)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleAddQr = useCallback(async () => {
    if (!qrInput.trim()) return
    try {
      const dataUrl = await QRCode.toDataURL(qrInput.trim(), {
        width: 256,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
      addElement({ type: "qr", imageUrl: dataUrl, text: qrInput.trim() })
      setQrInput("")
    } catch (err) {
      console.error("QR generation failed:", err)
    }
  }, [qrInput, addElement])

  const handleAddAiImage = useCallback((imageUrl: string) => {
    addElement({ type: "image", imageUrl })
  }, [addElement])

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id))
    if (selectedElementId === id) setSelectedElementId(null)
  }, [selectedElementId])

  const toggleFlip = useCallback((id: string) => {
    setElements((prev) =>
      prev.map((el) => el.id === id ? { ...el, flipped: !el.flipped } : el)
    )
  }, [])

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const handleAddToCart = async () => {
    // Generate preview — fetch images as blobs to avoid CORS taint
    let previewDataUrl: string | null = null
    if (imageRef.current && imageRect) {
      try {
        const S = 400
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = S
        tempCanvas.height = S
        const tempCtx = tempCanvas.getContext("2d")
        if (tempCtx) {
          const loadImage = (url: string): Promise<HTMLImageElement> =>
            fetch(url)
              .then((r) => r.blob())
              .then((blob) => {
                const objUrl = URL.createObjectURL(blob)
                return new Promise<HTMLImageElement>((resolve, reject) => {
                  const img = new Image()
                  img.onload = () => { URL.revokeObjectURL(objUrl); resolve(img) }
                  img.onerror = () => { URL.revokeObjectURL(objUrl); reject() }
                  img.src = objUrl
                })
              })

          const baseImg = await loadImage(imageRef.current.src)
          const ratio = baseImg.naturalWidth / baseImg.naturalHeight
          let rw: number, rh: number
          if (ratio > 1) { rw = S; rh = S / ratio }
          else { rh = S; rw = S * ratio }
          const ox = (S - rw) / 2
          const oy = (S - rh) / 2
          tempCtx.drawImage(baseImg, ox, oy, rw, rh)

          for (const el of elements) {
            const zone = allImages.flatMap((i) => i.zones).find((z) => z.id === el.zoneId)
            if (!zone) continue

            const zx = ox + (zone.x / 100) * rw
            const zy = oy + (zone.y / 100) * rh
            const zw = (zone.width / 100) * rw
            const zh = (zone.height / 100) * rh

            if ((el.type === "image" || el.type === "print" || el.type === "qr") && el.imageUrl) {
              try {
                const elImg = await loadImage(el.imageUrl)
                const elRatio = elImg.naturalWidth / elImg.naturalHeight
                const pw = (el.scale / 100) * zw
                const ph = pw / elRatio
                const cx = zx + (el.position.x / 100) * zw
                const cy = zy + (el.position.y / 100) * zh

                tempCtx.save()
                if (el.flipped) {
                  tempCtx.translate(cx, cy)
                  tempCtx.scale(-1, 1)
                  tempCtx.drawImage(elImg, -pw / 2, -ph / 2, pw, ph)
                } else {
                  tempCtx.drawImage(elImg, cx - pw / 2, cy - ph / 2, pw, ph)
                }
                tempCtx.restore()
              } catch {
                // skip element if load fails
              }
            } else if (el.type === "text" && el.text) {
              const fontSize = Math.max(8, (el.scale / 100) * zw * 0.3)
              tempCtx.save()
              tempCtx.font = `700 ${fontSize}px ${el.fontFamily ?? "sans-serif"}`
              tempCtx.fillStyle = el.textColor ?? "#000"
              tempCtx.textAlign = (el.textAlign as CanvasTextAlign) ?? "center"
              tempCtx.textBaseline = "middle"
              const tx = zx + (el.position.x / 100) * zw
              const ty = zy + (el.position.y / 100) * zh
              tempCtx.fillText(el.text, tx, ty)
              tempCtx.restore()
            }
          }

          previewDataUrl = tempCanvas.toDataURL("image/jpeg", 0.7)
        }
      } catch (e) {
        console.error("Preview generation failed:", e)
      }
    }

    const selectedColor = currentColors.find((c) => c.id === selectedColorId)
    const selectedSize = currentSizes.find((s) => s.id === selectedSizeId)

    const constructorState = {
      baseId: currentBase.id,
      colorId: selectedColorId,
      sizeId: selectedSizeId,
      imgIndex: safeImgIndex,
      elements: elements,
    }

    if (editCartItemId && editCartItemType) {
      updateItem(editCartItemId, editCartItemType, {
        name: `${currentBase.name} \u043d\u0430 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f`,
        price: totalPrice,
        imageUrl: currentImage?.url ?? null,
        colorName: selectedColor?.name ?? undefined,
        sizeName: selectedSize?.name ?? undefined,
        previewDataUrl: previewDataUrl ?? undefined,
        constructorState,
      })
    } else {
      addItem({
        id: `custom-${Date.now()}`,
        type: "custom",
        name: `${currentBase.name} \u043d\u0430 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f`,
        price: totalPrice,
        imageUrl: currentImage?.url ?? null,
        colorName: selectedColor?.name ?? undefined,
        sizeName: selectedSize?.name ?? undefined,
        previewDataUrl: previewDataUrl ?? undefined,
        constructorState,
      })
    }
    router.push("/cart")
  }

  const elementsInCurrentImage = elements.filter((el) =>
    currentImage?.zones.some((z) => z.id === el.zoneId)
  )

  // Compute total price: base/size price + zone prices for zones with elements
  const usedZoneIds = new Set(elements.map((el) => el.zoneId))
  const zonesPrice = allImages
    .flatMap((img) => img.zones)
    .filter((z) => usedZoneIds.has(z.id) && z.price != null && z.price > 0)
    .reduce((sum, z) => sum + z.price!, 0)
  const basePrice = (() => {
    const selectedSize = currentSizes.find((s) => s.id === selectedSizeId)
    const bp = (selectedSize?.price && selectedSize.price > 0) ? selectedSize.price : currentBase.price
    return typeof bp === "string" ? parseFloat(bp) : (bp ?? 0)
  })()
  const totalPrice = basePrice + zonesPrice

  // Zone label mapping by area size
  const sortedZones = [...(currentImage?.zones ?? [])].sort((a, b) => {
    const areaA = a.width * a.height
    const areaB = b.width * b.height
    return areaA - areaB
  })

  // Shared zone picker — rendered in right panel (desktop) and zones drawer (mobile)
  const renderZonesContent = () => {
    const activeZoneId = selectedZoneId ?? currentImage?.zones[0]?.id ?? null
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {"\u0417\u043e\u043d\u0430 \u0440\u043e\u0437\u043c\u0456\u0449\u0435\u043d\u043d\u044f"}
        </p>
        {currentImage?.zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {"\u0417\u043e\u043d\u0438 \u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u0456"}
          </p>
        ) : (
          <RadioGroup
            value={activeZoneId ?? undefined}
            onValueChange={(id) => {
              setSelectedZoneId(id)
              setSelectedElementId(null)
              if (isMobile) setZonesDrawerOpen(false)
            }}
            className="gap-2"
          >
            {sortedZones.map((z, idx) => {
              const active = activeZoneId === z.id
              const area = z.width * z.height
              const sizeLabel = area < 500 ? "S" : area < 1500 ? "M" : area < 3000 ? "L" : "XL"
              return (
                <label
                  key={z.id}
                  htmlFor={`zone-${z.id}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/60"
                  )}
                >
                  <RadioGroupItem id={`zone-${z.id}`} value={z.id} className="shrink-0" />
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {sizeLabel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {z.name || `\u0417\u043e\u043d\u0430 ${idx + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(z.width)}&times;{Math.round(z.height)}%
                    </p>
                  </div>
                  {z.price != null && z.price > 0 && (
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      +{z.price} {"\u0433\u0440\u043d"}
                    </span>
                  )}
                </label>
              )
            })}
          </RadioGroup>
        )}

        {elements.length > 0 && (
          <div className="mt-1 rounded-lg border border-border bg-background p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {"\u0415\u043b\u0435\u043c\u0435\u043d\u0442\u0438"} ({elements.length})
            </p>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    selectedElementId === el.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="truncate">
                    {el.type === "image" ? "\u041c\u0430\u043b\u044e\u043d\u043e\u043a"
                      : el.type === "print" ? "\u041f\u0440\u0438\u043d\u0442"
                      : el.type === "text" ? `"${el.text?.slice(0, 15)}..."`
                      : "QR"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }}
                    className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    aria-label={"\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCatalogContent = () => (
    <div className="flex flex-col gap-4">
      {/* Segmented tab selector */}
      <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-muted p-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.type
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-all",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-0">
        {activeTab === "image" && (
          <ImageTab onUpload={handleImageUpload} />
        )}
        {activeTab === "print" && (
          <PrintTab prints={prints} categories={printCategories} subcategories={printSubcategories} onSelect={handleAddPrint} />
        )}
        {activeTab === "text" && (
          <TextTab
            text={textInput}
            onTextChange={setTextInput}
            color={textColor}
            onColorChange={setTextColor}
            font={textFont}
            onFontChange={setTextFont}
            align={textAlign}
            onAlignChange={setTextAlign}
            onAdd={handleAddText}
            fonts={fonts}
            onFontUpload={handleFontUpload}
          />
        )}
        {activeTab === "qr" && (
          <QrTab
            value={qrInput}
            onChange={setQrInput}
            onAdd={handleAddQr}
          />
        )}
        {activeTab === "ai" && (
          <AiTab onAdd={handleAddAiImage} />
        )}
      </div>
    </div>
  )

  const renderSelectedElementControls = () => selectedElement && (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {"\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u0435\u043b\u0435\u043c\u0435\u043d\u0442\u0443"}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setElements((prev) =>
              prev.map((el) =>
                el.id === selectedElementId
                  ? { ...el, scale: Math.max(10, el.scale - 10) }
                  : el
              )
            )
          }}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={10}
          max={100}
          value={selectedElement.scale}
          onChange={(e) => {
            const val = Number(e.target.value)
            setElements((prev) =>
              prev.map((el) => el.id === selectedElementId ? { ...el, scale: val } : el)
            )
          }}
          className="flex-1 accent-primary"
        />
        <button
          onClick={() => {
            setElements((prev) =>
              prev.map((el) =>
                el.id === selectedElementId
                  ? { ...el, scale: Math.min(100, el.scale + 10) }
                  : el
              )
            )
          }}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => toggleFlip(selectedElement.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
            selectedElement.flipped
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <FlipHorizontal2 className="h-3.5 w-3.5" />
          {"\u0414\u0437\u0435\u0440\u043a\u0430\u043b\u043e"}
        </button>
        <button
          onClick={() => {
            setElements((prev) =>
              prev.map((el) =>
                el.id === selectedElementId
                  ? { ...el, position: { x: 50, y: 50 }, scale: 50, flipped: false }
                  : el
              )
            )
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {"\u0421\u043a\u0438\u043d\u0443\u0442\u0438"}
        </button>
        <button
          onClick={() => deleteElement(selectedElement.id)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )

  const renderBaseSummary = () => (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {"\u041e\u0441\u043d\u043e\u0432\u0430"}
      </p>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
        {currentImage?.url ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            <img src={currentImage.url} alt={currentBase.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{currentBase.name}</p>
          <p className="text-xs text-muted-foreground">
            {typeof currentBase.price === "string" ? parseFloat(currentBase.price) : (currentBase.price ?? 0)} {"\u0433\u0440\u043d"}
          </p>
        </div>
        <button
          onClick={() => setBasePickerOpen(true)}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          {"\u0417\u043c\u0456\u043d\u0438\u0442\u0438"}
        </button>
      </div>
    </div>
  )

  const renderSizePicker = () => {
    if (currentSizes.length === 0) return null
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {"\u0420\u043e\u0437\u043c\u0456\u0440"}
        </p>
        <ToggleGroup
          type="single"
          value={selectedSizeId ?? ""}
          onValueChange={(v) => { if (v) setSelectedSizeId(v) }}
          variant="outline"
          className="w-full"
        >
          {currentSizes.map((size) => (
            <ToggleGroupItem
              key={size.id}
              value={size.id}
              className={cn(
                "h-10 flex-1 text-xs font-medium",
                selectedSizeId === size.id && "bg-primary text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              )}
            >
              {size.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    )
  }

  const renderPriceSummary = () => (
    <div className="flex flex-col gap-1.5 rounded-lg bg-background p-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{"\u041e\u0441\u043d\u043e\u0432\u0430"}</span>
        <span className="text-foreground">{basePrice} {"\u0433\u0440\u043d"}</span>
      </div>
      {zonesPrice > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {"\u0417\u043e\u043d\u0430"}
            {currentZone?.name ? ` (${currentZone.name})` : ""}
          </span>
          <span className="text-primary">+{zonesPrice} {"\u0433\u0440\u043d"}</span>
        </div>
      )}
      <Separator className="my-1" />
      <div className="flex items-center justify-between text-base font-semibold text-foreground">
        <span>{"\u0420\u0430\u0437\u043e\u043c"}</span>
        <span>{totalPrice} {"\u0433\u0440\u043d"}</span>
      </div>
    </div>
  )

  const renderCartButton = () => (
    <Button
      size="lg"
      onClick={handleAddToCart}
      className="flex w-full items-center justify-center gap-2 text-sm font-semibold"
    >
      <ShoppingCart className="size-4" />
      {editCartItemId
        ? "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043c\u0456\u043d\u0438"
        : "\u0414\u043e\u0434\u0430\u0442\u0438 \u0432 \u043a\u043e\u0448\u0438\u043a"}
    </Button>
  )

  // Kept for mobile "add element" drawer — bundles base + size + price + CTA below the tabs
  const renderSizeAndCart = () => (
    <div className="flex flex-col gap-4 border-t border-border p-4">
      {renderBaseSummary()}
      {renderSizePicker()}
      {renderPriceSummary()}
      {renderCartButton()}
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100vh - 4rem)" }}>

      {/* ----------------------------------------------------------------- */}
      {/* LEFT — Preview (canvas + thumbs + colors)                          */}
      {/* ----------------------------------------------------------------- */}
      <div className={cn("order-1 flex flex-1 flex-col items-center justify-center bg-muted/20 p-4 lg:order-1 lg:p-8", isMobile && "pb-20")}>
        {currentImage ? (
          <>
            <div
              ref={canvasRef}
              className="relative w-full select-none constructor-canvas"
              style={{ maxWidth: 560, aspectRatio: "1 / 1", touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => setSelectedElementId(null)}
            >
              <img
                ref={imageRef}
                src={currentImage.url}
                alt={currentImage.label}
                className="pointer-events-none h-full w-full object-contain"
                draggable={false}
                onLoad={updateImageRect}
              />

              {/* Zones overlay — only show active zone */}
              {imageRect && currentImage.zones
                .filter((zone) => zone.id === (selectedZoneId ?? currentImage.zones[0]?.id))
                .map((zone) => {
                return (
                  <div
                    key={zone.id}
                    className="absolute rounded border-2 border-dashed border-primary/50 bg-primary/5 transition-colors"
                    style={{
                      left: imageRect.left + (zone.x / 100) * imageRect.width,
                      top: imageRect.top + (zone.y / 100) * imageRect.height,
                      width: (zone.width / 100) * imageRect.width,
                      height: (zone.height / 100) * imageRect.height,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedZoneId(zone.id)
                      setSelectedElementId(null)
                    }}
                  >
                    {/* Snap guide lines — visible when element snaps to center */}
                    {(snappedAxis.x || snappedAxis.y) && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {snappedAxis.x && (
                          <div
                            className="absolute left-1/2 top-0 h-full -translate-x-1/2"
                            style={{ width: 0, borderLeft: "2px dashed #f43f5e" }}
                          />
                        )}
                        {snappedAxis.y && (
                          <div
                            className="absolute left-0 top-1/2 w-full -translate-y-1/2"
                            style={{ height: 0, borderTop: "2px dashed #f43f5e" }}
                          />
                        )}
                      </div>
                    )}
                    {/* Render elements in this zone */}
                    {elementsInCurrentImage
                      .filter((el) => el.zoneId === zone.id)
                      .map((el) => (
                        <CanvasElementView
                          key={el.id}
                          element={el}
                          isSelected={el.id === selectedElementId}
                          isDragging={isDragging && el.id === selectedElementId}
                          onSelect={(e) => {
                            e.stopPropagation()
                            setSelectedElementId(el.id)
                            setSelectedZoneId(el.zoneId)
                          }}
                          onDragStart={(e) => {
                            e.stopPropagation()
                            setSelectedElementId(el.id)
                            setSelectedZoneId(el.zoneId)
                            setIsDragging(true)
                          }}
                          onResizeStart={(dir, e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setIsResizing(dir)
                            setResizeStartPos({ x: e.clientX, y: e.clientY })
                            setResizeStartScale(el.scale)
                          }}
                          onFlip={() => toggleFlip(el.id)}
                          onDelete={() => deleteElement(el.id)}
                          onDeselect={() => setSelectedElementId(null)}
                          onAspectRatio={(r) => { aspectMapRef.current[el.id] = r }}
                        />
                      ))}

                    {/* Zone label when active and empty */}
                    {!elementsInCurrentImage.some((el) => el.zoneId === zone.id) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary/40 pointer-events-none">
                        <Upload className="h-6 w-6" />
                        <span className="text-[10px] font-medium">
                          {zone.name || "\u0417\u043e\u043d\u0430"}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Side/view thumbnails */}
            {currentImages.length > 1 && (
              <div className="mt-6 flex justify-center gap-3">
                {currentImages.map((img, idx) => {
                  const hasElements = elements.some((el) =>
                    img.zones.some((z) => z.id === el.zoneId)
                  )
                  const isActive = safeImgIndex === idx
                  return (
                    <button
                      key={img.id}
                      onClick={() => handleImageChange(idx)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 transition-all",
                      )}
                    >
                      <div
                        className={cn(
                          "relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all",
                          isActive
                            ? "border-primary ring-2 ring-primary/30 shadow-md scale-105"
                            : "border-border hover:border-primary/40 hover:shadow-sm"
                        )}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="h-full w-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/5" />
                        )}
                        {hasElements && (
                          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-sm">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {img.label || `${idx + 1}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Color selector (filters images by color) */}
            {currentColors.length > 0 && (
              <div className="mt-6 flex items-center gap-2">
                {currentColors.map((color) => {
                  const hasImages = allImages.some((img) => img.color_id === color.id)
                  if (!hasImages) return null
                  const isActive = selectedColorId === color.id
                  return (
                    <button
                      key={color.id}
                      title={color.name}
                      onClick={() => {
                        // Build zone ID mapping: old color zones → new color zones (by image index + zone index)
                        const oldImages = selectedColorId
                          ? allImages.filter((img) => img.color_id === selectedColorId)
                          : allImages
                        const newImages = allImages.filter((img) => img.color_id === color.id)
                        const zoneMap = new Map<string, string>()
                        for (let i = 0; i < Math.min(oldImages.length, newImages.length); i++) {
                          const oldZones = oldImages[i].zones
                          const newZones = newImages[i].zones
                          for (let z = 0; z < Math.min(oldZones.length, newZones.length); z++) {
                            zoneMap.set(oldZones[z].id, newZones[z].id)
                          }
                        }
                        // Remap elements to new zone IDs, drop elements whose zones don't map
                        setElements((prev) =>
                          prev
                            .map((el) => {
                              const newZoneId = zoneMap.get(el.zoneId)
                              return newZoneId ? { ...el, zoneId: newZoneId } : null
                            })
                            .filter((el): el is CanvasElement => el !== null)
                        )
                        setSelectedColorId(color.id)
                        setImgIndex(0)
                        setSelectedZoneId(newImages[0]?.zones[0]?.id ?? null)
                        setSelectedElementId(null)
                      }}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 shadow-sm transition-all hover:scale-110",
                        isActive
                          ? "border-primary ring-2 ring-primary/30 scale-110"
                          : "border-border"
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  )
                })}
              </div>
            )}

          </>
        ) : (
          <p className="text-muted-foreground">
            {"\u041d\u0435\u043c\u0430\u0454 \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u044c"}
          </p>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* RIGHT PANEL — Controls (desktop only)                              */}
      {/* ----------------------------------------------------------------- */}
      <aside className="hidden lg:flex order-2 w-full shrink-0 flex-col border-l border-border bg-card lg:w-[420px] xl:w-[440px]">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-5">
            {renderCatalogContent()}
            {selectedElement && renderSelectedElementControls()}
            <Separator />
            {renderZonesContent()}
            <Separator />
            {renderBaseSummary()}
            {renderSizePicker()}
            {renderPriceSummary()}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-border bg-card p-4">
          {renderCartButton()}
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* MOBILE — Floating bottom toolbar + Drawers                         */}
      {/* ----------------------------------------------------------------- */}
      {isMobile && (
        <>
          {/* Floating toolbar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 border-t-2 border-primary/30 bg-white p-2.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.12)] lg:hidden">
            <button
              onClick={() => setZonesDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
            >
              <Layers className="h-4 w-4" />
              {"\u0417\u043e\u043d\u0438"}
              {currentZone && (
                <span className="max-w-[60px] truncate text-muted-foreground">{currentZone.name || "\u0417\u043e\u043d\u0430"}</span>
              )}
            </button>
            <button
              onClick={() => setAddElementDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
            >
              <ImagePlus className="h-4 w-4" />
              {"\u0414\u043e\u0434\u0430\u0442\u0438"}
            </button>

            {selectedElement && (
              <div className="ml-auto flex items-center gap-1.5">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selectedElement.scale}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setElements((prev) =>
                      prev.map((el) => el.id === selectedElementId ? { ...el, scale: val } : el)
                    )
                  }}
                  className="w-20 accent-primary"
                />
                <button
                  onClick={() => toggleFlip(selectedElement.id)}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground"
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="rounded-lg border border-destructive/30 p-1.5 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {!selectedElement && (
              <span className="ml-auto text-xs font-bold text-foreground">
                {totalPrice} {"\u0433\u0440\u043d"}
              </span>
            )}
          </div>

          {/* Zones drawer */}
          <Drawer open={zonesDrawerOpen} onOpenChange={setZonesDrawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{"\u0417\u043e\u043d\u0438 \u0442\u0430 \u0435\u043b\u0435\u043c\u0435\u043d\u0442\u0438"}</DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="p-4">
                  {renderZonesContent()}
                </div>
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          {/* Add element drawer */}
          <Drawer open={addElementDrawerOpen} onOpenChange={setAddElementDrawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{"\u0414\u043e\u0434\u0430\u0442\u0438 \u0435\u043b\u0435\u043c\u0435\u043d\u0442"}</DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="p-4">
                  {renderCatalogContent()}
                </div>
                {renderSizeAndCart()}
              </ScrollArea>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Base picker modal */}
      <BasePickerModal
        open={basePickerOpen}
        onOpenChange={setBasePickerOpen}
        currentBaseId={currentBase.id}
        onSelectBase={handleBaseChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Base Picker Modal
// ---------------------------------------------------------------------------

function BasePickerModal({
  open,
  onOpenChange,
  currentBaseId,
  onSelectBase,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBaseId: string
  onSelectBase: (baseId: number) => void
}) {
  type Category = { id: number; name: string }
  type Subcategory = { id: number; name: string; base_category_id: number | null }
  type BaseItem = { id: number; name: string; image_url: string | null; price: number | null }

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<number | null>(null)
  const [bases, setBases] = useState<BaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBases, setLoadingBases] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load categories & subcategories on open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const [catsRes, subcatsRes] = await Promise.all([
        supabase.from("base_categories").select("id, name").order("id"),
        supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
      ])
      if (cancelled) return
      setCategories(catsRes.data ?? [])
      setSubcategories(subcatsRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [open])

  // Load bases when category/subcategory/search changes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoadingBases(true)
      const supabase = createClient()

      let query = supabase
        .from("bases")
        .select("id, name, image_url, price")
        .order("name")

      if (activeSubcategoryId) {
        query = query.eq("base_subcategory_id", activeSubcategoryId)
      } else if (activeCategoryId) {
        const subcatIds = subcategories
          .filter((sc) => sc.base_category_id === activeCategoryId)
          .map((sc) => sc.id)
        if (subcatIds.length > 0) {
          query = query.in("base_subcategory_id", subcatIds)
        } else {
          setBases([])
          setLoadingBases(false)
          return
        }
      }

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`)
      }

      const { data } = await query.limit(100)
      if (cancelled) return
      setBases((data ?? []) as BaseItem[])
      setLoadingBases(false)
    }
    load()
    return () => { cancelled = true }
  }, [open, activeCategoryId, activeSubcategoryId, searchQuery, subcategories])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActiveCategoryId(null)
      setActiveSubcategoryId(null)
      setSearchQuery("")
      setSearchInput("")
    }
  }, [open])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 400)
  }

  const subcatsForActive = subcategories.filter(
    (sc) => sc.base_category_id === activeCategoryId
  )

  const decodeLabel = (raw: string | null) => {
    if (!raw) return null
    const idx = raw.indexOf("__lbl__")
    return idx === -1 ? raw : raw.substring(0, idx)
  }

  const resultCount = bases.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl h-[calc(100vh-4rem)] max-h-[820px] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">{"\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u0443"}</DialogTitle>
            <DialogDescription>
              {"\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044e \u0442\u0430 \u0442\u0438\u043f \u0442\u043e\u0432\u0430\u0440\u0443, \u0449\u043e\u0431 \u0437\u043d\u0430\u0439\u0442\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0443 \u043e\u0441\u043d\u043e\u0432\u0443"}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={"\u041f\u043e\u0448\u0443\u043a \u043e\u0441\u043d\u043e\u0432\u0438 \u0437\u0430 \u043d\u0430\u0437\u0432\u043e\u044e..."}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-lg border bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* Category pills */}
          {!loading && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setActiveCategoryId(null)
                  setActiveSubcategoryId(null)
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  activeCategoryId === null
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {"\u0412\u0441\u0456"}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryId(activeCategoryId === cat.id ? null : cat.id)
                    setActiveSubcategoryId(null)
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                    activeCategoryId === cat.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Subcategory chips */}
          {activeCategoryId && subcatsForActive.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {subcatsForActive.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() =>
                    setActiveSubcategoryId(activeSubcategoryId === sc.id ? null : sc.id)
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1 text-xs font-medium transition-all",
                    activeSubcategoryId === sc.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Results area ── */}
        <div className="flex-1 overflow-hidden">
          {/* Results count */}
          <div className="px-6 py-3 text-xs text-muted-foreground">
            {loadingBases
              ? "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f..."
              : `${resultCount} ${resultCount === 1 ? "\u043e\u0441\u043d\u043e\u0432\u0430" : "\u043e\u0441\u043d\u043e\u0432"}`}
          </div>

          <ScrollArea className="h-[calc(100%-2.5rem)]">
            <div className="px-6 pb-6">
              {loadingBases ? (
                /* Skeleton grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-border">
                      <div className="aspect-square rounded-t-lg bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="h-3.5 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/3 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : bases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">
                    {"\u041e\u0441\u043d\u043e\u0432\u0438 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
                  </p>
                  <p className="mt-1 text-xs">
                    {"\u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0456\u043d\u0448\u0443 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044e \u0430\u0431\u043e \u0437\u043c\u0456\u043d\u0456\u0442\u044c \u043f\u043e\u0448\u0443\u043a\u043e\u0432\u0438\u0439 \u0437\u0430\u043f\u0438\u0442"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {bases.map((b) => {
                    const isActive = String(b.id) === currentBaseId
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          if (!isActive) onSelectBase(b.id)
                        }}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all",
                          isActive
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-border hover:border-primary/30 hover:shadow-md"
                        )}
                      >
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {b.image_url ? (
                            <img
                              src={decodeLabel(b.image_url) ?? ""}
                              alt={b.name}
                              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImagePlus className="size-8 text-muted-foreground/30" />
                            </div>
                          )}
                          {isActive && (
                            <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                              {"\u041e\u0431\u0440\u0430\u043d\u043e"}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-1 flex-col p-3">
                          <span className={cn(
                            "text-sm font-medium line-clamp-2 transition-colors",
                            isActive ? "text-primary" : "text-card-foreground group-hover:text-primary"
                          )}>
                            {b.name}
                          </span>
                          {b.price != null && Number(b.price) > 0 && (
                            <span className="mt-auto pt-1.5 text-sm font-bold text-foreground">
                              {"\u0432\u0456\u0434 "}{b.price} {"\u0433\u0440\u043d"}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Canvas Element renderer
// ---------------------------------------------------------------------------

function CanvasElementView({
  element,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onResizeStart,
  onFlip,
  onDelete,
  onDeselect,
  onAspectRatio,
}: {
  element: CanvasElement
  isSelected: boolean
  isDragging: boolean
  onSelect: (e: React.PointerEvent) => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart: (dir: "shrink" | "grow", e: React.PointerEvent) => void
  onFlip: () => void
  onDelete: () => void
  onDeselect: () => void
  onAspectRatio?: (ratio: number) => void
}) {
  const isImageLike = element.type === "image" || element.type === "print" || element.type === "qr"
  const [aspect, setAspect] = useState(1)

  return (
    <div
      className={cn(
        "absolute cursor-move",
        isSelected && "outline outline-2 outline-dashed outline-primary/60 rounded",
        isDragging ? "" : "transition-[left,top] duration-75",
      )}
      style={{
        left: `${element.position?.x ?? 50}%`,
        top: `${element.position?.y ?? 50}%`,
        width: `${element.scale}%`,
        height: element.type === "text" ? "auto" : undefined,
        aspectRatio: element.type === "text" ? undefined : `${aspect}`,
        transform: "translate(-50%, -50%)",
        willChange: isDragging ? "left, top" : "auto",
        zIndex: isSelected ? 20 : 10,
      }}
      onPointerDown={onDragStart}
      onClick={onSelect}
    >
      {isImageLike && element.imageUrl && (
        <img
          src={element.imageUrl}
          alt=""
          className="pointer-events-none h-full w-full object-contain drop-shadow-md"
          style={element.flipped ? { transform: "scaleX(-1)" } : undefined}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              const r = img.naturalWidth / img.naturalHeight
              setAspect(r)
              onAspectRatio?.(r)
            }
          }}
        />
      )}

      {element.type === "text" && (
        <div
          className="pointer-events-none select-none whitespace-pre-wrap break-words leading-tight drop-shadow-md"
          style={{
            color: element.textColor ?? "#000",
            fontFamily: element.fontFamily ?? "sans-serif",
            textAlign: element.textAlign ?? "center",
            fontSize: "clamp(8px, 2.5vw, 24px)",
            fontWeight: 700,
            transform: element.flipped ? "scaleX(-1)" : undefined,
          }}
        >
          {element.text}
        </div>
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          <div
            onPointerDown={(e) => onResizeStart("shrink", e)}
            className="absolute -left-4 -top-4 sm:-left-3 sm:-top-3 flex h-8 w-8 sm:h-6 sm:w-6 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110 z-30"
          >
            <Minimize2 className="h-3 w-3 text-foreground" />
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute -right-4 -top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110 z-30"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onFlip() }}
            className="absolute -bottom-4 -left-4 sm:-bottom-3 sm:-left-3 flex h-8 w-8 sm:h-6 sm:w-6 items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110 z-30"
          >
            <FlipHorizontal2 className="h-3 w-3 text-foreground" />
          </button>
          <div
            onPointerDown={(e) => onResizeStart("grow", e)}
            className="absolute -bottom-4 -right-4 sm:-bottom-3 sm:-right-3 flex h-8 w-8 sm:h-6 sm:w-6 cursor-nwse-resize items-center justify-center rounded-full border-2 border-border bg-card shadow-md hover:scale-110 z-30"
          >
            <Maximize2 className="h-3 w-3 text-foreground" />
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

function ImageTab({ onUpload }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50">
        <label className="flex cursor-pointer flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {"\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438 \u0444\u043e\u0442\u043e"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, SVG {"\u0434\u043e"} 5MB
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {"\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f \u0431\u0443\u0434\u0435 \u0434\u043e\u0434\u0430\u043d\u043e \u0443 \u043e\u0431\u0440\u0430\u043d\u0443 \u0437\u043e\u043d\u0443 \u043d\u0430 \u0432\u0438\u0440\u043e\u0431\u0456"}
      </p>
    </div>
  )
}

function PrintTab({ prints, categories, subcategories, onSelect }: {
  prints: PrintData[]
  categories: PrintCategoryData[]
  subcategories: PrintSubcategoryData[]
  onSelect: (p: PrintData) => void
}) {
  const [search, setSearch] = useState("")
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [selectedSubcatId, setSelectedSubcatId] = useState<number | null>(null)

  const visibleSubcats = selectedCatId
    ? subcategories.filter((s) => s.print_category_id === selectedCatId)
    : []

  const filtered = prints.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCatId && p.category_id !== selectedCatId) return false
    if (selectedSubcatId && p.subcategory_id !== selectedSubcatId) return false
    return true
  })

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={"\u041f\u043e\u0448\u0443\u043a \u043f\u0440\u0438\u043d\u0442\u0456\u0432..."}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelectedCatId(null); setSelectedSubcatId(null) }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              selectedCatId === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {"\u0412\u0441\u0456"}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id === selectedCatId ? null : cat.id)
                setSelectedSubcatId(null)
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedCatId === cat.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Subcategory filter */}
      {visibleSubcats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedSubcatId(null)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
              selectedSubcatId === null
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {"\u0412\u0441\u0456"}
          </button>
          {visibleSubcats.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcatId(sub.id === selectedSubcatId ? null : sub.id)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                selectedSubcatId === sub.id
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {"\u041f\u0440\u0438\u043d\u0442\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-border p-2 transition-all hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm"
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-16 w-16 rounded-lg bg-muted object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Paintbrush className="h-5 w-5" />
                </div>
              )}
              <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TextTab({
  text, onTextChange,
  color, onColorChange,
  font, onFontChange,
  align, onAlignChange,
  onAdd,
  fonts,
  onFontUpload,
}: {
  text: string; onTextChange: (v: string) => void
  color: string; onColorChange: (v: string) => void
  font: string; onFontChange: (v: string) => void
  align: "left" | "center" | "right"; onAlignChange: (v: "left" | "center" | "right") => void
  onAdd: () => void
  fonts: { value: string; label: string }[]
  onFontUpload: (file: File) => void
}) {
  const fontInputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-5">
      {/* Text input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {"\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043a\u0441\u0442"}
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={"\u0412\u0430\u0448 \u0442\u0435\u043a\u0441\u0442 \u0442\u0443\u0442..."}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {"\u0417\u0430\u0431\u043e\u0440\u043e\u043d\u0435\u043d\u043e \u0432\u0441\u0442\u0430\u0432\u043b\u044f\u0442\u0438 \u0435\u043c\u043e\u0434\u0437\u0456 \u0442\u0430 \u0441\u043f\u0435\u0446\u0441\u0438\u043c\u0432\u043e\u043b\u0438"}
        </p>
      </div>

      {/* Text formatting */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {"\u0424\u043e\u0440\u043c\u0430\u0442\u0443\u0432\u0430\u043d\u043d\u044f"}
        </label>
        <div className="flex items-center gap-2">
          {/* Alignment */}
          {([
            { val: "left" as const, Icon: AlignLeft },
            { val: "center" as const, Icon: AlignCenter },
            { val: "right" as const, Icon: AlignRight },
          ]).map(({ val, Icon }) => (
            <button
              key={val}
              onClick={() => onAlignChange(val)}
              className={cn(
                "rounded-lg border p-2.5 transition-all",
                align === val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}

          {/* Font selector */}
          <select
            value={font}
            onChange={(e) => onFontChange(e.target.value)}
            className="ml-auto h-10 flex-1 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.woff,.woff2,.otf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFontUpload(file)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => fontInputRef.current?.click()}
            className="rounded-lg border border-border p-2.5 text-muted-foreground transition-all hover:bg-muted"
            title={"\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438 \u0448\u0440\u0438\u0444\u0442"}
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {"\u041a\u043e\u043b\u0456\u0440 \u0442\u0435\u043a\u0441\u0442\u0443"}
        </label>
        <div className="flex flex-wrap gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-primary ring-2 ring-primary/30" : "border-border"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onAdd}
        disabled={!text.trim()}
        className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {"\u0414\u043e\u0434\u0430\u0442\u0438 \u0442\u0435\u043a\u0441\u0442"}
      </button>
    </div>
  )
}

function QrTab({
  value, onChange, onAdd,
}: {
  value: string; onChange: (v: string) => void; onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {"\u0412\u043c\u0456\u0441\u0442 QR-\u043a\u043e\u0434\u0443"}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={"\u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f, \u0442\u0435\u043a\u0441\u0442 \u0430\u0431\u043e URL..."}
        />
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
        {value.trim() ? (
          <QrPreview value={value.trim()} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <QrCode className="h-10 w-10" />
            <p className="text-xs">
              {"\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043a\u0441\u0442 \u0434\u043b\u044f \u043f\u0440\u0435\u0432\u02bc\u044e"}
            </p>
          </div>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {"\u0414\u043e\u0434\u0430\u0442\u0438 QR-\u043a\u043e\u0434"}
      </button>
    </div>
  )
}

function QrPreview({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: 160, margin: 1 }).then((url) => {
      if (!cancelled) setSrc(url)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [value])

  if (!src) return null
  return <img src={src} alt="QR" className="mx-auto h-32 w-32 rounded-lg" />
}

function AiTab({ onAdd }: { onAdd: (imageUrl: string) => void }) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [history, setHistory] = useState<{ url: string; prompt: string }[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setPreviewUrl(null)

    const result = await generateDalleImage(prompt.trim())

    if ("error" in result) {
      setError(result.error)
    } else {
      setPreviewUrl(result.imageUrl)
      setHistory((prev) => [{ url: result.imageUrl, prompt: prompt.trim() }, ...prev])
    }
    setLoading(false)
  }

  const handleSelectFromHistory = (item: { url: string; prompt: string }) => {
    setPreviewUrl(item.url)
    setPrompt(item.prompt)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {"\u041e\u043f\u0438\u0448\u0456\u0442\u044c \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f"}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={"\u041e\u043f\u0438\u0448\u0456\u0442\u044c \u0449\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u043f\u043e\u0431\u0430\u0447\u0438\u0442\u0438..."}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {"\u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u044f..."}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {"\u0417\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438"}
          </>
        )}
      </button>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <img
              src={previewUrl}
              alt="AI generated"
              className="mx-auto aspect-square w-full rounded-lg object-cover"
            />
          </div>
          <button
            onClick={() => onAdd(previewUrl)}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            {"\u0414\u043e\u0434\u0430\u0442\u0438 \u043d\u0430 \u0432\u0438\u0440\u0456\u0431"}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            {"\u0406\u0441\u0442\u043e\u0440\u0456\u044f \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u0439"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectFromHistory(item)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary",
                  previewUrl === item.url ? "border-primary ring-2 ring-primary/30" : "border-border"
                )}
                title={item.prompt}
              >
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] leading-tight text-white line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.prompt}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {"\u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u044f \u043c\u043e\u0436\u0435 \u0437\u0430\u0439\u043d\u044f\u0442\u0438 \u0434\u043e 30 \u0441\u0435\u043a\u0443\u043d\u0434"}
      </p>
    </div>
  )
}
