import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Loader2, UserPlus, UserMinus, ArrowLeftRight, Clock } from "lucide-react";
import { toast } from "sonner";
import TradeRequestSheet from "@/components/TradeRequestSheet";

interface PublicUser {
  user_id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  city: string | null;
  styles: string[] | null;
}

interface PublicItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_path: string | null;
  imageUrl?: string;
  available_to_trade: boolean;
  available_to_borrow: boolean;
  estimated_value: number | null;
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"trade" | "borrow">("trade");

  useEffect(() => {
    if (username) loadProfile();
  }, [username]);

  useEffect(() => {
    if (profile && user) loadFollowState();
  }, [profile, user]);

  const loadProfile = async () => {
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles").select("user_id, username, name, bio, city, styles")
      .eq("username", username).eq("is_public", true).single();

    if (!profileData) { setLoading(false); return; }
    setProfile(profileData);

    const { data: itemData } = await supabase
      .from("closet_items")
      .select("id, name, category, color, image_path, available_to_trade, available_to_borrow, estimated_value")
      .eq("user_id", profileData.user_id).eq("is_public", true)
      .order("created_at", { ascending: false });

    if (itemData) setItems(itemData.map((item: any) => ({
      ...item,
      imageUrl: item.image_path ? supabase.storage.from("closet-items").getPublicUrl(item.image_path).data.publicUrl : null,
    })));
    setLoading(false);
  };

  const loadFollowState = async () => {
    if (!user || !profile) return;
    const [followRow, countRow] = await Promise.all([
      supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.user_id).maybeSingle(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.user_id),
    ]);
    setIsFollowing(!!followRow.data);
    setFollowerCount(countRow.count ?? 0);
  };

  const toggleFollow = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
      setIsFollowing(false); setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.user_id });
      setIsFollowing(true); setFollowerCount((c) => c + 1);
    }
    setFollowLoading(false);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );

  if (!profile) return (
    <AppLayout>
      <div className="text-center py-20 space-y-3">
        <p className="font-display font-semibold text-lg">User not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-gold hover:underline">Go back</button>
      </div>
    </AppLayout>
  );

  const isOwnProfile = user?.id === profile.user_id;

  // Pinterest masonry
  const leftCol = items.filter((_, i) => i % 2 === 0);
  const rightCol = items.filter((_, i) => i % 2 !== 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile header */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full gradient-gold mx-auto flex items-center justify-center text-white text-4xl font-display font-bold shadow-gold ring-4 ring-background">
            {(profile.username?.[0] || profile.name?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">{profile.name || profile.username}</h2>
            {profile.username && <p className="text-sm text-gold font-semibold mt-0.5">@{profile.username}</p>}
            {profile.city && <p className="text-xs text-muted-foreground mt-1">{profile.city}</p>}
            {profile.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">{profile.bio}</p>}
          </div>

          {/* Style tags */}
          {profile.styles && profile.styles.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {profile.styles.map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold capitalize ring-1 ring-border/50">{s}</span>
              ))}
            </div>
          )}

          {/* Follow row */}
          {!isOwnProfile && (
            <div className="flex items-center justify-center gap-5">
              <div className="text-center">
                <p className="font-display font-bold text-lg">{followerCount}</p>
                <p className="text-xs text-muted-foreground">followers</p>
              </div>
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                  isFollowing
                    ? "border-2 border-border bg-white hover:border-gold/40"
                    : "gradient-gold text-white shadow-gold hover:shadow-[0_4px_20px_-4px_hsl(var(--gold)/0.5)]"
                }`}
              >
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>
                }
              </button>
            </div>
          )}
        </div>

        {/* Closet grid */}
        <div>
          <h3 className="font-display font-semibold text-lg mb-3">
            Closet <span className="text-muted-foreground font-normal text-sm">({items.length})</span>
          </h3>
          {items.length === 0 ? (
            <div className="bg-white rounded-3xl text-center py-12 ring-1 ring-border/40">
              <p className="text-sm text-muted-foreground">No public items yet</p>
            </div>
          ) : (
            <div className="flex gap-3">
              {[leftCol, rightCol].map((col, ci) => (
                <div key={ci} className="flex-1 flex flex-col gap-3">
                  {col.map((item, i) => {
                    const tall = ci === 0 ? i % 2 === 0 : i % 2 !== 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => { setSelectedItem(item); setItemSheetOpen(true); }}
                        className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-border/50 hover:ring-gold/25 hover:shadow-md transition-all duration-200"
                      >
                        <div className="relative overflow-hidden" style={{ aspectRatio: tall ? "3/4" : "4/5" }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                          ) : (
                            <div className="w-full h-full" style={{ backgroundColor: item.color || "#C4A882" }} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {item.available_to_trade && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[9px] font-bold"><ArrowLeftRight className="w-2 h-2" /> Trade</span>}
                            {item.available_to_borrow && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[9px] font-bold"><Clock className="w-2 h-2" /> Borrow</span>}
                          </div>
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="text-[13px] font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item detail sheet */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-4 pb-4">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">{selectedItem.name}</SheetTitle>
              </SheetHeader>
              <div className="aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: selectedItem.color || "#C4A882" }} />
                )}
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <span className="px-3 py-1.5 rounded-full bg-background text-xs font-semibold ring-1 ring-border/50">{selectedItem.category}</span>
                {selectedItem.available_to_trade && <span className="px-3 py-1.5 rounded-full bg-background text-xs font-semibold ring-1 ring-border/50 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" /> Trade</span>}
                {selectedItem.available_to_borrow && <span className="px-3 py-1.5 rounded-full bg-background text-xs font-semibold ring-1 ring-border/50 flex items-center gap-1"><Clock className="w-3 h-3" /> Borrow{selectedItem.estimated_value ? ` · $${(selectedItem.estimated_value / 100).toFixed(0)} deposit` : ""}</span>}
              </div>
              {!isOwnProfile && (
                <div className="flex gap-3 pt-1">
                  {selectedItem.available_to_trade && (
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold"
                      onClick={() => { setTradeType("trade"); setItemSheetOpen(false); setTradeSheetOpen(true); }}
                    >
                      <ArrowLeftRight className="w-4 h-4" /> Request Trade
                    </button>
                  )}
                  {selectedItem.available_to_borrow && (
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl border-2 border-border bg-white font-semibold text-sm hover:border-gold/40 transition-all"
                      onClick={() => { setTradeType("borrow"); setItemSheetOpen(false); setTradeSheetOpen(true); }}
                    >
                      <Clock className="w-4 h-4" /> Request Borrow
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {selectedItem && profile && (
        <TradeRequestSheet
          open={tradeSheetOpen}
          onOpenChange={setTradeSheetOpen}
          type={tradeType}
          requestedItem={selectedItem}
          ownerId={profile.user_id}
          ownerUsername={profile.username || profile.name || "user"}
          onSuccess={() => { setTradeSheetOpen(false); toast.success("Request sent!"); }}
        />
      )}
    </AppLayout>
  );
};

export default PublicProfile;
