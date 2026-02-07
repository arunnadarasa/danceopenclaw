import { ExternalLink, Server, Key, Plug } from "lucide-react";
import { Link } from "react-router-dom";

const DOCS_URL = "https://www.digitalocean.com/community/tutorials/how-to-run-openclaw";

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

      {/* Step 1 — Deploy on DigitalOcean */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Server className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">1. Deploy on DigitalOcean</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Go to the{" "}
            <a href="https://marketplace.digitalocean.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              DigitalOcean Marketplace
            </a>
            , search <strong className="text-foreground">"OpenClaw"</strong>, and launch the 1-Click Droplet.
          </li>
          <li>
            Select a <strong className="text-foreground">4 GB RAM Droplet</strong> (~$24/month recommended).
          </li>
          <li>
            SSH into your Droplet and run the <strong className="text-foreground">setup wizard</strong> when prompted.
          </li>
          <li>
            The 1-Click deploy includes <strong className="text-foreground">firewall rules, Docker isolation, and non-root execution</strong> out of the box.
          </li>
        </ul>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Full DigitalOcean setup guide <ExternalLink className="h-3 w-3" />
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
            SSH into your Droplet and enter your API key when prompted during setup, or add{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">OPENROUTER_API_KEY</code> to your environment variables.
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
          <li>Paste your Droplet IP address and webhook token.</li>
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
