# Manual de Despliegue - CotiHuellas (Vercel + Supabase)

## Stack objetivo
- Frontend: React + TypeScript + Vite
- Hosting: Vercel
- Datos/Auth/Auditoria: Supabase (Postgres + RLS)
- Observabilidad: Sentry + Vercel Analytics

## 1) Preparar proyecto
```bash
cd cotizador-app
npm install
npm run ci
```

## 2) Configurar Supabase por ambiente
Crea 3 proyectos Supabase:
- `cotizador-dev`
- `cotizador-staging`
- `cotizador-prod`

En cada proyecto:
1. Ejecuta la migracion SQL de `supabase/migrations/20260407_000001_initial_schema.sql`.
2. Crea usuarios internos y asigna rol en tabla `public.users` (`admin` o `seller`).
3. Verifica que RLS este activo en tablas de catalogos, cotizaciones y auditoria.

## 3) Configurar Vercel por ambiente
Crea 3 proyectos Vercel:
- `cotizador-dev` -> rama `develop`
- `cotizador-staging` -> rama `staging`
- `cotizador-prod` -> rama `main`

En cada proyecto configura:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Variables de entorno por proyecto:
- `VITE_APP_ENV` (`development`, `staging`, `production`)
- `VITE_ENABLE_REMOTE_SYNC=true`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`

## 4) Branching y CI/CD
Workflow de CI: `/.github/workflows/ci.yml`

Pipeline en cada push/PR:
1. `npm ci`
2. `npm run ci`

La app despliega por rama automaticamente con preview en PR.

## 5) Go-Live checklist
1. `npm run ci` en verde.
2. Pruebas UAT de flujo completo (crear item, multi-item, guardar, exportar PDF).
3. Verificar consistencia de total:
   - Panel lateral
   - Registro guardado
   - PDF exportado
4. Validar logs en Sentry y eventos en `audit_events`.
5. Publicar dominio custom + SSL en Vercel.

## 6) Rollback
- Vercel: usar "Redeploy previous deployment".
- Supabase: aplicar migracion de reversa o restore de backup diario.
- Confirmar salud con UAT rapido post-rollback.

## 7) Comandos utiles
```bash
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run ci
```