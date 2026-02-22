import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { LogOut, Edit } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("stylevault_profile");
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const handleReset = () => {
    localStorage.removeItem("stylevault_profile");
    navigate("/");
  };

  if (!profile) return null;

  const styleMap: Record<string, string> = {
    minimal: "🤍 Minimal",
    streetwear: "🔥 Streetwear",
    classic: "👔 Classic",
    bohemian: "🌿 Bohemian",
    edgy: "⚡ Edgy",
    preppy: "🎓 Preppy",
    athleisure: "🏃 Athleisure",
    romantic: "🌸 Romantic",
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
                <span key={s} className="text-sm px-3 py-1 rounded-full bg-secondary">
                  {styleMap[s] || s}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Budget</p>
            <p className="font-medium">{budgetMap[profile.budget] || profile.budget}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleReset}>
            <LogOut className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
