# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run tests once (Vitest)
npm run test:watch # Run tests in watch mode
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.tsx
```

## Architecture

### Frontend (React + Vite)

All source lives in `src/`. The app is a single-page React app with client-side routing via React Router.

**Request flow:**
1. `src/main.tsx` bootstraps the app
2. `src/App.tsx` sets up providers (QueryClient, Tooltip, Auth, Router) and defines all routes
3. `ProtectedRoute` in `App.tsx` guards authenticated pages — redirects to `/auth` if no user session
4. Authenticated pages use `AppLayout.tsx` as a sidebar wrapper

**Auth pattern:** `src/hooks/useAuth.tsx` exposes `AuthProvider` (wraps the whole app) and `useAuth()` hook. The hook provides `{ user, session, loading, signOut }`. Auth state is driven by `supabase.auth.onAuthStateChange`.

**Data fetching:** TanStack Query (`@tanstack/react-query`) is the standard for server state. Direct Supabase client calls are made inside query functions.

**Path alias:** `@/` resolves to `src/`.

### Backend (Supabase)

- **Database:** PostgreSQL with 3 tables: `profiles`, `closet_items`, `style_photos`. All have RLS enabled — every policy gates on `auth.uid() = user_id`.
- **Storage:** Two public buckets: `style-photos` and `closet-items`. Files are stored at `{userId}/{uuid}.{ext}` — the folder name enforces ownership in storage policies.
- **Edge Functions:** Deno-based, lives in `supabase/functions/`. Only one function: `style-ai`.

### AI Edge Function (`supabase/functions/style-ai/`)

The function accepts a `type` field and dispatches to one of three modes:
- `daily-outfit` — generates an outfit from the user's closet items + weather
- `shopping` — recommends 6 items to buy based on style gaps
- `analyze-photo` — vision analysis of an uploaded photo URL

It calls the **Lovable AI Gateway** (`ai.gateway.lovable.dev`) using model `google/gemini-3-flash-preview` with `response_format: { type: "json_object" }`. The `LOVABLE_API_KEY` env var must be set in Supabase secrets.

Request shape to the edge function:
```typescript
{
  type: "daily-outfit" | "shopping" | "analyze-photo",
  profile: { name, location, occupation, styles[], budget, age },
  closetItems: { name, category, color, season }[],
  weather?: { temp, condition, high, low, wind },
  stylePhotos?: [image_url]  // only for analyze-photo
}
```

### Styling & Design System

Tailwind with a custom luxury fashion palette defined in `tailwind.config.ts`:
- Colors: `gold`, `cream`, `espresso`, `warm-gray`
- Fonts: Playfair Display (display headings), Inter (body)
- Dark mode: class-based (`dark:` prefix)

UI primitives are shadcn-ui components in `src/components/ui/` — edit these directly if you need to customize component behavior.

### Database Schema (key relationships)

```
auth.users (Supabase managed)
  └── profiles (one-to-one via user_id)
  └── closet_items (one-to-many via user_id)
  └── style_photos (one-to-many via user_id, ai_analysis stored as JSONB)
```

Schema migrations live in `supabase/migrations/`. To add new schema, create a new `.sql` file there and run via Supabase CLI or dashboard.

### Supabase Client

`src/integrations/supabase/client.ts` — singleton client used everywhere. `src/integrations/supabase/types.ts` — auto-generated types (don't edit manually; regenerate with `supabase gen types typescript`).
