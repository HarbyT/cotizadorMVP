const FALLBACK_ENV = 'local';

export const appEnv = import.meta.env.VITE_APP_ENV ?? FALLBACK_ENV;
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const sentryDsn = import.meta.env.VITE_SENTRY_DSN ?? '';

export const remoteSyncEnabled =
  (import.meta.env.VITE_ENABLE_REMOTE_SYNC ?? 'true').toLowerCase() !== 'false';

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.trim().length > 0 && supabaseAnonKey.trim().length > 0;
}