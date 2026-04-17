# Carnitas Don Nico

Mobile-first PWA for ordering carnitas by the pound from Don Nico's Saturday pop-up. Customers browse the menu, pick a pickup window, and check out as guest or signed-in; Don Nico runs the kitchen, inventory, and P&L from the admin panel.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **UI:** React 19 + Tailwind CSS v3 + shadcn/ui + Radix primitives + Lucide icons
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **Payments:** Stripe (deposits + full payment)
- **Messaging:** Resend (email) + Twilio (SMS) + Web Push (PWA)
- **i18n:** i18next + react-i18next (Spanish default, English fallback)
- **Auth:** Supabase email/password + passkeys (@simplewebauthn)
- **PWA:** next-pwa (service worker, offline shell, installable)
- **Data fetching (client):** @tanstack/react-query
- **Forms:** react-hook-form + zod
- **Money math:** decimal.js

## Local Dev Setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

### Required env vars (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_APP_URL`

Optional for full feature set: Stripe, Resend, Twilio, Anthropic (receipt OCR), Web Push VAPID keys.

> WARNING: `.env.local` contains secrets and is gitignored. Never commit it.

## Folder Structure

```
app/                      Next.js App Router
  _landing/               Landing page sub-components (client)
  (customer)/             Customer-facing routes         [round 2]
  admin/                  Admin panel routes             [round 2]
  api/                    Route handlers                 [round 2]
  layout.tsx, page.tsx, globals.css
components/
  ui/                     shadcn components              [other agent]
  brand/                  Logo                           [other agent]
  layout/                 Header, Footer, MobileNav      [other agent]
  common/                 ThemeProvider, LanguageToggle  [other agent]
lib/
  supabase/               client, server, middleware helpers
  i18n/                   config, client init, React provider
  utils.ts                cn() + misc                    [other agent]
messages/                 en.json, es.json translations
types/database.ts         Hand-written Supabase DB types
supabase/migrations/      SQL migrations (0001_initial_schema.sql already deployed)
public/                   Static assets (brand/, manifest)
middleware.ts             Auth session refresh + route guards
```

## Key Commands

| Command              | What it does                     |
| -------------------- | -------------------------------- |
| `npm run dev`        | Dev server (PWA disabled)        |
| `npm run build`      | Production build (PWA enabled)   |
| `npm run start`      | Serve production build           |
| `npm run lint`       | ESLint                           |
| `npm run typecheck`  | TypeScript, no emit              |
| `npm run format`     | Prettier across codebase         |

## Supabase

The initial schema is in `supabase/migrations/0001_initial_schema.sql` and is already deployed to the project. RLS policies, enums, and seed data (menu items + carnitas variants) all live in that file. Regenerate types with the Supabase CLI later if you prefer generated types over the hand-written ones in `types/database.ts`.

## Deployment

- **Vercel:** push to `main`, connect the repo. All env vars go in Vercel project settings. `next-pwa` auto-generates the service worker at build time.
- **Supabase:** already hosted at `irujlajfyhjyenbcsfyd.supabase.co`.

## Voice & Design

See `_planning/DESIGN_SYSTEM.md` for the full voice guide, type scale, and motion rules. The brand palette in this codebase overrides the design system's "terracotta" direction with the **forest green + gold** pulled from the actual Don Nico logo.

---

*Hecho con cariño por la casa Don Nico.*
