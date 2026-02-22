import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Sun, Cloud, CloudRain, Thermometer, RefreshCw, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_WEATHER = {
  temp: 72,
  condition: "Sunny",
  humidity: 45,
  wind: 8,
  high: 78,
  low: 62,
};

const OUTFIT_ITEMS = [
  { name: "Cream Linen Blazer", category: "Outerwear", color: "#F5E6D3" },
  { name: "Navy Fitted Tee", category: "Top", color: "#2C3E50" },
  { name: "Tan Chinos", category: "Bottoms", color: "#C4A882" },
  { name: "White Leather Sneakers", category: "Shoes", color: "#FAFAFA" },
  { name: "Gold Watch", category: "Accessory", color: "#D4A843" },
];

const WeatherIcon = ({ condition }: { condition: string }) => {
  if (condition === "Sunny") return <Sun className="w-8 h-8 text-gold" />;
  if (condition === "Cloudy") return <Cloud className="w-8 h-8 text-muted-foreground" />;
  return <CloudRain className="w-8 h-8 text-muted-foreground" />;
};

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("stylevault_profile");
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Greeting */}
        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-3xl font-display font-semibold mt-1">
            {greeting()}, <span className="text-gold italic">{profile?.name || "there"}</span>
          </h2>
        </div>

        {/* Weather Card */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <WeatherIcon condition={MOCK_WEATHER.condition} />
              <div>
                <p className="text-3xl font-display font-semibold">{MOCK_WEATHER.temp}°F</p>
                <p className="text-sm text-muted-foreground">{profile?.location || "Your city"}</p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground space-y-1">
              <p>H: {MOCK_WEATHER.high}° L: {MOCK_WEATHER.low}°</p>
              <p className="flex items-center gap-1 justify-end">
                <Wind className="w-3 h-3" /> {MOCK_WEATHER.wind} mph
              </p>
            </div>
          </div>
        </div>

        {/* Today's Outfit */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold">Today's Outfit</h3>
            <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
              <RefreshCw className="w-4 h-4 mr-1" /> Shuffle
            </Button>
          </div>

          <div className="space-y-3">
            {OUTFIT_ITEMS.map((item, i) => (
              <div
                key={item.name}
                className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 animate-slide-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-14 h-14 rounded-lg border border-border flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Style Tip */}
        <div className="gradient-gold rounded-xl p-5 text-primary-foreground">
          <p className="font-display text-lg font-semibold">Style Tip</p>
          <p className="text-sm mt-1 opacity-90">
            Light layers work perfectly for today's weather. The linen blazer keeps it sharp 
            without overheating — perfect for {profile?.occupation || "your day"}.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
