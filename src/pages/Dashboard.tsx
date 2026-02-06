import { OpenClawConnectionCard } from "@/components/dashboard/OpenClawConnectionCard";
import { AgentTaskPanel } from "@/components/dashboard/AgentTaskPanel";

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
    </div>
  );
};

export default Dashboard;
