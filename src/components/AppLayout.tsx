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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
        <h1 className="text-xl font-display font-semibold tracking-tight">
          Style<span className="text-gold italic">Vault</span>
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
