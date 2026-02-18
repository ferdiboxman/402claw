import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pricing - Clawr Docs",
  description: "How x402 micropayments work"
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Docs
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          Pricing & Payments
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          How x402 micropayments work with Clawr.
        </p>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">How x402 Works</h2>
          <p className="text-muted-foreground mb-4">
            x402 is an HTTP-native payment protocol. When an agent calls your API:
          </p>
          <ol className="space-y-4 ml-4">
            <li className="flex gap-3">
              <span className="font-mono text-primary">1.</span>
              <span className="text-muted-foreground">
                Agent makes request to your endpoint
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">2.</span>
              <span className="text-muted-foreground">
                Server returns <code className="bg-secondary px-1.5 py-0.5 rounded text-sm">402 Payment Required</code> with price
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">3.</span>
              <span className="text-muted-foreground">
                Agent signs payment with their wallet
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">4.</span>
              <span className="text-muted-foreground">
                Agent retries with <code className="bg-secondary px-1.5 py-0.5 rounded text-sm">X-402-Payment</code> header
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">5.</span>
              <span className="text-muted-foreground">
                Server verifies payment, returns data
              </span>
            </li>
          </ol>
        </section>

        {/* Pricing your API */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">Setting Your Price</h2>
          <p className="text-muted-foreground mb-4">
            You control the price per request. Some guidelines:
          </p>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Use Case</th>
                  <th className="px-4 py-3 text-left font-medium">Suggested Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Simple data lookups</td>
                  <td className="px-4 py-3 font-mono">$0.001 - $0.01</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Enriched data / research</td>
                  <td className="px-4 py-3 font-mono">$0.01 - $0.10</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Skills / AI processing</td>
                  <td className="px-4 py-3 font-mono">$0.05 - $1.00</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Premium expertise</td>
                  <td className="px-4 py-3 font-mono">$1.00 - $10.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment details */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">Payment Details</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-medium mb-2">Currency</h3>
              <p className="text-sm text-muted-foreground">
                USDC on Base (Chain ID 8453). Stablecoin pegged to USD.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-medium mb-2">Settlement</h3>
              <p className="text-sm text-muted-foreground">
                Instant. Payments settle directly to your wallet as each request is processed.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-medium mb-2">Fees</h3>
              <p className="text-sm text-muted-foreground">
                5% platform fee. You receive 95% of every payment.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-medium mb-2">Minimums</h3>
              <p className="text-sm text-muted-foreground">
                Minimum price: $0.0001 per request. No maximum.
              </p>
            </div>
          </div>
        </section>

        {/* For agents */}
        <section className="mb-12 p-6 rounded-lg border border-primary/30 bg-primary/5">
          <h2 className="font-medium mb-4">For Agent Builders</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your agent needs a wallet with USDC on Base to pay for API calls. 
            Popular options:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Coinbase CDP</strong> - Agent wallets with gas sponsorship</li>
            <li>• <strong>Privy</strong> - Embedded wallets for AI agents</li>
            <li>• <strong>Any EOA</strong> - Standard Ethereum wallet works</li>
          </ul>
        </section>

        {/* Nav */}
        <div className="flex justify-between items-center pt-8 border-t border-border">
          <Button variant="outline" asChild>
            <Link href="/docs/cli" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              CLI Reference
            </Link>
          </Button>
          <Button asChild>
            <Link href="/docs/skills" className="gap-2">
              Skills
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
