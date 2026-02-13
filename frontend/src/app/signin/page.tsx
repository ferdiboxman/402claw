"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ChallengePayload = {
  challengeId: string;
  walletAddress: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "unknown_error";
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [walletAddress, setWalletAddress] = useState("");
  const [challenge, setChallenge] = useState<ChallengePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const value = searchParams.get("next");
    if (!value) return "/dashboard";
    if (!value.startsWith("/")) return "/dashboard";
    return value;
  }, [searchParams]);

  async function connectWallet() {
    if (!window.ethereum) {
      throw new Error("No wallet provider found. Install MetaMask or another EVM wallet.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const first = Array.isArray(accounts) ? String(accounts[0] || "") : "";
    if (!first) {
      throw new Error("Wallet connection returned no account.");
    }

    setWalletAddress(first);
    return first;
  }

  async function createChallenge() {
    setBusy(true);
    setError(null);

    try {
      const currentWallet = walletAddress || (await connectWallet());
      const response = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: currentWallet,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        challenge?: ChallengePayload;
      };

      if (!payload.ok || !payload.challenge) {
        throw new Error(payload.error || "challenge_create_failed");
      }

      setWalletAddress(payload.challenge.walletAddress);
      setChallenge(payload.challenge);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function signAndVerify() {
    setBusy(true);
    setError(null);

    try {
      if (!challenge) {
        throw new Error("Create a sign-in challenge first.");
      }
      if (!window.ethereum) {
        throw new Error("No wallet provider found. Install MetaMask or another EVM wallet.");
      }

      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, walletAddress],
      });
      if (typeof signature !== "string" || !signature) {
        throw new Error("Wallet did not return a valid signature.");
      }

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          challengeId: challenge.challengeId,
          signature,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!payload.ok) {
        throw new Error(payload.error || "wallet_verify_failed");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">clawr</Link>
          <Badge variant="secondary">Wallet Sign-In</Badge>
        </div>

        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Authenticate with Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Wallet address</label>
              <Input
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="0x..."
                autoComplete="off"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={connectWallet}
                disabled={busy}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={createChallenge}
                disabled={busy}
              >
                Create Challenge
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {challenge ? (
              <div className="space-y-3 rounded-lg border border-border bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">
                  Challenge {challenge.challengeId} expires at {new Date(challenge.expiresAt).toLocaleTimeString()}
                </div>
                <pre className="max-h-44 overflow-auto rounded bg-black/40 p-3 text-xs text-foreground/90">
                  {challenge.message}
                </pre>
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={signAndVerify}
                  disabled={busy}
                >
                  Sign Message & Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Create a challenge, sign it with your wallet, and a secure session cookie will be issued.
              </div>
            )}

            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground">
              No transaction is sent. You only sign a nonce-based challenge message.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-xl">
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading sign-in flow...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}
