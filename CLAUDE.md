# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Print-on-demand store with an admin panel and a public storefront. Manages bases (blank products like t-shirts/mugs), print designs, combined products, product groups, orders, a visual print placement designer, and a customer-facing product constructor. All UI is in Ukrainian.

Bootstrapped with v0.app and linked for continuous development. Every merge to `main` auto-deploys.

## Commands

- `npm run dev` — start dev server at localhost:3000
- `npm run build` — production build (TypeScript errors are ignored via config)
- `npm run lint` — ESLint
- No test framework is configured

## Tech Stack

- **Next.js 16.1** (App Router) with React 19, TypeScript (strict mode)
- **Supabase** (PostgreSQL) via `@supabase/ssr` — browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts`, middleware client in `lib/supabase/middleware.ts`
- **shadcn/ui** (New York style, RSC-enabled) + Radix UI + Tailwind CSS v4
- **react-hook-form** + **Zod** for forms/validation
- **Recharts** for charts, **Sonner** for toasts, **Lucide** for icons
- **LiqPay** (`lib/liqpay.ts`) for payment processing
- **Nova Poshta API** (`lib/nova-poshta.ts`) for delivery/shipping (region, city, warehouse selection)

## Architecture

### Routing

- **Admin** (`app/admin/`): dashboard, products, prints, bases, groups, parameters, orders, designer, generate, login. Each route folder typically has `page.tsx` (client component) and `actions.ts` (server actions for mutations). Auth-protected via `middleware.ts` (redirects unauthenticated users to `/admin/login`).
- **Store** (`app/(store)/`): public-facing pages — home (`/`), catalog (`/catalog`), bases (`/bases`), prints (`/prints`), product constructor (`/create`), cart (`/cart`), checkout (`/checkout`), order success (`/order-success`). Dynamic routes: `/base/[id]`, `/print/[id]`, `/product/[id]`, `/group/[id]`. Uses SSR server components for SEO.
- **API routes** (`app/api/`): `liqpay-callback` (payment webhook), `migrate-zones` (data migration utility).

### Data Flow

- **Admin pages** are client components (`"use client"`) that fetch data via Supabase browser client
- **Store pages** are server components (SSR) that fetch data via Supabase server client for SEO. Client interactivity (filters, pagination) uses URL search params to trigger server re-renders. Heavy client logic is split into `*-client.tsx` companion files.
- **Server actions** (`"use server"` in `actions.ts` files) handle mutations using the server Supabase client
- Always create a new Supabase server client per function call — never store in a global variable
- **Cart state** is managed via React context (`lib/cart-context.tsx`) with localStorage persistence

### Components

- `components/ui/` — shadcn/ui primitives (don't edit manually, use `npx shadcn@latest add`)
- `components/admin/` — admin domain components (sidebar, modals, forms, cards, product constructor modal). Subdirectories: `bases/`, `parameters/`, `prints/`, `products/`.
- `components/store/` — public store components (header, footer, catalog menu/sidebar, product card, cart drawer, breadcrumb, mobile menu)

### Hooks

- `hooks/use-mobile.ts` — mobile viewport detection
- `hooks/use-toast.ts` — toast notification hook

### Database

Schema is defined in SQL migrations under `scripts/` (numbered `001_` through `007_` plus additional feature migrations). Schema can also be inspected and modified via the Supabase MCP server tools (`mcp__supabase__list_tables`, `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`, etc.). Prefer MCP tools for querying live schema and running migrations.

Key tables: `bases`, `print_designs`, `products`, `base_colors`, `base_sizes`, `base_images`, `image_zones`, `product_print_placements`, `groups`, `product_groups`, `categories/subcategories` (both base_ and print_ prefixed).

### Localization

All UI strings use Ukrainian via `lib/translations.ts` (`UA` object). Strings are encoded as Unicode escapes (`\uXXXX`) to prevent SSR byte corruption. Always use this pattern for new UI text.

### Path Aliases

`@/*` maps to the project root (e.g., `@/components/ui/button`, `@/lib/utils`).

## Глоссарий (русский → код)

Когда пользователь пишет промпты на русском, используй эту таблицу для сопоставления терминов с сущностями в коде.

| Русский | English (код) | Описание |
|---|---|---|
| Основа | Base (`bases`) | Заготовка — чистый товар без принта (футболка, чашка, худи и т.д.) |
| Принт / Дизайн | Print Design (`print_designs`) | Изображение/рисунок, который наносится на основу |
| Товар / Продукт | Product (`products`) | Готовый товар = основа + принт(ы) с размещением |
| Группа | Group (`groups`) | Группа товаров, объединённых общей темой |
| Цвет основы | Base Color (`base_colors`) | Вариант цвета конкретной основы |
| Размер основы | Base Size (`base_sizes`) | Вариант размера конкретной основы |
| Изображение основы | Base Image (`base_images`) | Фото основы (мокап) для отображения |
| Зона печати | Image Zone (`image_zones`) | Область на изображении основы, куда можно разместить принт |
| Размещение принта | Print Placement (`product_print_placements`) | Привязка принта к конкретной зоне на товаре |
| Категория основ | Base Category (`base_categories`) | Категория для классификации основ |
| Категория принтов | Print Category (`print_categories`) | Категория для классификации принтов |
| Подкатегория | Subcategory (`base_subcategories`, `print_subcategories`) | Подкатегория внутри категории |
| Параметры | Parameters (`app/admin/parameters/`) | Управление категориями и подкатегориями в админке |
| Конструктор | Constructor (`/create`, `constructor-client.tsx`) | Страница, где покупатель сам собирает товар (выбирает основу + принт) |
| Дизайнер | Designer (`app/admin/designer/`) | Визуальный редактор размещения принтов в админке |
| Корзина | Cart (`lib/cart-context.tsx`, `/cart`) | Корзина покупок |
| Оформление заказа | Checkout (`/checkout`) | Страница оформления заказа |
| Заказ | Order (`orders`) | Заказ покупателя |
| Каталог | Catalog (`/catalog`) | Страница каталога товаров |
| Новая Почта | Nova Poshta (`lib/nova-poshta.ts`) | Служба доставки (выбор области, города, отделения) |

## UX & Design Guidelines

These rules apply to every new screen, component, or redesign. Follow them unless the user explicitly overrides.

### Design tokens (single source of truth)

All colors, radii, and surface styles come from CSS variables defined in `app/globals.css`. There are three token sets: `:root` (default/shadcn), `.admin-theme` (admin panel), `.store-theme` (public storefront). Admin routes wrap in `admin-theme`; store routes wrap in `store-theme`.

- **Never hardcode colors.** Use Tailwind token classes: `bg-background`, `bg-card`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `text-destructive`. Forbidden: `bg-[#10B981]`, `text-green-500`, `border-gray-200`, inline hex, arbitrary-value colors.
- **Never hardcode radii or spacing scale.** Use `rounded-sm|md|lg|xl` (mapped from `--radius`) and the default Tailwind spacing scale (`p-2`, `gap-4`, etc.). Forbidden: `rounded-[10px]`, `p-[13px]`.
- **Theme-aware by default.** A new component must render correctly under both `.admin-theme` and `.store-theme`. If you need a new semantic color (e.g. `--warning`), add it to all three token sets in `globals.css` and to `@theme inline`, don't inline it.
- **Primary = brand green (#10B981).** Use `bg-primary`/`text-primary` for the main CTA and brand accents only. Don't use it for generic emphasis — that's what `font-semibold`/`text-foreground` are for.

### Component reuse (shadcn first)

`components/ui/` already ships 50+ primitives. Before writing custom markup, check what's there.

- **Reuse shadcn primitives.** Buttons → `Button`, inputs → `Input`/`Textarea`/`Select`, dialogs → `Dialog`/`AlertDialog`/`Sheet`, menus → `DropdownMenu`, tooltips → `Tooltip`, tabs → `Tabs`, tables → `Table`, cards → `Card`. Forbidden: raw `<button className="...">`, `<input className="...">`, custom modals built from scratch.
- **Add new primitives via the CLI only.** `npx shadcn@latest add <name>`. Don't hand-edit files in `components/ui/` unless fixing a clear bug.
- **Domain components live outside `ui/`.** Admin widgets → `components/admin/<domain>/`, store widgets → `components/store/`. Compose from `ui/` primitives, don't reinvent them.
- **Icons: Lucide only.** Default size `size-4` (inline with text) or `size-5` (standalone). Forbidden: mixing icon libraries, inline SVG for iconography.
- **Destructive confirms use `AlertDialog`.** See `components/admin/delete-confirm-dialog.tsx` as the reference pattern — never use `window.confirm`.

### Required UI states

Every screen that fetches, submits, or renders a list must handle these states explicitly. No bare spinners floating on a blank page.

- **Loading.** Use `Skeleton` (`components/ui/skeleton.tsx`) to mirror the final layout for data-driven views (cards, tables, lists). Use `Spinner` or `Loader2 className="animate-spin"` only for inline/button-level loading. Never show just a centered spinner on a full page — show skeletons.
- **Empty.** Use `Empty`/`EmptyHeader`/`EmptyMedia` (`components/ui/empty.tsx`) with a Lucide icon, a one-line Ukrainian headline, and, where applicable, a primary CTA to get the user unstuck (e.g. "Створити товар", "Очистити фільтри"). Empty ≠ error — phrasing should invite, not apologize.
- **Error.** For mutations, show `sonner` toast (`toast.error(...)`). For page-level load failures, render inline `Alert` variant `destructive` with a retry action when possible. Never swallow errors silently.
- **Success feedback.** Mutations confirm via `toast.success(...)` with a short Ukrainian message (≤ 40 chars). Don't also redirect + toast + modal — pick one affordance.
- **Pending mutations.** Disable the triggering control and show inline `Loader2 className="size-4 animate-spin"` inside it. The button keeps its width (don't let it collapse). Prevent double-submit.

### Forms

All forms use `react-hook-form` + `zod` + shadcn `Form`/`FormField`/`FormMessage` (see `app/(store)/checkout/checkout-client.tsx` for the canonical pattern).

- **Validation messages in Ukrainian** inside the zod schema, encoded as `\uXXXX`.
- **Submit button:** disabled while `isSubmitting`, shows `Loader2` + loading label ("Зберігаємо…"), returns to normal on success/error.
- **Inline errors under fields** via `FormMessage`. Don't rely on toasts alone for validation.
- **Autocomplete/autofocus:** first interactive field gets `autoFocus` on modals; all personal-data fields get correct `autoComplete` attributes.

### Interaction, motion & feedback

- **Every interactive element has hover + `focus-visible` + active + disabled states.** shadcn primitives give this for free — don't override it away.
- **Touch targets ≥ 40px.** Use `size-10` / `h-10` on icon-only buttons. Phone-first: if it doesn't work at 375px width, it's not done.
- **Transitions ≤ 200ms ease-out** for state changes, ≤ 300ms for enter/exit (dialogs, sheets). Never animate layout-shifting properties on hover for frequent elements (cards, rows).
- **No layout shift on data load.** Reserve space with skeletons of the same dimensions as the loaded content.
- **Sticky bottom actions on mobile** use `pb-safe` (already defined in `globals.css`) to respect notched devices.

### Accessibility

- **Icon-only buttons require `aria-label`** in Ukrainian.
- **All form fields have a visible `Label`** associated via `htmlFor` / shadcn `FormLabel`.
- **Disabled controls use the `disabled` attribute**, not just `opacity-50`. Respect `prefers-reduced-motion` — Tailwind's `motion-safe:` / `motion-reduce:` prefixes where animations are non-essential.
- **Color is never the only signal.** Pair destructive red with an icon/text, pair success green with a checkmark/label.

### Density & hierarchy

- **Admin = compact.** Default body `text-sm`, cards `p-4`, table rows tight. Users are power users scanning lots of rows.
- **Store = airy.** Default body `text-base`, generous whitespace, larger CTAs. Users are browsing, not processing.
- **Typography scale only.** `text-xs` (meta), `text-sm` (body/admin), `text-base` (store body), `text-lg` (section titles), `text-xl`–`text-3xl` (page titles/hero). Weights: `font-medium` (UI), `font-semibold` (headings), `font-bold` (brand/hero only).

### Localization reminder

All user-facing strings in Ukrainian, encoded as `\uXXXX` escapes (see existing `lib/translations.ts` and component files). No English fallback strings in UI. No inline Latin text except brand names, product codes, or currency codes.

## Workflow Rules

- **Never commit changes automatically.** Always wait for the user to explicitly request a commit.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Payment (LiqPay):
- `LIQPAY_PUBLIC_KEY`
- `LIQPAY_PRIVATE_KEY`

Shipping (Nova Poshta):
- `NOVA_POSHTA_API_KEY`

Optional (for direct DB migrations):
- `POSTGRES_URL`
