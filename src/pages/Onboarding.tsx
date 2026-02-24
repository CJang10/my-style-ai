import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Sparkles, X, Camera, AtSign, MapPin, Briefcase } from "lucide-react";
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

const STEPS = [
  { title: "Let's start with\nthe basics.", sub: "Tell us who you are." },
  { title: "Where are you\nbased?", sub: "We'll show you closets in your city." },
  { title: "What's your\naesthetic?", sub: "Pick everything that resonates." },
  { title: "Shopping\nbudget?", sub: "Helps us match you with traders." },
  { title: "Show off your\nvibe.", sub: "Photos help others know your style for trading and borrowing." },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [usernameError, setUsernameError] = useState("");
  const [profile, setProfile] = useState({
    name: "", age: "", username: "",
    location: "", occupation: "",
    styles: [] as string[], budget: "",
  });

  const toggleStyle = (id: string) => {
    setProfile((p) => ({
      ...p,
      styles: p.styles.includes(id) ? p.styles.filter((s) => s !== id) : [...p.styles, id],
    }));
  };

  const validateUsername = (val: string) => {
    if (val.length < 3) return "At least 3 characters";
    if (val.length > 20) return "20 characters max";
    if (!/^[a-z0-9_]+$/.test(val)) return "Letters, numbers, underscores only";
    return "";
  };

  const handleUsernameChange = (val: string) => {
    const lower = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setProfile({ ...profile, username: lower });
    setUsernameError(lower ? validateUsername(lower) : "");
  };

  const checkUsernameAvailable = async (): Promise<boolean> => {
    if (!profile.username) return false;
    const { data } = await supabase
      .from("profiles").select("user_id")
      .eq("username", profile.username)
      .neq("user_id", user?.id ?? "")
      .maybeSingle();
    if (data) { setUsernameError("Username already taken"); return false; }
    return true;
  };

  const canProceed = () => {
    if (step === 0) return profile.name && profile.age && profile.username && !usernameError;
    if (step === 1) return profile.location && profile.occupation;
    if (step === 2) return profile.styles.length > 0;
    if (step === 3) return profile.budget;
    return true;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 10 - photos.length);
    setPhotos([...photos, ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(photos[i].preview);
    setPhotos(photos.filter((_, idx) => idx !== i));
  };

  const handleFinish = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const profileData = {
        user_id: user.id,
        name: profile.name,
        age: parseInt(profile.age),
        username: profile.username,
        location: profile.location,
        city: profile.location,
        occupation: profile.occupation,
        styles: profile.styles,
        budget: profile.budget,
        is_public: true,
      };
      const { data: existing } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).single();
      const { error: profileError } = existing
        ? await supabase.from("profiles").update(profileData).eq("user_id", user.id)
        : await supabase.from("profiles").insert(profileData);
      if (profileError) throw profileError;

      for (const photo of photos) {
        const ext = photo.file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("style-photos").upload(path, photo.file);
        if (!uploadError) await supabase.from("style_photos").insert({ user_id: user.id, storage_path: path });
      }

      toast.success("Welcome to StyleVault!");
      navigate("/discover");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      const available = await checkUsernameAvailable();
      if (!available) return;
    }
    if (step < 4) setStep(step + 1);
    else handleFinish();
  };

  const inputClass = "w-full rounded-2xl bg-white border border-border/70 px-4 py-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all";

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Progress */}
      <div className="px-6 pt-8">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-gold" : "bg-border"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{step + 1} of 5</p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-md mx-auto w-full">
        <div className="animate-fade-in flex-1" key={step}>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold tracking-tight leading-tight whitespace-pre-line">
              {STEPS[step].title.split('\n').map((line, i, arr) =>
                i === arr.length - 1
                  ? <><span key={i} className="text-gold italic">{line}</span></>
                  : <span key={i}>{line}<br /></span>
              )}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{STEPS[step].sub}</p>
          </div>

          {/* Step 0: Name / Age / Username */}
          {step === 0 && (
            <div className="space-y-3">
              <input
                placeholder="Your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Age"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                className={inputClass}
              />
              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    placeholder="username"
                    value={profile.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`${inputClass} pl-8 ${usernameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                  />
                </div>
                {usernameError && <p className="text-xs text-destructive mt-1.5 pl-1">{usernameError}</p>}
                {profile.username && !usernameError && (
                  <p className="text-xs text-gold mt-1.5 pl-1 font-medium">@{profile.username} ✓</p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Location / Occupation */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="City (e.g. New York, NY)"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className={`${inputClass} pl-11`}
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Occupation"
                  value={profile.occupation}
                  onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>
          )}

          {/* Step 2: Style */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2.5">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStyle(s.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    profile.styles.includes(s.id)
                      ? "border-gold bg-white shadow-gold"
                      : "border-border bg-white hover:border-gold/40"
                  }`}
                >
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-2.5">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setProfile({ ...profile, budget: b.id })}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    profile.budget === b.id
                      ? "border-gold bg-white shadow-gold"
                      : "border-border bg-white hover:border-gold/40"
                  }`}
                >
                  <p className="font-semibold">{b.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Photos */}
          {step === 4 && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-gold/40 hover:bg-white/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Upload outfit photos</p>
                    <p className="text-xs text-muted-foreground mt-1">{photos.length}/10 uploaded · optional</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 rounded-2xl border-2 border-border bg-white text-sm font-semibold hover:border-gold/40 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold hover:shadow-[0_8px_32px_-4px_hsl(var(--gold)/0.45)] active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {uploading ? (
              "Saving..."
            ) : step === 4 ? (
              <><Sparkles className="w-4 h-4" /> Enter StyleVault</>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
