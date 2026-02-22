import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Sparkles, MapPin, Briefcase, Upload, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal", desc: "Clean lines, neutral tones" },
  { id: "streetwear", label: "Streetwear", desc: "Bold, urban, trend-driven" },
  { id: "classic", label: "Classic", desc: "Timeless, tailored, refined" },
  { id: "bohemian", label: "Bohemian", desc: "Relaxed, layered, earthy" },
  { id: "edgy", label: "Edgy", desc: "Sharp, dark, statement pieces" },
  { id: "preppy", label: "Preppy", desc: "Polished, collegiate, structured" },
  { id: "athleisure", label: "Athleisure", desc: "Sporty meets everyday" },
  { id: "romantic", label: "Romantic", desc: "Soft textures, flowing silhouettes" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "Under $50/mo", desc: "Smart finds, great value" },
  { id: "moderate", label: "$50 – $150/mo", desc: "Quality essentials" },
  { id: "premium", label: "$150 – $400/mo", desc: "Premium brands" },
  { id: "luxury", label: "$400+/mo", desc: "Designer & luxury" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    location: "",
    occupation: "",
    styles: [] as string[],
    budget: "",
  });

  const toggleStyle = (id: string) => {
    setProfile((p) => ({
      ...p,
      styles: p.styles.includes(id) ? p.styles.filter((s) => s !== id) : [...p.styles, id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return profile.name && profile.age;
    if (step === 1) return profile.location && profile.occupation;
    if (step === 2) return profile.styles.length > 0;
    if (step === 3) return profile.budget;
    return true; // step 4 (photos) is optional
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPhotos = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!user) return;
    setUploading(true);

    try {
      // Save profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: user.id,
        name: profile.name,
        age: parseInt(profile.age),
        location: profile.location,
        occupation: profile.occupation,
        styles: profile.styles,
        budget: profile.budget,
      });
      if (profileError) throw profileError;

      // Upload photos
      for (const photo of photos) {
        const ext = photo.file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("style-photos")
          .upload(path, photo.file);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        await supabase.from("style_photos").insert({
          user_id: user.id,
          storage_path: path,
        });
      }

      toast.success("Profile created! Welcome to StyleVault.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleFinish();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "gradient-gold" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="animate-fade-in" key={step}>
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Let's build your <span className="text-gold italic">style profile</span>
                </h1>
                <p className="text-muted-foreground mt-2">Tell us about yourself.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Your name</Label>
                  <Input placeholder="e.g. Alex" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1.5 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Age</Label>
                  <Input type="number" placeholder="e.g. 28" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} className="mt-1.5 bg-card border-border" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Where are you <span className="text-gold italic">based?</span>
                </h1>
                <p className="text-muted-foreground mt-2">For weather-aware styling.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> City</Label>
                  <Input placeholder="e.g. New York, NY" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="mt-1.5 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2"><Briefcase className="w-4 h-4 text-gold" /> Occupation</Label>
                  <Input placeholder="e.g. Designer, Student, Engineer" value={profile.occupation} onChange={(e) => setProfile({ ...profile, occupation: e.target.value })} className="mt-1.5 bg-card border-border" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Define your <span className="text-gold italic">aesthetic</span>
                </h1>
                <p className="text-muted-foreground mt-2">Pick all that resonate.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStyle(s.id)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      profile.styles.includes(s.id)
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Monthly <span className="text-gold italic">budget</span>
                </h1>
                <p className="text-muted-foreground mt-2">For shopping recommendations.</p>
              </div>
              <div className="space-y-3">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setProfile({ ...profile, budget: b.id })}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                      profile.budget === b.id
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <p className="font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Show us your <span className="text-gold italic">style</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Upload outfit photos — from Instagram, with friends, whatever shows your vibe. Up to 10 photos.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                      <img src={photo.preview} alt={`Outfit ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/70 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-background" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Upload outfit photos</p>
                    <p className="text-xs text-muted-foreground mt-1">{photos.length}/10 uploaded</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || uploading}
            className="flex-1 gradient-gold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {uploading ? (
              "Saving..."
            ) : step === 4 ? (
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Launch My Closet</span>
            ) : (
              <span className="flex items-center gap-2">Continue <ChevronRight className="w-4 h-4" /></span>
            )}
          </Button>
        </div>

        {step === 4 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Photos are optional — you can always add more later.
          </p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
