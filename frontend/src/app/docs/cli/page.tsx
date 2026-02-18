import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "CLI Reference - Clawr Docs",
  description: "All clawr commands and options"
};

const commands = [
  {
    name: "deploy",
    description: "Deploy a data file or skill as a paid API",
    usage: "clawr deploy <file> [options]",
    options: [
      { flag: "--price <amount>", desc: "Price per request in USDC (default: 0.001)" },
      { flag: "--name <name>", desc: "Custom endpoint name" },
      { flag: "--tenant <id>", desc: "Tenant namespace" },
      { flag: "--network <n>", desc: "Blockchain network (default: base)" },
      { flag: "--wallet <addr>", desc: "Payout wallet address" },
    ],
    examples: [
      "clawr deploy data.csv --price 0.01",
      "clawr deploy products.json --name my-products",
      "clawr deploy ./seo-audit --price 0.05",
    ],
  },
  {
    name: "list",
    description: "List all your deployed APIs",
    usage: "clawr list [options]",
    options: [
      { flag: "--tenant <id>", desc: "Filter by tenant" },
    ],
    examples: [
      "clawr list",
      "clawr list --tenant demo",
    ],
  },
  {
    name: "stats",
    description: "View usage statistics for your APIs",
    usage: "clawr stats [name] [options]",
    options: [
      { flag: "--period <p>", desc: "Time period: day, week, month (default: week)" },
    ],
    examples: [
      "clawr stats",
      "clawr stats my-api --period month",
    ],
  },
  {
    name: "withdraw",
    description: "Withdraw earnings to your wallet",
    usage: "clawr withdraw [options]",
    options: [
      { flag: "--wallet <addr>", desc: "Destination wallet (default: deployment wallet)" },
      { flag: "--amount <n>", desc: "Amount to withdraw (default: all)" },
    ],
    examples: [
      "clawr withdraw",
      "clawr withdraw --amount 100",
    ],
  },
  {
    name: "delete",
    description: "Remove a deployed API",
    usage: "clawr delete <name>",
    options: [],
    examples: [
      "clawr delete my-old-api",
    ],
  },
];

export default function CLIPage() {
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
          CLI Reference
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          All clawr commands and their options.
        </p>

        {/* Install */}
        <section className="mb-12 p-6 rounded-lg border border-border bg-card">
          <h2 className="font-medium mb-4">Installation</h2>
          <pre className="bg-secondary rounded-lg p-4 font-mono text-sm">
            npx clawr
          </pre>
          <p className="text-sm text-muted-foreground mt-3">
            Or install globally: <code className="bg-secondary px-1.5 py-0.5 rounded">npm install -g clawr</code>
          </p>
        </section>

        {/* Commands */}
        <div className="space-y-12">
          {commands.map((cmd) => (
            <section key={cmd.name} id={cmd.name} className="scroll-mt-8">
              <h2 className="text-xl font-medium mb-2 font-mono">{cmd.name}</h2>
              <p className="text-muted-foreground mb-4">{cmd.description}</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Usage</h3>
                  <pre className="bg-card border border-border rounded-lg p-3 font-mono text-sm">
                    {cmd.usage}
                  </pre>
                </div>

                {cmd.options.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Options</h3>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {cmd.options.map((opt) => (
                            <tr key={opt.flag} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 font-mono text-primary">{opt.flag}</td>
                              <td className="px-4 py-2 text-muted-foreground">{opt.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Examples</h3>
                  <pre className="bg-card border border-border rounded-lg p-3 font-mono text-sm space-y-1">
                    {cmd.examples.map((ex, i) => (
                      <div key={i}>{ex}</div>
                    ))}
                  </pre>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between items-center pt-8 mt-12 border-t border-border">
          <Button variant="outline" asChild>
            <Link href="/docs/quickstart" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Quickstart
            </Link>
          </Button>
          <Button asChild>
            <Link href="/docs/pricing" className="gap-2">
              Pricing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
