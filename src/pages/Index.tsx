import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-fashion.jpg";
import { Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Hero image */}
      <div className="relative flex-1 flex flex-col justify-end">
        <img
          src={heroImage}
          alt="Curated fashion"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Gradient — darker, more dramatic */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-16 flex flex-col items-center text-center">

          {/* Badge */}
          <div
            className="opacity-0 animate-blur-in animate-delay-100 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: "hsl(var(--gold) / 0.12)", border: "1px solid hsl(var(--gold) / 0.25)" }}
          >
            <Sparkles className="w-3 h-3 text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide">AI Personal Stylist</span>
          </div>

          {/* Headline — word by word */}
          <h1 className="font-display font-bold tracking-tight leading-[1.1] mb-5">
            <span
              className="block text-5xl md:text-6xl opacity-0 animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              Style
              <span className="text-gold italic">Vault</span>
            </span>
            <span
              className="block text-xl md:text-2xl font-normal text-muted-foreground mt-2 opacity-0 animate-slide-up"
              style={{ animationDelay: "350ms" }}
            >
              Your wardrobe, elevated by AI
            </span>
          </h1>

          {/* Tagline */}
          <p
            className="text-muted-foreground text-base leading-relaxed max-w-xs opacity-0 animate-slide-up"
            style={{ animationDelay: "500ms" }}
          >
            Daily outfits curated from your closet, your weather, and your life.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate("/auth")}
            className="opacity-0 animate-slide-up mt-8 group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold text-primary-foreground gradient-gold shadow-gold transition-all duration-300 hover:shadow-[0_8px_32px_-4px_hsl(var(--gold)/0.5)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ animationDelay: "650ms" }}
          >
            <Sparkles className="w-4 h-4" />
            Get Started
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>

          {/* Sign in link */}
          <p
            className="opacity-0 animate-slide-up mt-4 text-xs text-muted-foreground"
            style={{ animationDelay: "750ms" }}
          >
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-gold hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
