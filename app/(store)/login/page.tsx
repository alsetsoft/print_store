import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginClient } from "./login-client"

export const metadata: Metadata = {
  title: "\u0412\u0445\u0456\u0434",
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <Suspense>
        <LoginClient />
      </Suspense>
    </div>
  )
}
