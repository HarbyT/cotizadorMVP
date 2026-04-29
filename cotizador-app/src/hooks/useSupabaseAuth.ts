import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import { remoteSyncEnabled } from '../lib/env';

interface SignInResult {
  ok: boolean;
  error?: string;
}

export function useSupabaseAuth() {
  const client = getSupabaseClient();
  const requiresAuth = useMemo(() => remoteSyncEnabled && client !== null, [client]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!requiresAuth || !client) {
      setSession(null);
      setIsLoadingSession(false);
      return;
    }

    let mounted = true;
    setIsLoadingSession(true);

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session ?? null);
      setIsLoadingSession(false);
    });

    const { data: authSubscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [client, requiresAuth]);

  const signInWithPassword = async (email: string, password: string): Promise<SignInResult> => {
    if (!client) {
      return { ok: false, error: 'Supabase no esta configurado en este ambiente.' };
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthError(error.message);
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible iniciar sesion.';
      setAuthError(message);
      return { ok: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    if (!client) {
      return;
    }

    await client.auth.signOut();
  };

  return {
    requiresAuth,
    session,
    isAuthenticated: Boolean(session),
    isLoadingSession,
    isSubmitting,
    authError,
    signInWithPassword,
    signOut,
  };
}