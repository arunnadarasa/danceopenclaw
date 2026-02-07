import { ExternalLink, Server, Key, Plug } from "lucide-react";
import { Link } from "react-router-dom";

const DOCS_URL = "https://docs.openclaw.ai/install/railway";

const Docs = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          Setup <span className="text-gradient-accent">Guide</span>
        </h1>
        <p className="text-muted-foreground">
          Get your OpenClaw agent running in three steps.
        </p>
      </div>

      {/* Step 1 — Deploy on Railway */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Server className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">1. Deploy on Railway</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Sign up at{" "}
            <a href="https://railway.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              railway.com
            </a>{" "}
            and deploy the ClawdBot template.
          </li>
          <li>
            Switch to the <strong className="text-foreground">Hobby Plan ($5/month)</strong>.
          </li>
          <li>
            Set a <strong className="text-foreground">$5 hard usage limit</strong> under Settings → Usage so you never get surprise bills.
          </li>
          <li>
            Add a <strong className="text-foreground">$3 custom email alert</strong> to get notified before you hit the limit.
          </li>
        </ul>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Full Railway install guide <ExternalLink className="h-3 w-3" />
        </a>
      </section>

      {/* Step 2 — Get an AI API Key */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Key className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">2. Get an AI API Key</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Sign up at{" "}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              openrouter.ai
            </a>{" "}
            and create an API key.
          </li>
          <li>
            In your Railway project, go to <strong className="text-foreground">Variables</strong> and add{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">OPENROUTER_API_KEY</code> with the key you just created.
          </li>
        </ul>
      </section>

      {/* Step 3 — Connect to Dashboard */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">3. Connect to Dashboard</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Go to your{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              Dashboard Settings
            </Link>{" "}
            and find the OpenClaw Connection card.
          </li>
          <li>Paste your Railway public URL and webhook token.</li>
          <li>
            Click <strong className="text-foreground">Connect</strong> — you're live!
          </li>
        </ul>
      </section>

      {/* Full docs CTA */}
      <div className="text-center">
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Read the full documentation <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  </div>
);

export default Docs;
