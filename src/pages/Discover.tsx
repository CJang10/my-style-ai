import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Compass, Loader2, ArrowLeftRight, Clock } from "lucide-react";
import { toast } from "sonner";

interface DiscoverItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_path: string | null;
  imageUrl?: string;
  available_to_trade: boolean;
  available_to_borrow: boolean;
  profiles: {
    username: string | null;
    city: string | null;
    styles: string[] | null;
    is_public: boolean;
  };
}

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"nearby" | "foryou">("nearby");
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userStyles, setUserStyles] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ username: string | null; is_public: boolean } | null>(null);
  const [hasPublicItem, setHasPublicItem] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user, tab, userCity, userStyles]);

  const loadProfile = async () => {
    if (!user) return;
    const [profileRes, itemRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("city, styles, username, is_public")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("closet_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_public", true),
    ]);
    if (profileRes.data) {
      setUserCity(profileRes.data.city || null);
      setUserStyles(profileRes.data.styles || []);
      setUserProfile({
        username: profileRes.data.username || null,
        is_public: profileRes.data.is_public ?? true,
      });
    }
    setHasPublicItem((itemRes.count ?? 0) > 0);
  };

  const loadItems = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("closet_items")
      .select("id, name, category, color, image_path, available_to_trade, available_to_borrow, profiles!inner(username, city, styles, is_public)")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .eq("profiles.is_public", true)
      .order("created_at", { ascending: false })
      .limit(60);

    if (tab === "nearby" && userCity) {
      query = query.eq("profiles.city", userCity);
    }

    const { data } = await query;

    if (data) {
      const withUrls = (data as any[]).map((item) => ({
        ...item,
        imageUrl: item.image_path
          ? supabase.storage.from("closet-items").getPublicUrl(item.image_path).data.publicUrl
          : null,
      }));

      if (tab === "foryou" && userStyles.length > 0) {
        const withScore = withUrls.map((item) => {
          const ownerStyles: string[] = item.profiles?.styles || [];
          const overlap = ownerStyles.filter((s: string) => userStyles.includes(s)).length;
          return { ...item, _score: overlap };
        });
        withScore.sort((a, b) => b._score - a._score);
        setItems(withScore);
      } else {
        setItems(withUrls);
      }
    } else {
      setItems([]);
    }

    setLoading(false);
  };

  const goToProfile = (username: string | null) => {
    if (username) {
      navigate(`/u/${username}`);
    } else {
      toast.info("This user hasn't set a username yet");
    }
  };

  // Split items into two columns for Pinterest-style layout
  const leftCol = items.filter((_, i) => i % 2 === 0);
  const rightCol = items.filter((_, i) => i % 2 !== 0);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-display font-semibold">
            Dis<span className="text-gold italic">cover</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real wardrobes, real people</p>
        </div>

        {/* Discoverability banner */}
        {userProfile && (!userProfile.username || !userProfile.is_public || !hasPublicItem) && (
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: "hsl(var(--gold) / 0.07)", border: "1px solid hsl(var(--gold) / 0.2)" }}
          >
            <span className="text-lg">✨</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gold">Complete your profile to get discovered</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  !userProfile.username && "Set a username",
                  !userProfile.is_public && "Make profile public",
                  !hasPublicItem && "Mark items as public",
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="text-xs text-gold font-semibold flex-shrink-0">Fix →</span>
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 bg-secondary/70 rounded-xl p-1">
          {(["nearby", "foryou"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "nearby" ? "Nearby" : "For You"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-56">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="card-elevated rounded-3xl text-center py-16 space-y-3">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: "hsl(var(--gold) / 0.09)" }}
            >
              <Compass className="w-7 h-7 text-gold" />
            </div>
            <div>
              <p className="font-display font-semibold text-base">
                {tab === "nearby" && !userCity
                  ? "Add your city to find nearby closets"
                  : "Nothing here yet"}
              </p>
              <p className="text-muted-foreground text-sm mt-1 max-w-[220px] mx-auto leading-relaxed">
                {tab === "nearby" && !userCity
                  ? "Go to Profile and update your city"
                  : "Check back as more people share their closets"}
              </p>
            </div>
          </div>
        ) : (
          /* Pinterest-style two-column masonry */
          <div className="flex gap-3">
            {[leftCol, rightCol].map((col, ci) => (
              <div key={ci} className="flex-1 flex flex-col gap-3">
                {col.map((item, i) => {
                  // Alternate tall/short for masonry feel
                  const tall = (ci === 0 ? i % 2 === 0 : i % 2 !== 0);
                  return (
                    <div
                      key={item.id}
                      onClick={() => goToProfile(item.profiles?.username)}
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-border/50 hover:ring-gold/25 hover:shadow-md transition-all duration-200"
                    >
                      {/* Photo */}
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: tall ? "3/4" : "4/5" }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: item.color || "#C4A882" }}
                          />
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                        {/* Badges */}
                        <div className="absolute bottom-2.5 left-2.5 flex gap-1">
                          {item.available_to_trade && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[10px] font-semibold text-foreground">
                              <ArrowLeftRight className="w-2.5 h-2.5" /> Trade
                            </span>
                          )}
                          {item.available_to_borrow && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[10px] font-semibold text-foreground">
                              <Clock className="w-2.5 h-2.5" /> Borrow
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold truncate leading-snug">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-4 h-4 rounded-full gradient-gold flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                            {(item.profiles?.username?.[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate">
                            @{item.profiles?.username || "user"}
                            {item.profiles?.city ? ` · ${item.profiles.city}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
