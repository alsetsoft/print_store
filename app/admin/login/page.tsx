"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Settings } from "lucide-react"

// Ukrainian strings as Unicode escapes
const T = {
  title:       "\u0412\u0445\u0456\u0434 \u0432 \u0430\u0434\u043c\u0456\u043d\u002d\u043f\u0430\u043d\u0435\u043b\u044c",
  email:       "\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430 \u043f\u043e\u0448\u0442\u0430",
  password:    "\u041f\u0430\u0440\u043e\u043b\u044c",
  subtitle:    "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0434\u0430\u043d\u0456 \u0434\u043b\u044f \u0432\u0445\u043e\u0434\u0443",
  login:       "\u0423\u0432\u0456\u0439\u0442\u0438",
  logging:     "\u0412\u0445\u0456\u0434...",
  error:       "\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 email \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c",
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(T.error)
      setLoading(false)
      return
    }

    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <Settings className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl" suppressHydrationWarning>
            {T.title}
          </CardTitle>
          <CardDescription suppressHydrationWarning>
            {T.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription suppressHydrationWarning>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" suppressHydrationWarning>{T.email}</Label>
              <Input
                id="email"
                type="email"
                className="rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" suppressHydrationWarning>{T.password}</Label>
              <Input
                id="password"
                type="password"
                className="rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={loading} suppressHydrationWarning>
              {loading ? T.logging : T.login}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
