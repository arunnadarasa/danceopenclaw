import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Heart, CalendarDays, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "dancer" | "fan" | "organiser";

const roles: { value: Role; icon: typeof Music; title: string; description: string }[] = [
  { value: "dancer", icon: Music, title: "Dancer", description: "Perform, earn tips, and sell merch through your agent." },
  { value: "fan", icon: Heart, title: "Fan", description: "Discover talent, tip dancers, and buy gear." },
  { value: "organiser", icon: CalendarDays, title: "Organiser", description: "Create events, manage tickets, and distribute payouts." },
];

const danceStyles = [
  "Hip-Hop", "Breaking", "Popping", "Locking", "Contemporary",
  "Ballet", "Krump", "House", "Waacking", "Dancehall",
  "Afrobeats", "Voguing", "Tutting", "Animation",
];

export const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === "dancer") {
      setStep(2);
    } else {
      completeOnboarding(role, []);
    }
  };

  const completeOnboarding = async (role: Role, styles: string[]) => {
    if (!user) return;
    setSaving(true);

    try {
      // Insert role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role });

      if (roleError) throw roleError;

      // Update profile with dance styles and onboarding flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          dance_styles: styles,
          onboarding_complete: true,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast.success(`Welcome aboard as a ${role}!`);
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background dark px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-display text-2xl font-bold">
            Dance <span className="text-gradient-primary">OpenClaw</span>
          </span>
        </div>

        {step === 1 && (
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="font-display text-2xl font-bold text-center">Choose Your Role</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Your agent will be configured based on your role.
            </p>

            <div className="mt-8 space-y-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  disabled={saving}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-secondary/20 p-5 text-left transition-all hover:border-primary/50 hover:bg-secondary/40 disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <role.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-lg font-semibold">{role.title}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-border bg-card p-8">
            <h1 className="font-display text-2xl font-bold text-center">Select Your Styles</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Choose the dance styles you specialise in.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {danceStyles.map((style) => {
                const isSelected = selectedStyles.includes(style);
                return (
                  <button
                    key={style}
                    onClick={() => toggleStyle(style)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {style}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => completeOnboarding("dancer", selectedStyles)}
                disabled={selectedStyles.length === 0 || saving}
                className="flex-1 gap-2"
              >
                {saving ? "Saving..." : "Complete Setup"}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
