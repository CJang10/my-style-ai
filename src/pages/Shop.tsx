import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import productOvercoat from "@/assets/product-overcoat.jpg";
import productMerino from "@/assets/product-merino.jpg";
import productDenim from "@/assets/product-denim.jpg";
import productTote from "@/assets/product-tote.jpg";
import productBoots from "@/assets/product-boots.jpg";
import productLinenShirt from "@/assets/product-linen-shirt.jpg";

const PRODUCT_IMAGES: Record<string, string> = {
  "Italian Wool Overcoat": productOvercoat,
  "Merino Crew Neck": productMerino,
  "Slim Selvedge Denim": productDenim,
  "Canvas Tote": productTote,
  "Suede Desert Boots": productBoots,
  "Linen Camp Collar Shirt": productLinenShirt,
};

const FALLBACK_IMAGES = [productOvercoat, productMerino, productDenim, productTote, productBoots, productLinenShirt];

interface Recommendation {
  name: string;
  brand: string;
  price: number;
  reason: string;
  match_score: number;
  tags: string[];
}

const Shop = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [user]);

  const generateRecs = async () => {
    if (!profile || !user) return;
    setLoading(true);
    try {
      const { data: closetItems } = await supabase.from("closet_items").select("name, category, color, season").eq("user_id", user.id);
      const { data, error } = await supabase.functions.invoke("style-ai", {
        body: {
          type: "shopping",
          profile,
          closetItems: closetItems || [],
        },
      });
      if (error) throw error;
      if (data?.recommendations) setRecommendations(data.recommendations);
    } catch (e: any) {
      toast.error(e.message || "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = (name: string) => {
    setFavorites((prev) => prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]);
  };

  const budgetMap: Record<string, string> = {
    budget: "Under $50/mo",
    moderate: "$50–$150/mo",
    premium: "$150–$400/mo",
    luxury: "$400+/mo",
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-semibold">For <span className="text-gold italic">You</span></h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI picks based on your style & {budgetMap[profile?.budget] || "budget"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gold hover:text-gold/80"
            onClick={generateRecs}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            {recommendations ? "Refresh" : "Generate"}
          </Button>
        </div>

        {recommendations ? (
          <div className="space-y-4">
            {recommendations.map((item, i) => {
              const img = PRODUCT_IMAGES[item.name] || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
              return (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden border border-border">
                      <img src={img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.brand}</p>
                        </div>
                        <button onClick={() => toggleFav(item.name)} className="flex-shrink-0">
                          <Heart className={`w-5 h-5 transition-colors ${favorites.includes(item.name) ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-foreground"}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold">${item.price}</span>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Star className="w-3 h-3 text-gold" />
                          {item.match_score}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{item.reason}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.tags?.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Tap Generate to get AI-powered shopping recommendations personalized to your style, closet, and budget.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Shop;
