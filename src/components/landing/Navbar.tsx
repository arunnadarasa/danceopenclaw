import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import logoImg from "@/assets/Dance_OpenClaw.png";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Dance OpenClaw" className="h-9 w-9 rounded-lg object-contain" />
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

        <Button asChild className="gap-2">
          <Link to="/auth">
            <Zap className="h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </div>
    </nav>
  );
};
