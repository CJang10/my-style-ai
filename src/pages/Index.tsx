import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-fashion.jpg";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative flex-1 flex items-end">
        <img src={heroImage} alt="Curated fashion flat lay" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 w-full max-w-lg mx-auto px-6 pb-12 pt-40 text-center">
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight leading-tight">
            Style<span className="text-gold italic">Vault</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            Your AI-powered personal stylist. Daily outfits curated from your closet, your weather, and your life.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="mt-8 gradient-gold text-primary-foreground px-8 py-6 text-base rounded-xl shadow-gold hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5 mr-2" /> Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
