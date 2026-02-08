import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  Wallet,
  CreditCard,
  Globe,
  MessageCircle,
  MessageSquare,
  BookOpen,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/Dance_OpenClaw.png";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/network", label: "Network", icon: Globe },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/moltbook", label: "Moltbook", icon: MessageSquare },
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar-background transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Dance OpenClaw" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-lg font-bold text-sidebar-foreground">
              Dance OpenClaw
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/40">Powered by OpenClaw</p>
        </div>
      </aside>
    </>
  );
};
