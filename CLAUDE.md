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
