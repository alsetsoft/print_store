import type { Metadata } from "next"
import { RegisterClient } from "./register-client"

export const metadata: Metadata = {
  title: "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f",
}

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <RegisterClient />
    </div>
  )
}
