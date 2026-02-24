import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Edit2, Camera, Trash2, Loader2, Check, X, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal" }, { id: "streetwear", label: "Streetwear" },
  { id: "classic", label: "Classic" }, { id: "bohemian", label: "Bohemian" },
  { id: "edgy", label: "Edgy" }, { id: "preppy", label: "Preppy" },
  { id: "athleisure", label: "Athleisure" }, { id: "romantic", label: "Romantic" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "Under $50/mo" }, { id: "moderate", label: "$50–$150/mo" },
  { id: "premium", label: "$150–$400/mo" }, { id: "luxury", label: "$400+/mo" },
];

const BUDGET_MAP: Record<string, string> = {
  budget: "Under $50/mo", moderate: "$50–$150/mo", premium: "$150–$400/mo", luxury: "$400+/mo",
};

const inputClass = "w-full rounded-xl bg-background border border-border/60 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold/40 transition-all";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [stylePhotos, setStylePhotos] = useState<{ id: string; url: string; path: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ items: 0, followers: 0, following: 0 });
  const [editData, setEditData] = useState({
    name: "", age: "", location: "", occupation: "",
    styles: [] as string[], budget: "",
    username: "", bio: "", is_public: true,
  });

  useEffect(() => {
    if (!user) return;
    loadProfile(); loadPhotos(); loadStats();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) setProfile(data);
  };

  const loadPhotos = async () => {
    if (!user) return;
    const { data } = await supabase.from("style_photos").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setStylePhotos(data.map((p: any) => ({
      id: p.id, path: p.storage_path,
      url: supabase.storage.from("style-photos").getPublicUrl(p.storage_path).data.publicUrl,
    })));
  };

  const loadStats = async () => {
    if (!user) return;
    const [itemsRes, followersRes, followingRes] = await Promise.all([
      supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
    ]);
    setStats({ items: itemsRes.count ?? 0, followers: followersRes.count ?? 0, following: followingRes.count ?? 0 });
  };

  const startEditing = () => {
    setEditData({
      name: profile.name || "", age: profile.age?.toString() || "",
      location: profile.location || "", occupation: profile.occupation || "",
      styles: profile.styles || [], budget: profile.budget || "",
      username: profile.username || "", bio: profile.bio || "",
      is_public: profile.is_public ?? true,
    });
    setIsEditing(true);
  };

  const saveEditing = async () => {
    if (!user || !editData.name) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: editData.name, age: parseInt(editData.age) || profile.age,
      location: editData.location, city: editData.location, occupation: editData.occupation,
      styles: editData.styles, budget: editData.budget,
      username: editData.username || null, bio: editData.bio || null, is_public: editData.is_public,
    }).eq("user_id", user.id);
    if (error) { toast.error("Couldn't save changes"); }
    else {
      setProfile({ ...profile, ...editData, age: parseInt(editData.age) || profile.age, city: editData.location });
      setIsEditing(false); toast.success("Profile updated");
    }
    setSaving(false);
  };

  const toggleStyle = (id: string) => setEditData((d) => ({
    ...d, styles: d.styles.includes(id) ? d.styles.filter((s) => s !== id) : [...d.styles, id],
  }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!user || !files.length) return;
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("style-photos").upload(path, file);
      if (error) { toast.error("Failed to upload photo"); continue; }
      await supabase.from("style_photos").insert({ user_id: user.id, storage_path: path });
    }
    toast.success("Photos uploaded"); loadPhotos();
  };

  const deletePhoto = async (photo: { id: string; path: string }) => {
    await supabase.storage.from("style-photos").remove([photo.path]);
    await supabase.from("style_photos").delete().eq("id", photo.id);
    setStylePhotos(stylePhotos.filter((p) => p.id !== photo.id));
    toast.success("Photo removed");
  };

  if (!profile) return (
    <AppLayout>
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-4">

        {/* Username missing banner */}
        {!profile.username && !isEditing && (
          <button
            onClick={startEditing}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: "hsl(var(--gold)/0.07)", border: "1px solid hsl(var(--gold)/0.2)" }}
          >
            <span className="text-xl">👋</span>
            <div>
              <p className="text-sm font-semibold text-gold">Set your username to get discovered</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to add one now</p>
            </div>
          </button>
        )}

        {/* Avatar + identity */}
        <div className="text-center pt-2">
          <div className="w-24 h-24 rounded-full gradient-gold mx-auto flex items-center justify-center text-white text-4xl font-display font-bold shadow-gold ring-4 ring-background">
            {((isEditing ? editData.name : profile.name) || "?").charAt(0).toUpperCase()}
          </div>

          {isEditing ? (
            <div className="mt-5 space-y-3 max-w-xs mx-auto">
              <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Your name" className={`${inputClass} text-center font-semibold text-base`} />
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="username" className={`${inputClass} pl-8`} />
              </div>
              <div className="flex gap-2">
                <input type="number" value={editData.age} onChange={(e) => setEditData({ ...editData, age: e.target.value })} placeholder="Age" className={`${inputClass} text-center`} />
                <input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} placeholder="City" className={inputClass} />
              </div>
              <input value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} placeholder="Short bio…" className={inputClass} />
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              <h2 className="text-2xl font-display font-bold">{profile.name}</h2>
              {profile.username && <p className="text-sm text-gold font-semibold">@{profile.username}</p>}
              <p className="text-sm text-muted-foreground">{[profile.location, profile.age && `${profile.age} yrs`].filter(Boolean).join(" · ")}</p>
              {profile.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">{profile.bio}</p>}
            </div>
          )}
        </div>

        {/* Stats row */}
        {!isEditing && (
          <div className="flex bg-white rounded-2xl shadow-sm ring-1 ring-border/40 overflow-hidden divide-x divide-border/40">
            {[{ label: "Items", value: stats.items }, { label: "Followers", value: stats.followers }, { label: "Following", value: stats.following }].map(({ label, value }) => (
              <div key={label} className="flex-1 py-3.5 text-center">
                <p className="text-xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Style tags */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-border/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Style</p>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((s) => (
                <button key={s.id} onClick={() => toggleStyle(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${editData.styles.includes(s.id) ? "gradient-gold text-white shadow-gold" : "bg-background text-muted-foreground border border-border/60 hover:border-gold/40"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(profile.styles || []).map((s: string) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-background text-xs font-semibold capitalize">{s}</span>
              ))}
              {(!profile.styles || profile.styles.length === 0) && <p className="text-sm text-muted-foreground">No styles set</p>}
            </div>
          )}
        </div>

        {/* Budget */}
        {!isEditing && profile.budget && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-border/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Budget</p>
            <p className="font-semibold text-sm">{BUDGET_MAP[profile.budget] || profile.budget}</p>
          </div>
        )}
        {isEditing && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-border/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Budget</p>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button key={b.id} onClick={() => setEditData({ ...editData, budget: b.id })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all ${editData.budget === b.id ? "gradient-gold text-white shadow-gold" : "bg-background border border-border/60 text-muted-foreground hover:border-gold/40"}`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Discoverability toggle */}
        {isEditing && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-border/40 p-4">
            <button
              onClick={() => setEditData((d) => ({ ...d, is_public: !d.is_public }))}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {editData.is_public ? <Globe className="w-5 h-5 text-gold" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                <div className="text-left">
                  <p className="font-semibold text-sm">{editData.is_public ? "Discoverable" : "Private"}</p>
                  <p className="text-xs text-muted-foreground">{editData.is_public ? "Your public items appear in Discover" : "Your closet is hidden"}</p>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${editData.is_public ? "bg-gold" : "bg-border"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${editData.is_public ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>
          </div>
        )}

        {/* Style Photos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-display font-semibold">Style Photos</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:opacity-80 transition-opacity">
              <Camera className="w-4 h-4" /> Add
            </button>
          </div>
          {stylePhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {stylePhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden group ring-1 ring-border/40">
                  <img src={photo.url} alt="Style" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  <button onClick={() => deletePhoto(photo)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 items-center justify-center hidden group-hover:flex">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-gold/40 hover:bg-white/50 transition-all">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">Add style photos</p>
              <p className="text-xs text-muted-foreground mt-1">Help others know your vibe</p>
            </button>
          )}
        </div>

        {/* Actions */}
        {isEditing ? (
          <div className="flex gap-3">
            <button onClick={saveEditing} disabled={saving || !editData.name} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl gradient-gold text-white font-semibold shadow-gold disabled:opacity-40 disabled:pointer-events-none transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
            </button>
            <button onClick={() => setIsEditing(false)} disabled={saving} className="px-5 py-4 rounded-2xl border-2 border-border bg-white font-semibold hover:border-gold/40 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={startEditing} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-border bg-white font-semibold text-sm hover:border-gold/40 transition-all">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
            <button onClick={async () => { await signOut(); navigate("/"); }} className="px-5 py-4 rounded-2xl border-2 border-border bg-white text-destructive hover:border-destructive/40 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Profile;
