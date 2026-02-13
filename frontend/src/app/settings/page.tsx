"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
  session: {
    walletAddress: string;
    subject: string;
    issuedAt: number;
    expiresAt: number;
  } | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("-");
  const [expiresAt, setExpiresAt] = useState<string>("-");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const payload = (await response.json()) as SessionResponse;
        if (cancelled) return;

        if (!payload.ok || !payload.authenticated || !payload.session) {
          setError("session_not_found");
          return;
        }

        setWalletAddress(payload.session.walletAddress);
        setExpiresAt(new Date(payload.session.expiresAt * 1000).toLocaleString());
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "session_load_failed");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.replace("/signin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <Badge variant="secondary">Protected</Badge>
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Connected wallet
                </div>
                <div className="font-mono text-sm">
                  {loading ? "Loading..." : walletAddress}
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Session expires
                </div>
                <div className="text-sm">
                  {loading ? "Loading..." : expiresAt}
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button variant="outline" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
