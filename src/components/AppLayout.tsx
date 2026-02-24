import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shirt, User, Compass, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/closet", label: "Closet", icon: Shirt },
  { path: "/inbox", label: "Inbox", icon: MessageCircle },
  { path: "/profile", label: "Profile", icon: User },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trade_requests")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-14">
          <h1 className="text-lg font-display font-semibold tracking-tight">
            Style<span className="text-gold italic">Vault</span>
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-5">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="max-w-2xl mx-auto flex justify-around px-2 py-1.5 pb-safe">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const showBadge = item.path === "/inbox" && unreadCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all duration-200"
              >
                {active && (
                  <span
                    className="absolute inset-0 rounded-xl animate-scale-in"
                    style={{ background: "hsl(var(--gold) / 0.08)" }}
                  />
                )}
                <div className="relative">
                  <item.icon
                    className={`relative w-[22px] h-[22px] transition-all duration-200 ${
                      active ? "text-gold" : "text-muted-foreground"
                    }`}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-gold flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`relative text-[10px] font-medium transition-colors duration-200 ${
                    active ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
