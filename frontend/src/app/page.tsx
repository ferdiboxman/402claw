"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Terminal, 
  Zap, 
  Shield, 
  Code,
  Globe
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight">clawr</span>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="/explore" className="hover:text-foreground transition-colors">Explore</a>
              <a href="#docs" className="hover:text-foreground transition-colors">Docs</a>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground mb-4 font-medium">
            APIs for the agentic internet
          </p>
          
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-balance">
            Deploy data, get a paid API.
            <br />
            <span className="text-muted-foreground">No keys required.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl">
            Upload CSV or JSON, set a price per request. Agents pay with crypto, you earn instantly. Zero accounts, zero API keys.
          </p>
          
          {/* Terminal Preview */}
          <div className="rounded-lg border border-border bg-card p-4 mb-10 font-mono text-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">$</span>{" "}
                <span>clawr deploy products.csv --price 0.001</span>
              </div>
              <div className="text-muted-foreground">
                Deploying to clawr-staging…
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground">✓</span> Live at{" "}
                <span className="text-foreground">api.clawr.ai/v1/products</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button size="lg" className="gap-2">
              <Terminal className="w-4 h-4" />
              Install CLI
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              View Docs
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Built for autonomous agents
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Traditional APIs require accounts, keys, and billing setups. Clawr APIs just work—call, pay, receive.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard 
              icon={<Zap className="w-5 h-5" />}
              title="Pay per request"
              description="No subscriptions. No monthly fees. Each API call is a microtransaction in USDC."
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5" />}
              title="No API keys"
              description="x402 protocol handles auth via payment. Your wallet is your identity."
            />
            <FeatureCard 
              icon={<Globe className="w-5 h-5" />}
              title="Edge deployed"
              description="APIs run on Cloudflare's global network. Sub-50ms responses worldwide."
            />
            <FeatureCard 
              icon={<Code className="w-5 h-5" />}
              title="Agent-to-agent"
              description="Agents can publish APIs for other agents. An autonomous marketplace."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Three commands to revenue
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Deploy"
              code="clawr deploy data.csv"
              description="Upload any CSV or JSON file. We generate the API endpoints."
            />
            <StepCard 
              number="2"
              title="Price"
              code="--price 0.01"
              description="Set your price per request. From $0.001 to $100."
            />
            <StepCard 
              number="3"
              title="Earn"
              code="clawr withdraw"
              description="Earnings go to your wallet. Withdraw anytime."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            Start building
          </h2>
          <p className="text-muted-foreground mb-8">
            Deploy your first API in under a minute.
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 font-mono text-sm">
            <span className="text-muted-foreground">$</span>
            <span>npm install -g clawr</span>
            <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <Code className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © 2026 clawr
          </span>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ 
  number, 
  title, 
  description,
  code 
}: { 
  number: string;
  title: string; 
  description: string;
  code: string;
}) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Step {number}</div>
      <h3 className="font-medium mb-3">{title}</h3>
      <code className="block text-sm font-mono bg-card border border-border rounded px-3 py-2 mb-3">
        {code}
      </code>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
