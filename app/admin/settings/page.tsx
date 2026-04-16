"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, RotateCcw, Eye, EyeOff, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { getSettings, saveSetting, deleteSetting } from "./actions"

// Ukrainian strings as Unicode escapes
const T = {
  title: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
  subtitle: "\u0423\u043f\u0440\u0430\u0432\u043b\u0456\u043d\u043d\u044f API-\u043a\u043b\u044e\u0447\u0430\u043c\u0438",
  save: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438",
  reset: "\u0421\u043a\u0438\u043d\u0443\u0442\u0438",
  saved: "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e",
  deleted: "\u0421\u043a\u0438\u043d\u0443\u0442\u043e \u0434\u043e ENV",
  error: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430",
  db: "\u0411\u0414",
  env: "ENV",
  notSet: "\u041d\u0435 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
  newValue: "\u041d\u043e\u0432\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f",
  currentValue: "\u041f\u043e\u0442\u043e\u0447\u043d\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f:",
}

const LABELS: Record<string, string> = {
  LIQPAY_PUBLIC_KEY: "LiqPay Public Key",
  LIQPAY_PRIVATE_KEY: "LiqPay Private Key",
  NOVA_POSHTA_API_KEY: "Nova Poshta API Key",
  OPENAI_API_KEY: "OpenAI API Key",
}

const DESCRIPTIONS: Record<string, string> = {
  LIQPAY_PUBLIC_KEY: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0438\u0439 \u043a\u043b\u044e\u0447 \u0434\u043b\u044f \u043e\u043f\u043b\u0430\u0442\u0438 LiqPay",
  LIQPAY_PRIVATE_KEY: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u0438\u0439 \u043a\u043b\u044e\u0447 \u0434\u043b\u044f \u043e\u043f\u043b\u0430\u0442\u0438 LiqPay",
  NOVA_POSHTA_API_KEY: "API-\u043a\u043b\u044e\u0447 \u041d\u043e\u0432\u043e\u0457 \u041f\u043e\u0448\u0442\u0438",
  OPENAI_API_KEY: "API-\u043a\u043b\u044e\u0447 OpenAI \u0434\u043b\u044f \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u0457 \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u044c",
}

interface SettingInfo {
  key: string
  source: "db" | "env" | "none"
  maskedValue: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingInfo[]>([])
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadSettings()
  }, [])

  function loadSettings() {
    startTransition(async () => {
      const data = await getSettings()
      setSettings(data)
    })
  }

  function handleSave(key: string) {
    const value = newValues[key]
    if (!value?.trim()) return

    startTransition(async () => {
      try {
        await saveSetting(key as never, value)
        toast.success(T.saved)
        setNewValues((prev) => ({ ...prev, [key]: "" }))
        loadSettings()
      } catch {
        toast.error(T.error)
      }
    })
  }

  function handleReset(key: string) {
    startTransition(async () => {
      try {
        await deleteSetting(key as never)
        toast.success(T.deleted)
        loadSettings()
      } catch {
        toast.error(T.error)
      }
    })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" suppressHydrationWarning>
          {T.title}
        </h1>
        <p className="mt-1 text-muted-foreground" suppressHydrationWarning>
          {T.subtitle}
        </p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        {settings.map((setting) => (
          <Card key={setting.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{LABELS[setting.key]}</CardTitle>
                </div>
                <Badge
                  variant={setting.source === "db" ? "default" : setting.source === "env" ? "secondary" : "outline"}
                  suppressHydrationWarning
                >
                  {setting.source === "db" ? T.db : setting.source === "env" ? T.env : T.notSet}
                </Badge>
              </div>
              <CardDescription suppressHydrationWarning>{DESCRIPTIONS[setting.key]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {setting.maskedValue && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span suppressHydrationWarning>{T.currentValue}</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                    {showValues[setting.key] ? setting.maskedValue : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowValues((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                  >
                    {showValues[setting.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={T.newValue}
                  value={newValues[setting.key] ?? ""}
                  onChange={(e) => setNewValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                  suppressHydrationWarning
                />
                <Button
                  onClick={() => handleSave(setting.key)}
                  disabled={isPending || !newValues[setting.key]?.trim()}
                  size="sm"
                >
                  <Save className="mr-1 h-4 w-4" />
                  <span suppressHydrationWarning>{T.save}</span>
                </Button>
                {setting.source === "db" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(setting.key)}
                    disabled={isPending}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    <span suppressHydrationWarning>{T.reset}</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
