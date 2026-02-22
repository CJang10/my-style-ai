import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Edit, Camera, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STYLE_MAP: Record<string, string> = {
  minimal: "Minimal",
  streetwear: "Streetwear",
  classic: "Classic",
  bohemian: "Bohemian",
  edgy: "Edgy",
  preppy: "Preppy",
  athleisure: "Athleisure",
  romantic: "Romantic",
};

const BUDGET_MAP: Record<string, string> = {
  budget: "Under $50/mo",
  moderate: "$50–$150/mo",
  premium: "$150–$400/mo",
  luxury: "$400+/mo",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stylePhotos, setStylePhotos] = useState<{ id: string; url: string; path: string }[]>([]);

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
    const { data } = await supabase.from("style_photos").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) {
      setStylePhotos(
        data.map((p: any) => ({
          id: p.id,
          path: p.storage_path,
          url: supabase.storage.from("style-photos").getPublicUrl(p.storage_path).data.publicUrl,
        }))
      );
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!user || files.length === 0) return;

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("style-photos").upload(path, file);
      if (uploadErr) {
        toast.error("Failed to upload photo");
        continue;
      }
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

  if (!profile) return null;

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full gradient-gold mx-auto flex items-center justify-center text-primary-foreground text-2xl font-display font-bold">
            {profile.name?.charAt(0)?.toUpperCase()}
          </div>
          <h2 className="text-2xl font-display font-semibold mt-4">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.location} · {profile.age} years old</p>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Occupation</p>
            <p className="font-medium">{profile.occupation}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Style</p>
            <div className="flex flex-wrap gap-2">
              {profile.styles?.map((s: string) => (
                <span key={s} className="text-sm px-3 py-1 rounded-full bg-secondary">{STYLE_MAP[s] || s}</span>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Budget</p>
            <p className="font-medium">{BUDGET_MAP[profile.budget] || profile.budget}</p>
          </div>
        </div>

        {/* Style Photos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-display font-semibold">Style Photos</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <Button variant="ghost" size="sm" className="text-gold" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {stylePhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {stylePhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={photo.url} alt="Style" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/60 items-center justify-center hidden group-hover:flex"
                  >
                    <Trash2 className="w-3 h-3 text-background" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Upload outfit photos to improve your recommendations.</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/onboarding")}>
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
