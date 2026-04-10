"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Mail, Phone } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/account"

  const [loading, setLoading] = useState(false)

  // Email tab
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Phone tab
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error("\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 email \u0430\u0431\u043e \u043f\u0430\u0440\u043e\u043b\u044c")
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 10) {
      toast.error("\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) {
      toast.error(error.message.includes("not enabled")
        ? "SMS-\u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0456\u044f \u0449\u0435 \u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u0430"
        : "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043a\u0438 SMS")
      setLoading(false)
      return
    }
    setOtpSent(true)
    toast.success("SMS-\u043a\u043e\u0434 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e")
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: "sms" })
    if (error) {
      toast.error("\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043a\u043e\u0434")
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{"\u0412\u0445\u0456\u0434"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {"\u0412\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0443 \u0441\u0432\u0456\u0439 \u0430\u043a\u0430\u0443\u043d\u0442"}
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-1.5">
            <Mail className="size-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="login-password">{"\u041f\u0430\u0440\u043e\u043b\u044c"}</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {"\u0417\u0430\u0431\u0443\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c?"}
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {"\u0423\u0432\u0456\u0439\u0442\u0438"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="login-phone">{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"}</Label>
                <Input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380XXXXXXXXX"
                  required
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {"\u041e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u043a\u043e\u0434"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="login-otp">{"\u041a\u043e\u0434 \u0437 SMS"}</Label>
                <Input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {"\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438"}
              </Button>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtpCode("") }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {"\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u043d\u043e\u043c\u0435\u0440"}
              </button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        {"\u041d\u0435\u043c\u0430\u0454 \u0430\u043a\u0430\u0443\u043d\u0442\u0443? "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {"\u0417\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438\u0441\u044f"}
        </Link>
      </p>
    </div>
  )
}
