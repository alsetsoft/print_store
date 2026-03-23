"use client"

import dynamic from "next/dynamic"

// Force client-only rendering to avoid SSR hydration issues with Ukrainian text
const OrdersContent = dynamic(() => import("./_orders-content"), { ssr: false })

export default function OrdersPage() {
  return <OrdersContent />
}
