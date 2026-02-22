import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, RefreshCw, Loader2 } from "lucide-react";
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

interface Weather {
  temp: number;
  condition: string;
  high: number;
  low: number;
  wind: number;
}

// Open-Meteo WMO weather code → readable condition
function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Sunny";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rainy";
  return "Stormy";
}

async function fetchWeather(location: string): Promise<Weather | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    const place = geoData.results?.[0];
    if (!place) return null;

    const { latitude, longitude } = place;
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`
    );
    const wxData = await wxRes.json();
    const current = wxData.current;
    const daily = wxData.daily;

    return {
      temp: Math.round(current.temperature_2m),
      condition: weatherCodeToCondition(current.weather_code),
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      wind: Math.round(current.wind_speed_10m),
    };
  } catch {
    return null;
  }
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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [aiOutfit, setAiOutfit] = useState<AIOutfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error && error.code !== "PGRST116") console.error("Profile load error:", error.message);
      if (!p) {
        navigate("/onboarding");
        return;
      }
      setProfile(p as any);
      if (p.location) {
        const wx = await fetchWeather(p.location);
        setWeather(wx);
      }
      setWeatherLoading(false);
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
    const condition = weather?.condition;
    if (condition === "Sunny") return <Sun className="w-8 h-8 text-gold" />;
    if (condition === "Cloudy" || condition === "Foggy") return <Cloud className="w-8 h-8 text-muted-foreground" />;
    if (condition === "Snowy") return <CloudSnow className="w-8 h-8 text-muted-foreground" />;
    return <CloudRain className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Greeting */}
        <div className="pt-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-3xl font-display font-semibold">
            {greeting()}, <span className="text-gold italic">{profile?.name || "there"}</span>
          </h2>
        </div>

        {/* Weather */}
        <div className="card-elevated rounded-2xl p-5">
          {weatherLoading ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-20 bg-secondary rounded-lg animate-pulse" />
                <div className="h-3 w-32 bg-secondary rounded-lg animate-pulse" />
              </div>
            </div>
          ) : weather ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--gold) / 0.1)" }}>
                  <WeatherIcon />
                </div>
                <div>
                  <p className="text-3xl font-display font-semibold">{weather.temp}°</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{profile?.location} · {weather.condition}</p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium">H:{weather.high}° L:{weather.low}°</p>
                <p className="flex items-center gap-1 justify-end"><Wind className="w-3 h-3" /> {weather.wind} mph</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Cloud className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Weather unavailable</p>
                <p className="text-xs opacity-70">
                  {profile?.location ? `Couldn't load weather for "${profile.location}"` : "Add your location in Profile"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Outfit Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold">Today's Outfit</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-gold hover:text-gold/80 hover:bg-gold/5 rounded-xl transition-all"
              onClick={generateOutfit}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              {aiOutfit ? "Regenerate" : "Generate"}
            </Button>
          </div>

          {aiOutfit ? (
            <div className="space-y-3">
              {aiOutfit.outfit.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 card-elevated rounded-2xl p-4 opacity-0 animate-slide-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-gold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{item.item}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.styling_tip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary/70 px-2.5 py-1 rounded-full flex-shrink-0">{item.category}</span>
                </div>
              ))}
              <div className="gradient-gold rounded-2xl p-5 text-primary-foreground mt-2 shadow-gold">
                <p className="font-display text-base font-semibold">Style Note</p>
                <p className="text-sm mt-1.5 opacity-90 leading-relaxed">{aiOutfit.style_note}</p>
                {aiOutfit.weather_tip && (
                  <p className="text-sm mt-3 opacity-80 border-t border-primary-foreground/20 pt-3 leading-relaxed">{aiOutfit.weather_tip}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card-elevated rounded-2xl p-10 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed">
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
