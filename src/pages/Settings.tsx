import { useEffect, useState } from "react";
import { Settings, Loader2, Save, LogOut, Check, User, Bot, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DANCE_STYLES = [
  "Hip-Hop", "Breaking", "Popping", "Locking", "Contemporary",
  "Ballet", "Krump", "House", "Waacking", "Dancehall",
  "Afrobeats", "Voguing", "Tutting", "Animation",
];

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [danceStyles, setDanceStyles] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState("");

  // Agent state
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [autoTip, setAutoTip] = useState(false);
  const [agentStatus, setAgentStatus] = useState("active");

  // Account state
  const [role, setRole] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);

      // Fetch profile, agent, and role in parallel
      const [profileRes, agentRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("agents").select("*").eq("user_id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name || "");
        setBio(profileRes.data.bio || "");
        setDanceStyles(profileRes.data.dance_styles || []);
        setWalletAddress(profileRes.data.wallet_address || "");
      }

      if (agentRes.data) {
        setAgentId(agentRes.data.id);
        setAgentName(agentRes.data.name);
        setBudgetLimit(agentRes.data.budget_limit?.toString() || "10");
        setAutoTip(agentRes.data.auto_tip_enabled);
        setAgentStatus(agentRes.data.status);
      }

      if (roleRes.data) {
        setRole(roleRes.data.role);
      }

      setMemberSince(user.created_at || "");
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const toggleStyle = (style: string) => {
    setDanceStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        dance_styles: danceStyles,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    }
    setSavingProfile(false);
  };

  const handleSaveAgent = async () => {
    if (!user || !agentId) return;
    setSavingAgent(true);

    const { error } = await supabase
      .from("agents")
      .update({
        name: agentName,
        budget_limit: parseFloat(budgetLimit) || 10,
        auto_tip_enabled: autoTip,
      })
      .eq("id", agentId);

    if (error) {
      toast({ title: "Error saving agent", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent updated", description: "Your agent settings have been saved." });
    }
    setSavingAgent(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your profile, agent, and account</p>
        </div>
      </div>

      {/* Profile Section */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Profile</CardTitle>
          </div>
          <CardDescription>Your public dancer profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Dance Styles</Label>
            <div className="flex flex-wrap gap-2">
              {DANCE_STYLES.map((style) => {
                const isSelected = danceStyles.includes(style);
                return (
                  <button
                    key={style}
                    onClick={() => toggleStyle(style)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {style}
                  </button>
                );
              })}
            </div>
          </div>

          {walletAddress && (
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input value={walletAddress} readOnly className="font-mono text-xs opacity-70" />
            </div>
          )}

          <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Agent Section */}
      {agentId && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-lg">Agent</CardTitle>
            </div>
            <CardDescription>Configure your AI agent&apos;s behaviour</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="My Agent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget Limit (USDC)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
              <div>
                <p className="font-medium text-sm text-foreground">Auto-Tip</p>
                <p className="text-xs text-muted-foreground">Automatically tip dancers after performances</p>
              </div>
              <Switch checked={autoTip} onCheckedChange={setAutoTip} />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant={agentStatus === "active" ? "default" : "secondary"}>
                {agentStatus}
              </Badge>
            </div>

            <Button onClick={handleSaveAgent} disabled={savingAgent} className="gap-2">
              {savingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account Section */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Account</CardTitle>
          </div>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Email</Label>
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
          <Separator />
          {role && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Role</Label>
                <Badge variant="outline" className="capitalize">{role}</Badge>
              </div>
              <Separator />
            </>
          )}
          {memberSince && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Member Since</Label>
                <span className="text-sm text-foreground">
                  {new Date(memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
              <Separator />
            </>
          )}
          <Button variant="destructive" onClick={handleSignOut} className="gap-2 mt-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
