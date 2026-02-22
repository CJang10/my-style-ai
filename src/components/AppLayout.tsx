import { Link, useLocation } from "react-router-dom";
import { Home, Shirt, ShoppingBag, User, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Today", icon: Sparkles },
  { path: "/closet", label: "Closet", icon: Shirt },
  { path: "/shop", label: "Shop", icon: ShoppingBag },
  { path: "/profile", label: "Profile", icon: User },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold tracking-tight">
            Style<span className="text-gold italic">Vault</span>
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/50">
        <div className="max-w-2xl mx-auto flex justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200"
              >
                {/* Active background pill */}
                {active && (
                  <span className="absolute inset-0 rounded-xl animate-scale-in"
                    style={{ background: "hsl(var(--gold) / 0.1)" }}
                  />
                )}
                <item.icon
                  className={`relative w-5 h-5 transition-all duration-200 ${
                    active ? "text-gold scale-110" : "text-muted-foreground"
                  }`}
                />
                <span className={`relative text-xs font-medium transition-colors duration-200 ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
                {/* Active dot indicator */}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold animate-scale-in" />
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
