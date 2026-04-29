# CotiHuellas - Cotizador Cloud (Vite + React + Supabase)

Aplicacion interna para cotizacion comercial con:
- Frontend en React + TypeScript + Vite
- Persistencia local (Zustand) + sincronizacion cloud (Supabase)
- Exportacion PDF formal
- Motor unico de costos (`quoteEngine`) para UI + PDF + guardado

## Requisitos
- Node.js 20+
- npm 10+

## Ejecutar local
```bash
npm install
npm run dev
```

## Calidad
```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run ci
```

## Variables de entorno
Crea `.env.local` usando `.env.example`.

Variables principales:
- `VITE_APP_ENV` (`development`, `staging`, `production`)
- `VITE_ENABLE_REMOTE_SYNC` (`true` o `false`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`

Si no defines Supabase, la app funciona en modo localStorage.

## Arquitectura
- `src/domain/quoteEngine.ts`: calculo central de costos y margen.
- `src/domain/quoteItems.ts`: composicion de items (incluye item borrador).
- `src/repositories/supabaseRepository.ts`: repositorio cloud para catalogos y cotizaciones.
- `src/hooks/useRemoteBootstrap.ts`: hidratacion inicial desde Supabase.

## Despliegue (Vercel)
- Config en `vercel.json` (SPA rewrite a `index.html`).
- Build command: `npm run build`.
- Output: `dist`.

## Supabase
- Migraciones SQL en `supabase/migrations`.
- Config local en `supabase/config.toml`.

## CI
Workflow en `/.github/workflows/ci.yml`:
- `npm ci`
- `npm run ci` (lint + typecheck + tests + build)