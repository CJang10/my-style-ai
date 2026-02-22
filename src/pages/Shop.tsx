import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { ExternalLink, Heart, Star, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MOCK_RECOMMENDATIONS = [
  {
    id: "1",
    name: "Italian Wool Overcoat",
    brand: "COS",
    price: 250,
    image: "#3D3D3D",
    match: 96,
    reason: "Fills your outerwear gap for winter",
    tags: ["Winter", "Classic"],
  },
  {
    id: "2",
    name: "Merino Crew Neck",
    brand: "Uniqlo",
    price: 40,
    image: "#8B4513",
    match: 93,
    reason: "Versatile layering piece for your palette",
    tags: ["All-Season", "Minimal"],
  },
  {
    id: "3",
    name: "Slim Selvedge Denim",
    brand: "A.P.C.",
    price: 220,
    image: "#1A1A3E",
    match: 91,
    reason: "Upgrade from your current wash",
    tags: ["Fall", "Classic"],
  },
  {
    id: "4",
    name: "Canvas Tote",
    brand: "Everlane",
    price: 48,
    image: "#D4C5A9",
    match: 89,
    reason: "Completes your accessory collection",
    tags: ["Everyday", "Minimal"],
  },
  {
    id: "5",
    name: "Suede Desert Boots",
    brand: "Clarks",
    price: 130,
    image: "#B8A088",
    match: 87,
    reason: "Perfect with your chinos and blazers",
    tags: ["Fall", "Classic"],
  },
  {
    id: "6",
    name: "Linen Camp Collar Shirt",
    brand: "Abercrombie",
    price: 65,
    image: "#E8DDD0",
    match: 85,
    reason: "Summer essential you're missing",
    tags: ["Summer", "Bohemian"],
  },
];

const Shop = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("stylevault_profile");
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const toggleFav = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const budgetLabel = () => {
    const map: Record<string, string> = {
      budget: "Under $50/mo",
      moderate: "$50–$150/mo",
      premium: "$150–$400/mo",
      luxury: "$400+/mo",
    };
    return profile?.budget ? map[profile.budget] || "" : "";
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-display font-semibold">
            For <span className="text-gold italic">You</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Picks based on your style, closet gaps & {budgetLabel() || "budget"}
          </p>
        </div>

        <div className="space-y-4">
          {MOCK_RECOMMENDATIONS.map((item, i) => (
            <div
              key={item.id}
              className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex gap-4 p-4">
                <div
                  className="w-24 h-24 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: item.image }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    </div>
                    <button
                      onClick={() => toggleFav(item.id)}
                      className="flex-shrink-0"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          favorites.includes(item.id)
                            ? "fill-destructive text-destructive"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-semibold">${item.price}</span>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Star className="w-3 h-3 text-gold" />
                      {item.match}% match
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1.5">{item.reason}</p>

                  <div className="flex gap-1.5 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Shop;
