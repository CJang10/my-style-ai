import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, ArrowLeftRight, Clock, Shirt, Users } from "lucide-react";

// Preview card colors — just decorative swatches
const PREVIEW_ITEMS = [
  { color: "#C4A882", label: "Silk Blouse", badge: "Trade", badgeColor: "bg-white/90" },
  { color: "#8B7355", label: "Linen Trousers", badge: "Borrow", badgeColor: "bg-white/90" },
  { color: "#D4B896", label: "Leather Tote", badge: "Trade", badgeColor: "bg-white/90" },
  { color: "#6B5744", label: "Cashmere Coat", badge: null, badgeColor: "" },
];

const FEATURES = [
  { icon: Shirt, label: "Share your closet", desc: "Make pieces public for your community to see" },
  { icon: ArrowLeftRight, label: "Trade pieces", desc: "Swap something you love for something new" },
  { icon: Clock, label: "Borrow for a night", desc: "Rent that perfect outfit without buying it" },
  { icon: Users, label: "Follow local style", desc: "Discover people in your city with your taste" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/discover", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <header className="px-6 pt-8 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <h1 className="text-2xl font-display font-semibold tracking-tight">
          Style<span className="text-gold italic">Vault</span>
        </h1>
        <button
          onClick={() => navigate("/auth")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </button>
      </header>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 pb-12">

        {/* Hero */}
        <div className="pt-10 pb-8 opacity-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <p className="text-xs font-medium tracking-widest text-gold uppercase mb-4">
            Social Closet Community
          </p>
          <h2 className="text-[2.75rem] leading-[1.1] font-display font-bold tracking-tight text-foreground">
            The closet you've<br />
            always wanted is<br />
            <span className="text-gold italic">already nearby.</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-xs">
            Discover real wardrobes in your city. Trade pieces, borrow for a night, follow people who share your style.
          </p>
        </div>

        {/* Preview grid */}
        <div
          className="grid grid-cols-2 gap-3 opacity-0 animate-slide-up"
          style={{ animationDelay: "250ms" }}
        >
          {PREVIEW_ITEMS.map((item, i) => (
            <div
              key={i}
              className="relative rounded-2xl overflow-hidden shadow-sm"
              style={{
                aspectRatio: i % 2 === 0 ? "3/4" : "4/5",
                backgroundColor: item.color,
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {/* Item label */}
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-xs font-semibold drop-shadow">{item.label}</p>
              </div>
              {/* Badge */}
              {item.badge && (
                <div className="absolute top-3 right-3">
                  <span className={`${item.badgeColor} text-[10px] font-semibold px-2 py-0.5 rounded-full text-foreground`}>
                    {item.badge}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-8 opacity-0 animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <button
            onClick={() => navigate("/auth")}
            className="w-full group flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-primary-foreground gradient-gold shadow-gold transition-all duration-300 hover:shadow-[0_8px_32px_-4px_hsl(var(--gold)/0.45)] hover:scale-[1.01] active:scale-[0.99]"
          >
            Join the community
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Features */}
        <div
          className="mt-10 grid grid-cols-2 gap-3 opacity-0 animate-slide-up"
          style={{ animationDelay: "500ms" }}
        >
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card-elevated rounded-2xl p-4 space-y-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--gold) / 0.1)" }}
              >
                <Icon className="w-4 h-4 text-gold" />
              </div>
              <p className="text-sm font-semibold leading-snug">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p
          className="mt-8 text-center text-xs text-muted-foreground opacity-0 animate-slide-up"
          style={{ animationDelay: "600ms" }}
        >
          Free to join · No algorithm · Real people, real clothes
        </p>

      </div>
    </div>
  );
};

export default Index;
