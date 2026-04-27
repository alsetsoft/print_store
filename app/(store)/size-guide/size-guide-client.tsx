"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Info,
  Loader2,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UA } from "@/lib/translations"
import { validateImageFile, imageAcceptString } from "@/lib/file-validation"

type Mode = "simple" | "photo" | "advanced"

interface SizeResult {
  recommended_size: string
  alternative_size: string | null
  fit_explanation: string
  confidence: number
  confidence_level: "low" | "medium" | "high"
  assumptions: string[]
  missing_data: string[]
  disclaimer: string
}

interface ExtraField {
  key: string
  label: string
  type: "number" | "text"
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "t-shirt", label: "\u0424\u0443\u0442\u0431\u043e\u043b\u043a\u0430" },
  { value: "pants", label: "\u0428\u0442\u0430\u043d\u0438" },
  { value: "jacket", label: "\u041a\u0443\u0440\u0442\u043a\u0430" },
  { value: "hoodie", label: "\u0425\u0443\u0434\u0456" },
  { value: "dress", label: "\u0421\u0443\u043a\u043d\u044f" },
  { value: "shirt", label: "\u0421\u043e\u0440\u043e\u0447\u043a\u0430" },
]

const M_CHEST = "\u041e\u0431\u0445\u0432\u0430\u0442 \u0433\u0440\u0443\u0434\u0435\u0439 (\u0441\u043c)"
const M_SHOULDER = "\u0428\u0438\u0440\u0438\u043d\u0430 \u043f\u043b\u0435\u0447\u0435\u0439 (\u0441\u043c)"
const M_WAIST = "\u041e\u0431\u0445\u0432\u0430\u0442 \u0442\u0430\u043b\u0456\u0457 (\u0441\u043c)"
const M_HIPS = "\u041e\u0431\u0445\u0432\u0430\u0442 \u0441\u0442\u0435\u0433\u043e\u043d (\u0441\u043c)"
const M_INSEAM = "\u0414\u043e\u0432\u0436\u0438\u043d\u0430 \u0432\u043d\u0443\u0442\u0440\u0456\u0448\u043d\u044c\u043e\u0433\u043e \u0448\u0432\u0430 (\u0441\u043c)"
const M_ARM = "\u0414\u043e\u0432\u0436\u0438\u043d\u0430 \u0440\u0443\u043a\u0430\u0432\u0430 (\u0441\u043c)"
const M_NECK = "\u041e\u0431\u0445\u0432\u0430\u0442 \u0448\u0438\u0457 (\u0441\u043c)"

const CATEGORY_EXTRA_FIELDS: Record<string, ExtraField[]> = {
  "t-shirt": [
    { key: "chest", label: M_CHEST, type: "number" },
    { key: "shoulderWidth", label: M_SHOULDER, type: "number" },
  ],
  pants: [
    { key: "waist", label: M_WAIST, type: "number" },
    { key: "hips", label: M_HIPS, type: "number" },
    { key: "inseam", label: M_INSEAM, type: "number" },
  ],
  jacket: [
    { key: "chest", label: M_CHEST, type: "number" },
    { key: "shoulderWidth", label: M_SHOULDER, type: "number" },
    { key: "armLength", label: M_ARM, type: "number" },
  ],
  hoodie: [
    { key: "chest", label: M_CHEST, type: "number" },
    { key: "shoulderWidth", label: M_SHOULDER, type: "number" },
  ],
  dress: [
    { key: "chest", label: M_CHEST, type: "number" },
    { key: "waist", label: M_WAIST, type: "number" },
    { key: "hips", label: M_HIPS, type: "number" },
  ],
  shirt: [
    { key: "chest", label: M_CHEST, type: "number" },
    { key: "neck", label: M_NECK, type: "number" },
    { key: "armLength", label: M_ARM, type: "number" },
  ],
}

const SIZE_TABLE = [
  { minHeight: 150, maxHeight: 160, minWeight: 40, maxWeight: 55, size: "XS" },
  { minHeight: 155, maxHeight: 165, minWeight: 50, maxWeight: 65, size: "S" },
  { minHeight: 160, maxHeight: 175, minWeight: 60, maxWeight: 75, size: "M" },
  { minHeight: 170, maxHeight: 185, minWeight: 70, maxWeight: 90, size: "L" },
  { minHeight: 178, maxHeight: 195, minWeight: 85, maxWeight: 105, size: "XL" },
  { minHeight: 185, maxHeight: 210, minWeight: 100, maxWeight: 130, size: "XXL" },
]

function getSimpleSize(height: number, weight: number): { size: string; alternative: string | null } {
  let bestIdx = 0
  let bestScore = Infinity
  for (let i = 0; i < SIZE_TABLE.length; i++) {
    const row = SIZE_TABLE[i]
    const hMid = (row.minHeight + row.maxHeight) / 2
    const wMid = (row.minWeight + row.maxWeight) / 2
    const score = Math.abs(height - hMid) / 15 + Math.abs(weight - wMid) / 15
    if (score < bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  const size = SIZE_TABLE[bestIdx].size
  let alternative: string | null = null
  if (bestIdx > 0) {
    const prev = SIZE_TABLE[bestIdx - 1]
    if (height <= prev.maxHeight || weight <= prev.maxWeight) {
      alternative = prev.size
    }
  }
  if (!alternative && bestIdx < SIZE_TABLE.length - 1) {
    const next = SIZE_TABLE[bestIdx + 1]
    if (height >= next.minHeight || weight >= next.minWeight) {
      alternative = next.size
    }
  }
  return { size, alternative }
}

function confidenceBadgeClass(level: string): string {
  if (level === "high") return "bg-primary text-primary-foreground"
  if (level === "medium") return "bg-accent text-accent-foreground"
  return "bg-destructive text-destructive-foreground"
}

function ConfidenceIcon({ level }: { level: string }) {
  if (level === "high") return <CheckCircle className="size-4" />
  if (level === "medium") return <Info className="size-4" />
  return <AlertTriangle className="size-4" />
}

function AiResultCard({ result }: { result: SizeResult }) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442"}
          </CardTitle>
          <Badge className={confidenceBadgeClass(result.confidence_level)}>
            <span className="flex items-center gap-1">
              <ConfidenceIcon level={result.confidence_level} />
              {Math.round(result.confidence * 100)}%{" "}
              {"\u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456\u0441\u0442\u044c"}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {"\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0438\u0439"}
            </p>
            <p className="text-4xl font-bold text-primary">{result.recommended_size}</p>
          </div>
          {result.alternative_size && (
            <>
              <span className="text-muted-foreground">/</span>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {"\u0410\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u0430"}
                </p>
                <p className="text-4xl font-bold text-muted-foreground">
                  {result.alternative_size}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {"\u041f\u043e\u044f\u0441\u043d\u0435\u043d\u043d\u044f"}
          </p>
          <p className="text-sm text-muted-foreground">{result.fit_explanation}</p>
        </div>
        {result.assumptions.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {"\u041f\u0440\u0438\u043f\u0443\u0449\u0435\u043d\u043d\u044f"}
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
              {result.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {result.missing_data.length > 0 && (
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
              <AlertTriangle className="size-3.5 text-destructive" />
              {"\u0414\u043b\u044f \u043a\u0440\u0430\u0449\u043e\u0457 \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u0456 \u0434\u043e\u0434\u0430\u0439\u0442\u0435"}
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
              {result.missing_data.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
        {result.disclaimer && (
          <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
            {result.disclaimer}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

async function postSizeRecommendation(payload: Record<string, unknown>): Promise<SizeResult> {
  const resp = await fetch("/api/size-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const err = (await resp.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430")
  }
  return (await resp.json()) as SizeResult
}

export function SizeGuideClient() {
  const [mode, setMode] = useState<Mode>("simple")

  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [simpleResult, setSimpleResult] =
    useState<{ size: string; alternative: string | null } | null>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoResult, setPhotoResult] = useState<SizeResult | null>(null)
  const photoFileRef = useRef<HTMLInputElement>(null)

  const [advGender, setAdvGender] = useState("")
  const [advCategory, setAdvCategory] = useState("")
  const [advHeight, setAdvHeight] = useState("")
  const [advWeight, setAdvWeight] = useState("")
  const [fitPreference, setFitPreference] = useState("")
  const [brand, setBrand] = useState("")
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  const [advLoading, setAdvLoading] = useState(false)
  const [advResult, setAdvResult] = useState<SizeResult | null>(null)

  const currentExtraFields = useMemo(
    () => CATEGORY_EXTRA_FIELDS[advCategory] || [],
    [advCategory],
  )

  const handleCategoryChange = (val: string) => {
    setAdvCategory(val)
    setExtraFields({})
  }

  const handleExtraChange = (key: string, value: string) => {
    setExtraFields((prev) => ({ ...prev, [key]: value }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const error = validateImageFile(file, { allow: ["jpeg", "png", "webp"] })
    if (error) {
      toast.error(error)
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPhotoPreview(dataUrl)
      setPhotoBase64(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    setPhotoBase64(null)
    if (photoFileRef.current) photoFileRef.current.value = ""
  }

  const handleSimpleSubmit = () => {
    if (!height || !weight) {
      toast.error("\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0437\u0440\u0456\u0441\u0442 \u0442\u0430 \u0432\u0430\u0433\u0443.")
      return
    }
    setSimpleResult(getSimpleSize(Number(height), Number(weight)))
  }

  const handlePhotoSubmit = async () => {
    if (!photoBase64) {
      toast.error("\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0442\u0435 \u0444\u043e\u0442\u043e.")
      return
    }
    setPhotoLoading(true)
    setPhotoResult(null)
    try {
      const data = await postSizeRecommendation({ photoBase64 })
      setPhotoResult(data)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044e",
      )
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleAdvSubmit = async () => {
    if (!advHeight || !advGender || !advCategory) {
      toast.error(
        "\u0417\u0430\u043f\u043e\u0432\u043d\u0456\u0442\u044c \u0437\u0440\u0456\u0441\u0442, \u0441\u0442\u0430\u0442\u044c \u0442\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044e.",
      )
      return
    }
    setAdvLoading(true)
    setAdvResult(null)

    const measurements: Record<string, number> = {}
    if (advWeight) measurements.weight = Number(advWeight)
    for (const [key, val] of Object.entries(extraFields)) {
      if (val) measurements[key] = Number(val)
    }

    try {
      const data = await postSizeRecommendation({
        height: Number(advHeight),
        gender: advGender,
        category: advCategory,
        fitPreference: fitPreference || undefined,
        brand: brand || undefined,
        measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      })
      setAdvResult(data)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044e",
      )
    } finally {
      setAdvLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 text-primary">
          <Ruler className="size-6" />
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">
            {UA.store.sizeGuide}
          </h1>
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {UA.store.sizeGuideDescription}
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="simple" className="flex-col gap-1 py-3">
            <Ruler className="size-4" />
            <span className="text-sm font-medium">
              {"\u0417\u0430 \u0437\u0440\u043e\u0441\u0442\u043e\u043c \u0456 \u0432\u0430\u0433\u043e\u044e"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex-col gap-1 py-3">
            <Camera className="size-4" />
            <span className="text-sm font-medium">{"AI \u043f\u043e \u0444\u043e\u0442\u043e"}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-col gap-1 py-3">
            <SlidersHorizontal className="size-4" />
            <span className="text-sm font-medium">
              {"\u0420\u043e\u0437\u0448\u0438\u0440\u0435\u043d\u0456 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0438"}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ============= Simple ============= */}
        <TabsContent value="simple" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {"\u0428\u0432\u0438\u0434\u043a\u0438\u0439 \u043f\u0456\u0434\u0431\u0456\u0440 \u0437\u0430 \u0437\u0440\u043e\u0441\u0442\u043e\u043c \u0442\u0430 \u0432\u0430\u0433\u043e\u044e"}
              </CardTitle>
              <CardDescription>
                {"\u0411\u0430\u0437\u043e\u0432\u0430 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044f \u0431\u0435\u0437 AI"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="simple-height">
                    {"\u0417\u0440\u0456\u0441\u0442 (\u0441\u043c) *"}
                  </Label>
                  <Input
                    id="simple-height"
                    type="number"
                    min={100}
                    max={250}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="simple-weight">
                    {"\u0412\u0430\u0433\u0430 (\u043a\u0433) *"}
                  </Label>
                  <Input
                    id="simple-weight"
                    type="number"
                    min={30}
                    max={200}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSimpleSubmit} className="w-full" size="lg">
                {"\u0412\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u0440\u043e\u0437\u043c\u0456\u0440"}
              </Button>
            </CardContent>
          </Card>

          {simpleResult && (
            <Card className="border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {"\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0438\u0439 \u0440\u043e\u0437\u043c\u0456\u0440"}
                    </p>
                    <p className="text-4xl font-bold text-primary">{simpleResult.size}</p>
                  </div>
                  {simpleResult.alternative && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {"\u0410\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u0430"}
                        </p>
                        <p className="text-4xl font-bold text-muted-foreground">
                          {simpleResult.alternative}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-4 text-center text-xs italic text-muted-foreground">
                  {"\u0426\u0435 \u043f\u0440\u0438\u0431\u043b\u0438\u0437\u043d\u0430 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044f. \u0414\u043b\u044f \u0442\u043e\u0447\u043d\u0456\u0448\u043e\u0433\u043e \u043f\u0456\u0434\u0431\u043e\u0440\u0443 \u0441\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 AI \u043f\u043e \u0444\u043e\u0442\u043e \u0430\u0431\u043e \u0440\u043e\u0437\u0448\u0438\u0440\u0435\u043d\u0456 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0438."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============= Photo ============= */}
        <TabsContent value="photo" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="size-4 text-primary" />
                {"AI \u043f\u0456\u0434\u0431\u0456\u0440 \u043f\u043e \u0444\u043e\u0442\u043e"}
              </CardTitle>
              <CardDescription>
                {"\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0442\u0435 \u0444\u0440\u043e\u043d\u0442\u0430\u043b\u044c\u043d\u0435 \u0444\u043e\u0442\u043e \u2014 AI \u0432\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0438\u0439 \u0440\u043e\u0437\u043c\u0456\u0440"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>{"\u0424\u043e\u0442\u043e *"}</Label>
                <p className="text-xs text-muted-foreground">
                  {"\u0424\u0440\u043e\u043d\u0442\u0430\u043b\u044c\u043d\u0435 \u0444\u043e\u0442\u043e \u0443 \u043f\u043e\u0432\u043d\u0438\u0439 \u0437\u0440\u0456\u0441\u0442 \u0434\u043b\u044f \u043e\u0446\u0456\u043d\u043a\u0438 \u0441\u0438\u043b\u0443\u0435\u0442\u0443."}
                </p>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={photoPreview}
                      alt={"\u0412\u0430\u0448\u0435 \u0444\u043e\u0442\u043e"}
                      width={160}
                      height={160}
                      unoptimized
                      className="h-40 w-auto rounded-md border border-border object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={removePhoto}
                      aria-label={"\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0444\u043e\u0442\u043e"}
                      className="absolute -right-2 -top-2 size-7 rounded-full"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoFileRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:border-primary focus-visible:outline-none"
                  >
                    <Upload className="size-6" />
                    <span>
                      {"\u041d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c, \u0449\u043e\u0431 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438"}
                    </span>
                    <span className="text-xs">
                      {"JPG, PNG \u00b7 \u0434\u043e 5 \u041c\u0411"}
                    </span>
                  </button>
                )}
                <input
                  ref={photoFileRef}
                  type="file"
                  accept={imageAcceptString(["jpeg", "png", "webp"])}
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <Button
                onClick={handlePhotoSubmit}
                disabled={photoLoading || !photoBase64}
                className="w-full"
                size="lg"
              >
                {photoLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {"\u0410\u043d\u0430\u043b\u0456\u0437\u0443\u0454\u043c\u043e \u0444\u043e\u0442\u043e..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    {"\u0412\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u0440\u043e\u0437\u043c\u0456\u0440 \u043f\u043e \u0444\u043e\u0442\u043e"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {photoResult && <AiResultCard result={photoResult} />}
        </TabsContent>

        {/* ============= Advanced ============= */}
        <TabsContent value="advanced" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SlidersHorizontal className="size-4 text-primary" />
                {"\u0420\u043e\u0437\u0448\u0438\u0440\u0435\u043d\u0438\u0439 \u043f\u0456\u0434\u0431\u0456\u0440"}
              </CardTitle>
              <CardDescription>
                {"\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0434\u0435\u0442\u0430\u043b\u044c\u043d\u0456 \u0432\u0438\u043c\u0456\u0440\u0438 \u0434\u043b\u044f \u043c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u043e \u0442\u043e\u0447\u043d\u043e\u0457 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u0457"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{"\u0421\u0442\u0430\u0442\u044c *"}</Label>
                  <Select value={advGender} onValueChange={setAdvGender}>
                    <SelectTrigger>
                      <SelectValue placeholder={"\u041e\u0431\u0435\u0440\u0456\u0442\u044c"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">
                        {"\u0427\u043e\u043b\u043e\u0432\u0456\u0447\u0430"}
                      </SelectItem>
                      <SelectItem value="female">{"\u0416\u0456\u043d\u043e\u0447\u0430"}</SelectItem>
                      <SelectItem value="unisex">{"\u0423\u043d\u0456\u0441\u0435\u043a\u0441"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f \u043e\u0434\u044f\u0433\u0443 *"}
                  </Label>
                  <Select value={advCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={"\u041e\u0431\u0435\u0440\u0456\u0442\u044c"} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="adv-height">
                    {"\u0417\u0440\u0456\u0441\u0442 (\u0441\u043c) *"}
                  </Label>
                  <Input
                    id="adv-height"
                    type="number"
                    min={100}
                    max={250}
                    value={advHeight}
                    onChange={(e) => setAdvHeight(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adv-weight">{"\u0412\u0430\u0433\u0430 (\u043a\u0433)"}</Label>
                  <Input
                    id="adv-weight"
                    type="number"
                    min={30}
                    max={200}
                    value={advWeight}
                    onChange={(e) => setAdvWeight(e.target.value)}
                  />
                </div>
              </div>

              {currentExtraFields.length > 0 && (
                <div className="space-y-3 rounded-md border border-border bg-secondary/50 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {"\u0414\u043e\u0434\u0430\u0442\u043a\u043e\u0432\u0456 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0438 \u0434\u043b\u044f \u0442\u043e\u0447\u043d\u0456\u0448\u043e\u0433\u043e \u043f\u0456\u0434\u0431\u043e\u0440\u0443"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {currentExtraFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label htmlFor={`adv-${field.key}`} className="text-xs">
                          {field.label}
                        </Label>
                        <Input
                          id={`adv-${field.key}`}
                          type={field.type}
                          value={extraFields[field.key] || ""}
                          onChange={(e) => handleExtraChange(field.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{"\u0411\u0430\u0436\u0430\u043d\u0430 \u043f\u043e\u0441\u0430\u0434\u043a\u0430"}</Label>
                <Select value={fitPreference} onValueChange={setFitPreference}>
                  <SelectTrigger>
                    <SelectValue placeholder={"\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u0430"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">
                      {"Slim (\u043e\u0431\u043b\u044f\u0433\u0430\u044e\u0447\u0430)"}
                    </SelectItem>
                    <SelectItem value="regular">
                      {"Regular (\u0437\u0432\u0438\u0447\u0430\u0439\u043d\u0430)"}
                    </SelectItem>
                    <SelectItem value="oversize">
                      {"Oversize (\u0432\u0456\u043b\u044c\u043d\u0430)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adv-brand">{"\u0411\u0440\u0435\u043d\u0434"}</Label>
                <Input
                  id="adv-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  maxLength={50}
                />
              </div>

              <Button
                onClick={handleAdvSubmit}
                disabled={advLoading || !advHeight || !advGender || !advCategory}
                className="w-full"
                size="lg"
              >
                {advLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {"\u0410\u043d\u0430\u043b\u0456\u0437\u0443\u0454\u043c\u043e..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    {"\u041e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044e"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {advResult && <AiResultCard result={advResult} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
