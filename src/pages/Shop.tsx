import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
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

const AMAZON_TAG = "stylevaultai-20";

function getAmazonLink(item: Recommendation): string {
  const query = encodeURIComponent(`${item.name} ${item.brand}`);
  return `https://www.amazon.com/s?k=${query}&tag=${AMAZON_TAG}`;
}

// Pick a consistent image for any item name so it never changes when moving sections
function getItemImage(name: string): string {
  if (PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

interface Recommendation {
  name: string;
  brand: string;
  price: number;
  reason: string;
  match_score: number;
  tags: string[];
}

const ItemCard = ({
  item,
  index,
  isFav,
  onToggle,
}: {
  item: Recommendation;
  index: number;
  isFav: boolean;
  onToggle: (item: Recommendation) => void;
}) => {
  const img = getItemImage(item.name);
  return (
    <div className="card-elevated rounded-2xl overflow-hidden opacity-0 animate-slide-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex gap-4 p-4">
        <div className="w-24 h-24 rounded-xl flex-shrink-0 overflow-hidden">
          <img src={img} alt={item.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm leading-snug">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
            </div>
            <button
              onClick={() => onToggle(item)}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
            >
              <Heart className={`w-4.5 h-4.5 transition-all duration-200 ${isFav ? "fill-rose-500 text-rose-500 scale-110" : "text-muted-foreground hover:text-rose-400"}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-foreground">${item.price}</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary/70 text-secondary-foreground">
              <Star className="w-3 h-3 text-gold" />
              {item.match_score}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.reason}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {item.tags?.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground">{tag}</span>
            ))}
          </div>
          <a
            href={getAmazonLink(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold/70 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Shop on Amazon
          </a>
        </div>
      </div>
    </div>
  );
};

const Shop = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Recommendation[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        const saved = (data as any).favorites;
        if (Array.isArray(saved) && saved.length > 0) {
          if (typeof saved[0] === "object") {
            setFavorites(saved as Recommendation[]);
          } else {
            supabase.from("profiles").update({ favorites: [] } as any).eq("user_id", data.user_id);
          }
        }
      }
    });
  }, [user]);

  // Auto-generate on first visit once profile is ready
  useEffect(() => {
    if (profile && user && recommendations === null && !loading) {
      generateRecs();
    }
  }, [profile]);

  const generateRecs = async () => {
    if (!profile || !user) return;
    setLoading(true);
    try {
      const [{ data: closetItems }, { data: stylePhotoRows }] = await Promise.all([
        supabase.from("closet_items").select("name, category, color, season").eq("user_id", user.id),
        supabase.from("style_photos").select("storage_path").eq("user_id", user.id).limit(5),
      ]);

      const stylePhotos = (stylePhotoRows || [])
        .map((row) => supabase.storage.from("style-photos").getPublicUrl(row.storage_path).data.publicUrl)
        .filter((url) => !/\.heic$/i.test(url));

      const { data, error } = await supabase.functions.invoke("style-ai", {
        body: { type: "shopping", profile, closetItems: closetItems || [], stylePhotos },
      });
      if (error) throw error;
      if (data?.recommendations) setRecommendations(data.recommendations);
    } catch (e: any) {
      toast.error(e.message || "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: Recommendation[]) => {
    const { error } = await supabase
      .from("profiles")
      .update({ favorites: newFavorites } as any)
      .eq("user_id", user!.id);
    if (error) {
      console.error("Save favorite error:", error);
      toast.error("Failed to save favorite");
      return false;
    }
    return true;
  };

  const toggleFav = async (item: Recommendation) => {
    if (!user) return;
    const isFav = favorites.some((f) => f.name === item.name);
    const newFavorites = isFav
      ? favorites.filter((f) => f.name !== item.name)
      : [...favorites, item];
    setFavorites(newFavorites);
    const ok = await saveFavorites(newFavorites);
    if (!ok) setFavorites(favorites);
  };

  const budgetMap: Record<string, string> = {
    budget: "Under $50/mo",
    moderate: "$50–$150/mo",
    premium: "$150–$400/mo",
    luxury: "$400+/mo",
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
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
            className="text-gold hover:text-gold/80 hover:bg-gold/5 rounded-xl transition-all"
            onClick={generateRecs}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            {recommendations ? "Refresh" : "Generate"}
          </Button>
        </div>

        {/* Saved Favorites */}
        {favorites.length > 0 && (
          <div>
            <h3 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 fill-destructive text-destructive" />
              Saved
            </h3>
            <div className="space-y-3">
              {favorites.map((item, i) => (
                <ItemCard
                  key={item.name}
                  item={item}
                  index={i}
                  isFav={true}
                  onToggle={toggleFav}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        <div>
          {favorites.length > 0 && recommendations && (
            <h3 className="text-lg font-display font-semibold mb-3">Recommendations</h3>
          )}
          {recommendations ? (
            <div className="space-y-4">
              {recommendations
                .filter((item) => !favorites.some((f) => f.name === item.name))
                .map((item, i) => (
                  <ItemCard
                    key={item.name}
                    item={item}
                    index={i}
                    isFav={false}
                    onToggle={toggleFav}
                  />
                ))}
            </div>
          ) : (
            <div className="card-elevated rounded-2xl p-10 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tap Generate to get AI-powered shopping recommendations personalized to your style, closet, and budget.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Shop;
