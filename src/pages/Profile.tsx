import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Edit, Camera, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal" },
  { id: "streetwear", label: "Streetwear" },
  { id: "classic", label: "Classic" },
  { id: "bohemian", label: "Bohemian" },
  { id: "edgy", label: "Edgy" },
  { id: "preppy", label: "Preppy" },
  { id: "athleisure", label: "Athleisure" },
  { id: "romantic", label: "Romantic" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "Under $50/mo" },
  { id: "moderate", label: "$50 – $150/mo" },
  { id: "premium", label: "$150 – $400/mo" },
  { id: "luxury", label: "$400+/mo" },
];

const STYLE_MAP: Record<string, string> = {
  minimal: "Minimal", streetwear: "Streetwear", classic: "Classic",
  bohemian: "Bohemian", edgy: "Edgy", preppy: "Preppy",
  athleisure: "Athleisure", romantic: "Romantic",
};

const BUDGET_MAP: Record<string, string> = {
  budget: "Under $50/mo", moderate: "$50–$150/mo",
  premium: "$150–$400/mo", luxury: "$400+/mo",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [stylePhotos, setStylePhotos] = useState<{ id: string; url: string; path: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: "", age: "", location: "", occupation: "",
    styles: [] as string[], budget: "",
  });

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadPhotos();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) setProfile(data);
  };

  const loadPhotos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("style_photos").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setStylePhotos(data.map((p: any) => ({
        id: p.id,
        path: p.storage_path,
        url: supabase.storage.from("style-photos").getPublicUrl(p.storage_path).data.publicUrl,
      })));
    }
  };

  const startEditing = () => {
    setEditData({
      name: profile.name || "",
      age: profile.age?.toString() || "",
      location: profile.location || "",
      occupation: profile.occupation || "",
      styles: profile.styles || [],
      budget: profile.budget || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const saveEditing = async () => {
    if (!user || !editData.name) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: editData.name,
      age: parseInt(editData.age) || profile.age,
      location: editData.location,
      occupation: editData.occupation,
      styles: editData.styles,
      budget: editData.budget,
    }).eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save changes");
    } else {
      setProfile({ ...profile, ...editData, age: parseInt(editData.age) || profile.age });
      setIsEditing(false);
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  const toggleStyle = (id: string) => {
    setEditData((d) => ({
      ...d,
      styles: d.styles.includes(id) ? d.styles.filter((s) => s !== id) : [...d.styles, id],
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!user || files.length === 0) return;
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("style-photos").upload(path, file);
      if (uploadErr) { toast.error("Failed to upload photo"); continue; }
      await supabase.from("style_photos").insert({ user_id: user.id, storage_path: path });
    }
    toast.success("Photos uploaded");
    loadPhotos();
  };

  const deletePhoto = async (photo: { id: string; path: string }) => {
    await supabase.storage.from("style-photos").remove([photo.path]);
    await supabase.from("style_photos").delete().eq("id", photo.id);
    setStylePhotos(stylePhotos.filter((p) => p.id !== photo.id));
    toast.success("Photo removed");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">

        {/* Avatar + name */}
        <div className="text-center">
          <div
            className="w-22 h-22 rounded-full gradient-gold mx-auto flex items-center justify-center text-primary-foreground text-3xl font-display font-bold shadow-gold"
            style={{ width: "5.5rem", height: "5.5rem" }}
          >
            {(isEditing ? editData.name : profile.name)?.charAt(0)?.toUpperCase()}
          </div>
          {isEditing ? (
            <div className="mt-4 space-y-2 max-w-xs mx-auto">
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Your name"
                className="text-center bg-card rounded-xl font-semibold text-lg"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={editData.age}
                  onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                  placeholder="Age"
                  className="bg-card rounded-xl text-center"
                />
                <Input
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="City"
                  className="bg-card rounded-xl"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-display font-semibold mt-4">{profile.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{profile.location} · {profile.age} years old</p>
            </>
          )}
        </div>

        {/* Occupation */}
        <div className="card-elevated rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-medium">Occupation</p>
          {isEditing ? (
            <Input
              value={editData.occupation}
              onChange={(e) => setEditData({ ...editData, occupation: e.target.value })}
              placeholder="e.g. Designer, Engineer, Student"
              className="bg-card rounded-xl"
            />
          ) : (
            <p className="font-medium">{profile.occupation}</p>
          )}
        </div>

        {/* Styles */}
        <div className="card-elevated rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">Style</p>
          {isEditing ? (
            <div className="grid grid-cols-4 gap-2">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStyle(s.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium text-center transition-all duration-150 ${
                    editData.styles.includes(s.id)
                      ? "gradient-gold text-primary-foreground shadow-gold"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.styles?.map((s: string) => (
                <span key={s} className="text-sm px-3 py-1 rounded-full bg-secondary font-medium">
                  {STYLE_MAP[s] || s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="card-elevated rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-medium">Budget</p>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setEditData({ ...editData, budget: b.id })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-all duration-150 ${
                    editData.budget === b.id
                      ? "gradient-gold text-primary-foreground shadow-gold"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/60"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-medium">{BUDGET_MAP[profile.budget] || profile.budget}</p>
          )}
        </div>

        {/* Style Photos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-display font-semibold">Style Photos</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <Button
              variant="ghost" size="sm"
              className="text-gold hover:text-gold/80 hover:bg-gold/5 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {stylePhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {stylePhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden ring-1 ring-border/40 group">
                  <img src={photo.url} alt="Style" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/70 backdrop-blur-sm items-center justify-center hidden group-hover:flex"
                  >
                    <Trash2 className="w-3 h-3 text-background" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-elevated rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload outfit photos to improve your AI recommendations.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isEditing ? (
          <div className="flex gap-3 pb-2">
            <Button
              onClick={saveEditing}
              disabled={saving || !editData.name}
              className="flex-1 gradient-gold text-primary-foreground rounded-xl shadow-gold"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-xl border-border/70 hover:bg-secondary/60"
            >
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 pb-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-border/70 hover:bg-secondary/60 transition-all"
              onClick={startEditing}
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-border/70 text-destructive hover:text-destructive hover:bg-destructive/5 transition-all"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Profile;
