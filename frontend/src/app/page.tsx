"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Terminal, 
  Zap, 
  Shield, 
  DollarSign,
  Code,
  Database,
  Globe
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">4</span>
            </div>
            <span className="font-semibold">402claw</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-all duration-150 ease-out">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-all duration-150 ease-out">Pricing</a>
            <a href="#docs" className="hover:text-foreground transition-all duration-150 ease-out">Docs</a>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">Sign in</Button>
            <Button size="sm" className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="w-3 h-3 mr-1" />
            Powered by x402 micropayments
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Deploy your data,
            <br />
            <span className="text-gradient">get a paid API</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload CSV or JSON, set a price, get a working API endpoint. 
            Micropayments in USDC. One command.
          </p>
          
          {/* Terminal Preview */}
          <div className="glass rounded-xl p-4 max-w-xl mx-auto mb-8 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <code className="text-sm font-mono">
              <span className="text-muted-foreground">$</span>{" "}
              <span className="text-foreground">402claw deploy</span>{" "}
              <span className="text-primary">products.csv</span>{" "}
              <span className="text-muted-foreground">--price</span>{" "}
              <span className="text-green-400">0.001</span>
              <br />
              <br />
              <span className="text-muted-foreground">✓ Deployed to</span>{" "}
              <span className="text-primary">api.402claw.com/v1/products</span>
              <br />
              <span className="text-muted-foreground">✓ Price:</span>{" "}
              <span className="text-green-400">$0.001</span>{" "}
              <span className="text-muted-foreground">per request</span>
            </code>
          </div>
          
          <div className="flex items-center justify-center gap-4">
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

      {/* Stats */}
      <section className="py-12 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gradient">5%</div>
              <div className="text-sm text-muted-foreground">Platform fee</div>
            </div>
            <div>
              <div className="text-3xl font-bold">$0.001</div>
              <div className="text-sm text-muted-foreground">Min price</div>
            </div>
            <div>
              <div className="text-3xl font-bold">&lt;1s</div>
              <div className="text-sm text-muted-foreground">Deploy time</div>
            </div>
            <div>
              <div className="text-3xl font-bold">∞</div>
              <div className="text-sm text-muted-foreground">Scale</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to monetize data
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From upload to earnings in minutes, not weeks.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Terminal className="w-5 h-5" />}
              title="CLI-First"
              description="Deploy from your terminal. Perfect for developers and AI agents. No dashboards required."
            />
            <FeatureCard 
              icon={<Zap className="w-5 h-5" />}
              title="Instant Payments"
              description="x402 protocol enables sub-cent micropayments. Get paid per request in USDC."
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5" />}
              title="No Middlemen"
              description="Direct wallet-to-wallet payments. You keep 95% of every transaction."
            />
            <FeatureCard 
              icon={<Database className="w-5 h-5" />}
              title="Any Data Format"
              description="CSV, JSON, or API endpoints. Upload once, serve forever."
            />
            <FeatureCard 
              icon={<Globe className="w-5 h-5" />}
              title="Global Edge"
              description="Deployed on Cloudflare's network. Fast responses from anywhere."
            />
            <FeatureCard 
              icon={<Code className="w-5 h-5" />}
              title="Developer Friendly"
              description="Full API access, webhooks, and SDKs for Python, Node, and Go."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three steps to revenue
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Upload your data"
              description="CSV, JSON, or connect an existing API. We handle the rest."
              code="402claw deploy data.csv"
            />
            <StepCard 
              number="2"
              title="Set your price"
              description="Per-request pricing from $0.001. You decide what your data is worth."
              code="--price 0.01"
            />
            <StepCard 
              number="3"
              title="Get paid"
              description="Earnings go directly to your wallet. Withdraw anytime."
              code="402claw withdraw"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple pricing
            </h2>
            <p className="text-muted-foreground">
              No monthly fees. No hidden costs. Just 5% of what you earn.
            </p>
          </div>
          
          <Card className="glass p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold">5%</span>
                  <span className="text-muted-foreground">per transaction</span>
                </div>
                <p className="text-muted-foreground">
                  vs RapidAPI's 25% • vs Stripe's 2.9%+30¢
                </p>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Unlimited APIs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Unlimited requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Instant withdrawals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>No monthly minimums</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to monetize your data?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join the future of API monetization. No credit card required.
          </p>
          <Button size="lg" className="gap-2 glow">
            <Terminal className="w-4 h-4" />
            npm install -g 402claw
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">4</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026 402claw. Built with x402.
            </span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-all duration-150 ease-out">GitHub</a>
            <a href="#" className="hover:text-foreground transition-all duration-150 ease-out">Twitter</a>
            <a href="#" className="hover:text-foreground transition-all duration-150 ease-out">Discord</a>
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
    <Card className="glass p-6 hover-lift">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
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
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <code className="text-xs font-mono bg-muted px-3 py-1.5 rounded-md text-primary">
        {code}
      </code>
    </div>
  );
}
