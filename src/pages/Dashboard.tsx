import { OpenClawConnectionCard } from "@/components/dashboard/OpenClawConnectionCard";
import { AgentTaskPanel } from "@/components/dashboard/AgentTaskPanel";
import { ExternalLink } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Manage your OpenClaw agent and monitor tasks.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpenClawConnectionCard />
        <AgentTaskPanel />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">📚 Documentation:</span>
        <a
          href="https://docs.digitalocean.com/products/marketplace/catalog/openclaw/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          DigitalOcean Marketplace <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://www.digitalocean.com/community/tutorials/how-to-run-openclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Setup guide <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export default Dashboard;
