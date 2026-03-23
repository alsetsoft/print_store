import { Fragment } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type BreadcrumbSegment = {
  label: string
  href?: string
}

export function StoreBreadcrumb({ items }: { items: BreadcrumbSegment[] }) {
  const all: BreadcrumbSegment[] = [
    { label: "\u0413\u043e\u043b\u043e\u0432\u043d\u0430", href: "/" },
    ...items,
  ]

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {all.map((item, i) => {
          const isLast = i === all.length - 1
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href!}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
