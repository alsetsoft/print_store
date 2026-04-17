import type { Metadata } from "next"
import Link from "next/link"
import { Home, ImageIcon, LayoutGrid, Shirt, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e",
  description:
    "\u041c\u043e\u0436\u043b\u0438\u0432\u043e, \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0437\u0430\u0441\u0442\u0430\u0440\u0456\u043b\u043e \u0430\u0431\u043e \u0430\u0434\u0440\u0435\u0441\u0430 \u0432\u043a\u0430\u0437\u0430\u043d\u0430 \u0437 \u043f\u043e\u043c\u0438\u043b\u043a\u043e\u044e.",
  robots: { index: false, follow: false },
}

const QUICK_LINKS = [
  {
    href: "/catalog",
    label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433",
    icon: LayoutGrid,
  },
  {
    href: "/prints",
    label: "\u041f\u0440\u0438\u043d\u0442\u0438",
    icon: ImageIcon,
  },
  {
    href: "/bases",
    label: "\u041e\u0441\u043d\u043e\u0432\u0438",
    icon: Shirt,
  },
  {
    href: "/create",
    label: "\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440",
    icon: Wand2,
  },
] as const

export default function NotFound() {
  return (
    <main className="store-theme relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-primary/15 blur-3xl"
          />
          <span className="font-heading text-[7.5rem] font-bold leading-none tracking-tight text-primary md:text-[10rem]">
            404
          </span>
        </div>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {"\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
          {
            "\u041c\u043e\u0436\u043b\u0438\u0432\u043e, \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0437\u0430\u0441\u0442\u0430\u0440\u0456\u043b\u043e \u0430\u0431\u043e \u0430\u0434\u0440\u0435\u0441\u0430 \u0432\u043a\u0430\u0437\u0430\u043d\u0430 \u0437 \u043f\u043e\u043c\u0438\u043b\u043a\u043e\u044e. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044c \u043d\u0430 \u0433\u043e\u043b\u043e\u0432\u043d\u0443 \u0430\u0431\u043e \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433."
          }
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="size-4" />
              {"\u041d\u0430 \u0433\u043e\u043b\u043e\u0432\u043d\u0443"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/catalog">
              <LayoutGrid className="size-4" />
              {"\u0414\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}
            </Link>
          </Button>
        </div>

        <div className="mt-14 w-full">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {"\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u0456 \u0440\u043e\u0437\u0434\u0456\u043b\u0438"}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground outline-none transition-all hover:border-primary/40 hover:shadow-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
