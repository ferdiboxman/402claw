"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Terminal, 
  Zap, 
  Shield, 
  Code,
  Globe,
  Brain,
  Layers
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
              <a href="#skills" className="hover:text-foreground transition-colors">Skills</a>
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
            The monetization layer for the skill era
          </p>
          
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-balance">
            Turn expertise into revenue.
            <br />
            <span className="text-muted-foreground">One command.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl">
            Deploy data or skills. Set a price. Agents pay per use. No accounts, no API keys, just micropayments.
          </p>
          
          {/* Terminal Preview */}
          <div className="rounded-lg border border-border bg-card p-4 mb-10 font-mono text-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground text-xs mb-2"># Deploy a data API</div>
              <div>
                <span className="text-muted-foreground">$</span>{" "}
                <span>clawr deploy pricing.csv --price 0.001</span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground">✓</span> Live at{" "}
                <span className="text-foreground">api.clawr.ai/v1/pricing</span>
              </div>
              <div className="mt-4 text-muted-foreground text-xs"># Deploy a skill (coming soon)</div>
              <div>
                <span className="text-muted-foreground">$</span>{" "}
                <span>clawr deploy ./seo-audit --price 0.05</span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground">✓</span> Live at{" "}
                <span className="text-foreground">api.clawr.ai/skills/seo-audit</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button size="lg" className="gap-2">
              <Terminal className="w-4 h-4" />
              Install CLI
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link href="/docs">
                View Docs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The Shift */}
      <section className="py-24 px-6 border-t border-border bg-secondary/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            The API era is over. The skill era is here.
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left mt-12">
            <div className="p-6 rounded-lg border border-border bg-card">
              <div className="text-sm text-muted-foreground mb-2">2010–2024</div>
              <h3 className="font-medium mb-3">API Era</h3>
              <p className="text-sm text-muted-foreground">
                You owned pipes. Stripe owned payments. Twilio owned messaging. 
                Distribution meant convincing developers to integrate you.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-primary/50 bg-card">
              <div className="text-sm text-primary mb-2">2025+</div>
              <h3 className="font-medium mb-3">Skill Era</h3>
              <p className="text-sm text-muted-foreground">
                You own patterns. How to price. How to position. How to close. 
                Distribution means embedding your thinking into agent workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Two ways to monetize
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Data APIs serve information. Skills serve judgment. Clawr monetizes both.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <FeatureCard 
              icon={<Layers className="w-5 h-5" />}
              title="Data APIs"
              description="CSV, JSON → instant paid endpoint. Price per request. Serve any dataset to any agent."
            />
            <FeatureCard 
              icon={<Brain className="w-5 h-5" />}
              title="Skills (coming soon)"
              description="Package your expertise. SKILL.md + prompts → paid invocations. Your playbook, called 10,000x/day."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard 
              icon={<Zap className="w-5 h-5" />}
              title="Pay per use"
              description="No subscriptions. No monthly fees. Each call is a microtransaction in USDC on Base."
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5" />}
              title="No API keys"
              description="x402 protocol handles auth via payment. Call, pay, receive. Zero friction."
            />
            <FeatureCard 
              icon={<Globe className="w-5 h-5" />}
              title="Edge deployed"
              description="APIs and skills run on Cloudflare's global network. Sub-50ms responses worldwide."
            />
            <FeatureCard 
              icon={<Code className="w-5 h-5" />}
              title="Agent-first"
              description="Built for autonomous agents. Agents publish for other agents. An AI-native marketplace."
            />
          </div>
        </div>
      </section>

      {/* Skills Preview */}
      <section id="skills" className="py-24 px-6 border-t border-border bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-sm text-primary mb-2 font-medium">Coming Soon</p>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              Skills are the new companies
            </h2>
            <p className="text-muted-foreground max-w-xl">
              In the skill era, you don't build SaaS. You encode expertise. 
              A strong skill serves fleets of agents, shaping decisions at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <SkillCard 
              icon="🔍"
              name="seo-audit"
              price="$0.05"
              description="Audit any landing page for SEO issues like a senior growth operator."
            />
            <SkillCard 
              icon="✉️"
              name="cold-email-writer"
              price="$0.02"
              description="Write cold emails that actually get replies. No templates, no spam."
            />
            <SkillCard 
              icon="💰"
              name="pricing-analyzer"
              price="$0.25"
              description="Analyze your SaaS pricing. Find issues. Get specific recommendations."
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
              description="Upload any CSV, JSON, or skill directory. We handle the rest."
            />
            <StepCard 
              number="2"
              title="Price"
              code="--price 0.01"
              description="Set your price per request or invocation. From $0.001 to $100."
            />
            <StepCard 
              number="3"
              title="Earn"
              code="clawr stats"
              description="Track invocations, revenue, top callers. Earnings go to your wallet."
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
            Deploy your first API in under a minute. Skills coming Q1 2026.
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 font-mono text-sm mb-6">
            <span className="text-muted-foreground">$</span>
            <span>npx clawr</span>
            <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <Code className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Payments in USDC on Base. No accounts required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © 2026 clawr — the monetization layer for the skill era
          </span>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="https://github.com/ferdiboxman/402claw" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://x.com/clawr_ai" className="hover:text-foreground transition-colors">Twitter</a>
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

function SkillCard({ 
  icon, 
  name, 
  price,
  description 
}: { 
  icon: string;
  name: string; 
  price: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-mono text-muted-foreground">{price}/call</span>
      </div>
      <h3 className="font-medium font-mono mb-2">{name}</h3>
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
