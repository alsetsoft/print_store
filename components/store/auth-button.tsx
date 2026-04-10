"use client"

import Link from "next/link"
import { User, LogOut, Package, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AuthButton() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex size-9 items-center justify-center rounded-md border">
        <User className="size-4 text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex size-9 items-center justify-center rounded-md border transition-colors hover:bg-accent"
      >
        <User className="size-4" />
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex size-9 items-center justify-center rounded-md border bg-primary/10 text-primary transition-colors hover:bg-primary/20">
          <User className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2">
            <User className="size-4" />
            {"\u041a\u0430\u0431\u0456\u043d\u0435\u0442"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders" className="flex items-center gap-2">
            <Package className="size-4" />
            {"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            {"\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 text-destructive">
          <LogOut className="size-4" />
          {"\u0412\u0438\u0439\u0442\u0438"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
