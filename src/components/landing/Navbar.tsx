import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold">
            Dance <span className="text-gradient-primary">OpenClaw</span>
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it Works
          </a>
          <a href="#roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Roles
          </a>
          <a href="#setup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Setup Guide
          </a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </a>
        </div>

        <Button className="gap-2">
          <Zap className="h-4 w-4" />
          Sign In
        </Button>
      </div>
    </nav>
  );
};
