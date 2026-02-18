// Centralized x402 configuration

export const x402Config = {
  /** Your wallet address to receive USDC payments */
  walletAddress: process.env.WALLET_ADDRESS!,

  /** Facilitator URL for payment verification */
  facilitatorUrl: process.env.FACILITATOR_URL || "https://x402.org/facilitator",

  /** Network: Base (chain ID 8453) */
  network: "base" as const,
  chainId: 8453,
  currency: "USDC" as const,

  /** Route pricing in USDC */
  routes: {
    "/api/data": {
      price: "0.01",
      description: "Access premium data",
    },
  } as Record<string, { price: string; description: string }>,
};
