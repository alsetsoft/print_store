# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin panel for a print-on-demand business. Manages bases (blank products like t-shirts/mugs), print designs, combined products, product groups, orders, and a visual print placement designer. All UI is in Ukrainian.

Bootstrapped with v0.app and linked for continuous development. Every merge to `main` auto-deploys.

## Commands

- `npm run dev` — start dev server at localhost:3000
- `npm run build` — production build (TypeScript errors are ignored via config)
- `npm run lint` — ESLint
- No test framework is configured

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript (strict mode)
- **Supabase** (PostgreSQL) via `@supabase/ssr` — browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts`
- **shadcn/ui** (New York style, RSC-enabled) + Radix UI + Tailwind CSS v4
- **react-hook-form** + **Zod** for forms/validation
- **Recharts** for charts, **Sonner** for toasts, **Lucide** for icons

## Architecture

### Routing

- **Admin** (`app/admin/`): dashboard, products, prints, bases, groups, parameters, orders, designer, generate. Each route folder typically has `page.tsx` (client component) and `actions.ts` (server actions for mutations).
- **Store** (`app/(store)/`): public-facing pages at `/`, `/catalog`, etc. Uses SSR server components for SEO. Store components live in `components/store/`.

### Data Flow

- **Admin pages** are client components (`"use client"`) that fetch data via Supabase browser client
- **Store pages** are server components (SSR) that fetch data via Supabase server client for SEO. Client interactivity (filters, pagination) uses URL search params to trigger server re-renders.
- **Server actions** (`"use server"` in `actions.ts` files) handle mutations using the server Supabase client
- Always create a new Supabase server client per function call — never store in a global variable

### Components

- `components/ui/` — shadcn/ui primitives (don't edit manually, use `npx shadcn@latest add`)
- `components/admin/` — admin domain components (sidebar, modals, forms, cards)
- `components/store/` — public store components (header, footer, catalog menu, product card)

### Database

Schema is defined in SQL migrations under `scripts/`. Schema can also be inspected and modified via the Supabase MCP server tools (`mcp__supabase__list_tables`, `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`, etc.). Prefer MCP tools for querying live schema and running migrations.

Key tables: `bases`, `print_designs`, `products`, `base_colors`, `base_sizes`, `base_images`, `image_zones`, `product_print_placements`, `groups`, `product_groups`, `categories/subcategories` (both base_ and print_ prefixed).

### Localization

All UI strings use Ukrainian via `lib/translations.ts` (`UA` object). Strings are encoded as Unicode escapes (`\uXXXX`) to prevent SSR byte corruption. Always use this pattern for new UI text.

### Path Aliases

`@/*` maps to the project root (e.g., `@/components/ui/button`, `@/lib/utils`).

## Workflow Rules

- **Never commit changes automatically.** Always wait for the user to explicitly request a commit.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (for direct DB migrations):
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
