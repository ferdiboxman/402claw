import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Quickstart - Clawr Docs",
  description: "Deploy your first paid API in 60 seconds"
};

export default function QuickstartPage() {
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
          Quickstart
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Deploy your first paid API in 60 seconds.
        </p>

        {/* Step 1 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              1
            </div>
            <h2 className="text-xl font-medium">Create your data file</h2>
          </div>
          <p className="text-muted-foreground mb-4 ml-11">
            Create a CSV or JSON file with your data. Example <code className="bg-secondary px-1.5 py-0.5 rounded text-sm">products.csv</code>:
          </p>
          <pre className="ml-11 bg-card border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`name,price,category
iPhone 15,999,phones
MacBook Pro,2499,laptops
AirPods Pro,249,audio`}
          </pre>
        </section>

        {/* Step 2 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              2
            </div>
            <h2 className="text-xl font-medium">Deploy with one command</h2>
          </div>
          <pre className="ml-11 bg-card border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`npx clawr deploy products.csv --price 0.001`}
          </pre>
          <p className="text-muted-foreground mt-4 ml-11">
            This deploys your data and sets a price of $0.001 per request.
          </p>
        </section>

        {/* Step 3 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              3
            </div>
            <h2 className="text-xl font-medium">Your API is live</h2>
          </div>
          <p className="text-muted-foreground mb-4 ml-11">
            That's it! Your paid API is now live. Agents can query it and pay automatically via x402:
          </p>
          <pre className="ml-11 bg-card border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`curl https://api.clawr.ai/v1/products \\
  -H "X-402-Payment: <payment-token>"`}
          </pre>
        </section>

        {/* What you get */}
        <section className="mb-12 p-6 rounded-lg border border-border bg-card">
          <h3 className="font-medium mb-4">What you get</h3>
          <ul className="space-y-3">
            {[
              "Instant API endpoint on Cloudflare's edge network",
              "x402 payment verification built-in",
              "USDC payments on Base (instant settlement)",
              "Query, filter, and paginate your data",
              "Usage analytics dashboard",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Next */}
        <div className="flex justify-between items-center pt-8 border-t border-border">
          <div />
          <Button asChild>
            <Link href="/docs/cli" className="gap-2">
              CLI Reference
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
