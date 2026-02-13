import { NextRequest, NextResponse } from "next/server";
import { createWalletChallenge } from "@/lib/auth/challenges";

type ChallengeBody = {
  walletAddress?: string;
};

export async function POST(request: NextRequest) {
  let body: ChallengeBody = {};
  try {
    body = (await request.json()) as ChallengeBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
      },
      { status: 400 },
    );
  }

  try {
    const challenge = createWalletChallenge({
      walletAddress: String(body.walletAddress || ""),
      origin: request.nextUrl.origin,
    });

    return NextResponse.json(
      {
        ok: true,
        challenge: {
          challengeId: challenge.challengeId,
          walletAddress: challenge.walletAddress,
          nonce: challenge.nonce,
          issuedAt: challenge.issuedAt,
          expiresAt: challenge.expiresAt,
          message: challenge.message,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      {
        ok: false,
        error: reason,
      },
      { status: 400 },
    );
  }
}
