import Link from 'next/link';
import { Zap, GitBranch, PlayCircle, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold">FlowForge</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Automate anything with
          <span className="text-primary"> visual workflows</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Build event-driven automation pipelines with a drag-and-drop builder. Connect
          webhooks, APIs, emails, and Slack — all with real-time execution monitoring
          and multi-tenant workspaces.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Building Free
          </Link>
          <Link
            href="/login"
            className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
          >
            View Demo
          </Link>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-left">
            <GitBranch className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Visual Builder</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag-and-drop workflow editor with conditions, transforms, and branching logic.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-left">
            <PlayCircle className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Real-time Execution</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Watch your workflows execute step-by-step with live WebSocket updates.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-left">
            <Shield className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Multi-tenant RBAC</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Organizations, workspaces, and role-based access control built-in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
