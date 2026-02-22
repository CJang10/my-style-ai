import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Cloud, MapPin, Briefcase, User, DollarSign, Shirt, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal", emoji: "🤍" },
  { id: "streetwear", label: "Streetwear", emoji: "🔥" },
  { id: "classic", label: "Classic", emoji: "👔" },
  { id: "bohemian", label: "Bohemian", emoji: "🌿" },
  { id: "edgy", label: "Edgy", emoji: "⚡" },
  { id: "preppy", label: "Preppy", emoji: "🎓" },
  { id: "athleisure", label: "Athleisure", emoji: "🏃" },
  { id: "romantic", label: "Romantic", emoji: "🌸" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "Under $50/mo", icon: "$" },
  { id: "moderate", label: "$50–$150/mo", icon: "$$" },
  { id: "premium", label: "$150–$400/mo", icon: "$$$" },
  { id: "luxury", label: "$400+/mo", icon: "$$$$" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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
      styles: p.styles.includes(id)
        ? p.styles.filter((s) => s !== id)
        : [...p.styles, id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return profile.name && profile.age;
    if (step === 1) return profile.location && profile.occupation;
    if (step === 2) return profile.styles.length > 0;
    if (step === 3) return profile.budget;
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      localStorage.setItem("stylevault_profile", JSON.stringify(profile));
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
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
                  Welcome to <span className="text-gold italic">StyleVault</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Let's personalize your closet experience.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Your name</Label>
                  <Input
                    placeholder="e.g. Alex"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1.5 bg-card border-border"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Age</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 28"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    className="mt-1.5 bg-card border-border"
                  />
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
                <p className="text-muted-foreground mt-2">
                  We'll use this for weather-aware styling.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold" /> City
                  </Label>
                  <Input
                    placeholder="e.g. New York, NY"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="mt-1.5 bg-card border-border"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gold" /> Occupation
                  </Label>
                  <Input
                    placeholder="e.g. Designer, Student, Engineer"
                    value={profile.occupation}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                    className="mt-1.5 bg-card border-border"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight">
                  Your <span className="text-gold italic">style</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                  Pick all that resonate with you.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStyle(s.id)}
                    className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                      profile.styles.includes(s.id)
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <p className="mt-1 font-medium text-sm">{s.label}</p>
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
                <p className="text-muted-foreground mt-2">
                  For shopping recommendations.
                </p>
              </div>
              <div className="space-y-3">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setProfile({ ...profile, budget: b.id })}
                    className={`w-full p-4 rounded-lg border text-left transition-all duration-200 flex items-center justify-between ${
                      profile.budget === b.id
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="font-medium">{b.label}</span>
                    <span className="text-muted-foreground text-sm">{b.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 gradient-gold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {step === 3 ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Launch My Closet
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
