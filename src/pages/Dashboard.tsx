import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Cloud, CloudRain, Wind, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Profile {
  name: string;
  location: string;
  occupation: string;
  styles: string[];
  budget: string;
  age: number;
}

interface OutfitItem {
  item: string;
  category: string;
  styling_tip: string;
}

interface AIOutfit {
  outfit: OutfitItem[];
  style_note: string;
  weather_tip: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [aiOutfit, setAiOutfit] = useState<AIOutfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather] = useState({ temp: 72, condition: "Sunny", high: 78, low: 62, wind: 8 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) setProfile(p as any);
      const { data: items } = await supabase.from("closet_items").select("*").eq("user_id", user.id);
      if (items) setClosetItems(items);
    };
    load();
  }, [user]);

  const generateOutfit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("style-ai", {
        body: {
          type: "daily-outfit",
          profile,
          closetItems: closetItems.map((i) => ({ name: i.name, category: i.category, color: i.color, season: i.season })),
          weather,
        },
      });
      if (error) throw error;
      if (data?.outfit) setAiOutfit(data);
      else toast.info("Add some items to your closet first for personalized outfits!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate outfit");
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const WeatherIcon = () => {
    if (weather.condition === "Sunny") return <Sun className="w-8 h-8 text-gold" />;
    if (weather.condition === "Cloudy") return <Cloud className="w-8 h-8 text-muted-foreground" />;
    return <CloudRain className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-3xl font-display font-semibold mt-1">
            {greeting()}, <span className="text-gold italic">{profile?.name || "there"}</span>
          </h2>
        </div>

        {/* Weather */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <WeatherIcon />
              <div>
                <p className="text-3xl font-display font-semibold">{weather.temp}°F</p>
                <p className="text-sm text-muted-foreground">{profile?.location || "Your city"}</p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground space-y-1">
              <p>H: {weather.high}° L: {weather.low}°</p>
              <p className="flex items-center gap-1 justify-end"><Wind className="w-3 h-3" /> {weather.wind} mph</p>
            </div>
          </div>
        </div>

        {/* AI Outfit Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold">Today's Outfit</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-gold hover:text-gold/80"
              onClick={generateOutfit}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {aiOutfit ? "Regenerate" : "Generate"}
            </Button>
          </div>

          {aiOutfit ? (
            <div className="space-y-3">
              {aiOutfit.outfit.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 animate-slide-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.item}</p>
                    <p className="text-xs text-muted-foreground">{item.styling_tip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{item.category}</span>
                </div>
              ))}
              <div className="gradient-gold rounded-xl p-5 text-primary-foreground mt-4">
                <p className="font-display text-base font-semibold">Style Note</p>
                <p className="text-sm mt-1 opacity-90">{aiOutfit.style_note}</p>
                {aiOutfit.weather_tip && (
                  <p className="text-sm mt-2 opacity-80 border-t border-primary-foreground/20 pt-2">{aiOutfit.weather_tip}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {closetItems.length === 0
                  ? "Add items to your closet, then generate your first AI outfit."
                  : "Tap Generate to get your personalized outfit for today."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
