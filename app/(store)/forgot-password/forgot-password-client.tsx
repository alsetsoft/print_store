"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/settings`,
    })
    if (error) {
      toast.error("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043a\u0438 \u043b\u0438\u0441\u0442\u0430")
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full space-y-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043f\u043e\u0448\u0442\u0443"}</h1>
        <p className="text-sm text-muted-foreground">
          {"\u041c\u0438 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u043b\u0438 \u043b\u0438\u0441\u0442 \u0437 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c \u0434\u043b\u044f \u0432\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043f\u0430\u0440\u043e\u043b\u044e \u043d\u0430 "}{email}
        </p>
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          {"\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044f \u0434\u043e \u0432\u0445\u043e\u0434\u0443"}
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{"\u0412\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043f\u0430\u0440\u043e\u043b\u044e"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {"\u0412\u043a\u0430\u0436\u0456\u0442\u044c email \u0434\u043b\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u043d\u043d\u044f \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {"\u041d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {"\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044f \u0434\u043e \u0432\u0445\u043e\u0434\u0443"}
        </Link>
      </p>
    </div>
  )
}
