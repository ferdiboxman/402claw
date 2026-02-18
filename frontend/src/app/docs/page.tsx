import Link from "next/link";
import { ArrowLeft, Book, Code, Cpu, Terminal, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Docs - Clawr",
  description: "Learn how to deploy paid APIs and skills with Clawr"
};

const docs = [
  {
    title: "Quickstart",
    description: "Deploy your first paid API in 60 seconds",
    href: "/docs/quickstart",
    icon: Zap,
  },
  {
    title: "CLI Reference",
    description: "All clawr commands and options",
    href: "/docs/cli",
    icon: Terminal,
  },
  {
    title: "Pricing",
    description: "How x402 micropayments work",
    href: "/docs/pricing",
    icon: Code,
  },
  {
    title: "Skills (Coming Soon)",
    description: "Package and monetize your expertise",
    href: "/docs/skills",
    icon: Cpu,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Home
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4" />
              <span className="font-medium">Docs</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-4">
            Documentation
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to deploy paid APIs and skills with Clawr.
          </p>
        </div>

        {/* Quick Install */}
        <div className="mb-12 p-6 rounded-lg border border-border bg-card">
          <h2 className="font-medium mb-4">Quick Install</h2>
          <code className="block font-mono text-sm bg-secondary rounded px-4 py-3">
            npx clawr
          </code>
        </div>

        {/* Docs Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="group p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <doc.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* GitHub Link */}
        <div className="mt-12 p-6 rounded-lg border border-dashed border-border text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Found an issue or want to contribute?
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="https://github.com/ferdiboxman/402claw" target="_blank" rel="noopener">
              View on GitHub
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}
