import { getAddress, verifyMessage } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import {
  getWalletChallenge,
  markWalletChallengeUsed,
} from "@/lib/auth/challenges";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

export const runtime = "nodejs";

type VerifyBody = {
  walletAddress?: string;
  challengeId?: string;
  signature?: string;
};

function errorStatus(errorCode: string): number {
  if (errorCode.includes("not_found") || errorCode.includes("expired")) return 404;
  if (errorCode.includes("invalid") || errorCode.includes("mismatch")) return 401;
  return 400;
}

export async function POST(request: NextRequest) {
  let body: VerifyBody = {};
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
      },
      { status: 400 },
    );
  }

  const walletAddress = String(body.walletAddress || "").trim();
  const challengeId = String(body.challengeId || "").trim();
  const signature = String(body.signature || "").trim();

  if (!walletAddress || !challengeId || !signature) {
    return NextResponse.json(
      {
        ok: false,
        error: "wallet_address_challenge_id_signature_required",
      },
      { status: 400 },
    );
  }

  try {
    const challenge = getWalletChallenge({
      challengeId,
      walletAddress,
    });

    let recoveredAddress = "";
    try {
      recoveredAddress = getAddress(verifyMessage(challenge.message, signature));
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "wallet_signature_invalid",
        },
        { status: 401 },
      );
    }

    if (recoveredAddress !== challenge.walletAddress) {
      return NextResponse.json(
        {
          ok: false,
          error: "wallet_signature_mismatch",
        },
        { status: 401 },
      );
    }

    markWalletChallengeUsed(challenge.challengeId);

    const token = await createSessionToken({
      walletAddress: challenge.walletAddress,
      subject: challenge.walletAddress.toLowerCase(),
    });
    const claims = await verifySessionToken(token);
    const response = NextResponse.json(
      {
        ok: true,
        session: {
          walletAddress: challenge.walletAddress,
          issuedAt: claims?.iat || null,
          expiresAt: claims?.exp || null,
        },
      },
      { status: 200 },
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "wallet_verification_failed";
    return NextResponse.json(
      {
        ok: false,
        error: code,
      },
      { status: errorStatus(code) },
    );
  }
}
