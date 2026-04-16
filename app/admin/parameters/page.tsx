"use client"

import { ParametersHeader } from "@/components/admin/parameters/parameters-header"
import { ParametersTabs } from "@/components/admin/parameters/parameters-tabs"

export default function ParametersPage() {
  return (
    <div className="p-6 lg:p-8">
      <ParametersHeader />
      <ParametersTabs />
    </div>
  )
}
