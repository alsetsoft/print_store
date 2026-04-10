"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Phone } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RegisterClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Email tab
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  // Phone tab
  const [phoneFullName, setPhoneFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")

  const supabase = createClient()

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("\u041f\u0430\u0440\u043e\u043b\u0456 \u043d\u0435 \u0441\u043f\u0456\u0432\u043f\u0430\u0434\u0430\u044e\u0442\u044c")
      return
    }
    if (password.length < 6) {
      toast.error("\u041f\u0430\u0440\u043e\u043b\u044c \u043c\u0430\u0454 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043c\u0456\u043d\u0456\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message.includes("already registered")
        ? "\u0426\u0435\u0439 email \u0432\u0436\u0435 \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u043e\u0432\u0430\u043d\u043e"
        : "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457")
      setLoading(false)
      return
    }
    setEmailSent(true)
    setLoading(false)
  }

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 10) {
      toast.error("\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { full_name: phoneFullName } },
    })
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

  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: "sms" })
    if (error) {
      toast.error("\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043a\u043e\u0434")
      setLoading(false)
      return
    }
    router.push("/account")
    router.refresh()
  }

  if (emailSent) {
    return (
      <div className="w-full space-y-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043f\u043e\u0448\u0442\u0443"}</h1>
        <p className="text-sm text-muted-foreground">
          {"\u041c\u0438 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u043b\u0438 \u043b\u0438\u0441\u0442 \u043d\u0430 "}{email}{". \u041f\u0435\u0440\u0435\u0439\u0434\u0456\u0442\u044c \u0437\u0430 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c \u0434\u043b\u044f \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f."}
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
        <h1 className="text-2xl font-bold tracking-tight">{"\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {"\u0421\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u0430\u043a\u0430\u0443\u043d\u0442 \u0434\u043b\u044f \u0437\u0440\u0443\u0447\u043d\u0438\u0445 \u043f\u043e\u043a\u0443\u043f\u043e\u043a"}
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
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div>
              <Label htmlFor="reg-name">{"\u0406\u043c'\u044f \u0442\u0430 \u043f\u0440\u0456\u0437\u0432\u0438\u0449\u0435"}</Label>
              <Input
                id="reg-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={"\u0406\u0432\u0430\u043d \u0406\u0432\u0430\u043d\u0435\u043d\u043a\u043e"}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reg-password">{"\u041f\u0430\u0440\u043e\u043b\u044c"}</Label>
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={"\u041c\u0456\u043d\u0456\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432"}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reg-confirm">{"\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c"}</Label>
              <Input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {"\u0417\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438\u0441\u044f"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          {!otpSent ? (
            <form onSubmit={handlePhoneSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="reg-phone-name">{"\u0406\u043c'\u044f \u0442\u0430 \u043f\u0440\u0456\u0437\u0432\u0438\u0449\u0435"}</Label>
                <Input
                  id="reg-phone-name"
                  value={phoneFullName}
                  onChange={(e) => setPhoneFullName(e.target.value)}
                  placeholder={"\u0406\u0432\u0430\u043d \u0406\u0432\u0430\u043d\u0435\u043d\u043a\u043e"}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="reg-phone">{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"}</Label>
                <Input
                  id="reg-phone"
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
            <form onSubmit={handlePhoneVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="reg-otp">{"\u041a\u043e\u0434 \u0437 SMS"}</Label>
                <Input
                  id="reg-otp"
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
        {"\u0412\u0436\u0435 \u0454 \u0430\u043a\u0430\u0443\u043d\u0442? "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {"\u0423\u0432\u0456\u0439\u0442\u0438"}
        </Link>
      </p>
    </div>
  )
}
