import type { Metadata } from "next"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { UA } from "@/lib/translations"
import { SizeGuideClient } from "./size-guide-client"

export const metadata: Metadata = {
  title: "\u041f\u0456\u0434\u0431\u0456\u0440 \u0440\u043e\u0437\u043c\u0456\u0440\u0443 \u2014 \u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442",
  description:
    "AI-\u043f\u0456\u0434\u0431\u0456\u0440 \u0440\u043e\u0437\u043c\u0456\u0440\u0443 \u043e\u0434\u044f\u0433\u0443 \u0437\u0430 \u0432\u0430\u0448\u0438\u043c\u0438 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0430\u043c\u0438 \u0430\u0431\u043e \u0444\u043e\u0442\u043e.",
}

export default function SizeGuidePage() {
  const items: BreadcrumbSegment[] = [{ label: UA.store.sizeGuide }]
  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={items} />
      <SizeGuideClient />
    </div>
  )
}
