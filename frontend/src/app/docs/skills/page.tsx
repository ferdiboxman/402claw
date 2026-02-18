import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Skills - Clawr Docs",
  description: "Package and monetize your expertise"
};

export default function SkillsPage() {
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
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Skills
          </h1>
          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            Coming Soon
          </span>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          Package your expertise as callable, paid skills.
        </p>

        {/* Coming Soon Banner */}
        <div className="mb-12 p-8 rounded-lg border border-dashed border-border bg-card text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-medium mb-2">Skills launching Q1 2026</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're building skill deployment. Join the waitlist to be notified when it's ready.
          </p>
          <Button className="mt-6" asChild>
            <a href="https://twitter.com/clawr_ai" target="_blank" rel="noopener">
              Follow for Updates
            </a>
          </Button>
        </div>

        {/* What are Skills */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">What are Skills?</h2>
          <p className="text-muted-foreground mb-4">
            Skills are packaged expertise that agents can invoke and pay for. 
            Unlike data APIs that serve information, skills serve <strong>judgment</strong>.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="font-medium mb-2">Data API</h3>
              <p className="text-sm text-muted-foreground">
                "Here's the pricing data for AI models"
              </p>
            </div>
            <div className="p-4 rounded-lg border border-primary/50 bg-card">
              <h3 className="font-medium mb-2">Skill</h3>
              <p className="text-sm text-muted-foreground">
                "Here's how you should price your AI product"
              </p>
            </div>
          </div>
        </section>

        {/* Example Skills */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">Example Skills</h2>
          <div className="space-y-4">
            {[
              { icon: "🔍", name: "seo-audit", price: "$0.05", desc: "Audit landing pages for SEO issues" },
              { icon: "✉️", name: "cold-email-writer", price: "$0.02", desc: "Write cold emails that get replies" },
              { icon: "💰", name: "pricing-analyzer", price: "$0.25", desc: "Analyze SaaS pricing strategies" },
              { icon: "⚖️", name: "legal-risk-check", price: "$0.50", desc: "Flag legal risks in contracts" },
              { icon: "📊", name: "pitch-deck-review", price: "$1.00", desc: "Review pitch decks like a VC" },
            ].map((skill) => (
              <div key={skill.name} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{skill.icon}</span>
                  <div>
                    <h3 className="font-medium font-mono">{skill.name}</h3>
                    <p className="text-sm text-muted-foreground">{skill.desc}</p>
                  </div>
                </div>
                <span className="font-mono text-sm text-muted-foreground">{skill.price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Skill Structure Preview */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">Skill Structure (Preview)</h2>
          <pre className="bg-card border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`my-skill/
├── clawr.json      # Config + pricing
├── SKILL.md        # Description + docs
├── prompts/        # System prompts
│   └── main.md
└── examples/       # Usage examples`}
          </pre>
        </section>

        {/* Deployment Preview */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">How it will work</h2>
          <pre className="bg-card border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`# Deploy a skill
$ clawr deploy ./seo-audit --price 0.05
✓ Live at api.clawr.ai/skills/seo-audit

# Agents invoke it
curl -X POST api.clawr.ai/skills/seo-audit \\
  -H "X-402-Payment: <token>" \\
  -d '{"url": "https://example.com"}'`}
          </pre>
        </section>

        {/* Nav */}
        <div className="flex justify-between items-center pt-8 border-t border-border">
          <Button variant="outline" asChild>
            <Link href="/docs/pricing" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Pricing
            </Link>
          </Button>
          <div />
        </div>
      </main>
    </div>
  );
}
