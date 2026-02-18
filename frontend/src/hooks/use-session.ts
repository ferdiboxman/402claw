"use client";

import { useEffect, useState, useCallback } from "react";

type Session = {
  walletAddress: string;
  subject: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
  session: Session | null;
};

type UseSessionResult = {
  session: Session | null;
  walletAddress: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as SessionResponse;

      if (!payload.ok || !payload.authenticated || !payload.session) {
        setSession(null);
        setError("session_not_found");
        return;
      }

      setSession(payload.session);
      setError(null);
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : "session_load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    session,
    walletAddress: session?.walletAddress ?? null,
    loading,
    error,
    refetch: fetchSession,
  };
}
