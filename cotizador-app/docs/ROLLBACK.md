# Rollback Guide

## Vercel rollback
1. Open project deployment history.
2. Select last healthy deployment.
3. Click `Redeploy`.

## Database rollback
1. Pause writes if needed.
2. Restore latest backup in Supabase.
3. Re-run smoke tests.

## Smoke tests after rollback
- Dashboard loads.
- Create quote and save.
- Export PDF.
- Validate same total in UI, quote record and PDF.