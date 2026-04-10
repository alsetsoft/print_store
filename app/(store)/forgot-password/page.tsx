import type { Metadata } from "next"
import { ForgotPasswordClient } from "./forgot-password-client"

export const metadata: Metadata = {
  title: "\u0412\u0456\u0434\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043f\u0430\u0440\u043e\u043b\u044e",
}

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <ForgotPasswordClient />
    </div>
  )
}
