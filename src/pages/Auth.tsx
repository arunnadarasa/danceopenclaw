import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const AuthPage = () => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    if (!agreed) {
      toast.error("You must accept the disclaimer to continue.");
      return;
    }
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign-in failed: " + result.error.message);
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background dark px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-display text-2xl font-bold">
            Dance <span className="text-gradient-primary">OpenClaw</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-2xl font-bold text-center">Sign In</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Join the dance agent ecosystem
          </p>

          {/* Burner email recommendation */}
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-warning/10 border border-warning/20 p-4">
            <Shield className="h-5 w-5 shrink-0 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Use a burner email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This is an experimental platform with autonomous agents. We recommend signing in with a disposable email for safety.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Autonomy Disclaimer</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  I understand that OpenClaw agents operate autonomously and may perform actions — some beneficial, some potentially undesirable — on my behalf. I accept full responsibility.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="disclaimer"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                  />
                  <label htmlFor="disclaimer" className="text-sm font-medium cursor-pointer">
                    I understand and accept
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={!agreed || loading}
            className="mt-6 w-full gap-2"
            size="lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
