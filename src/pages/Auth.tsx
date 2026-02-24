import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/discover");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          navigate("/onboarding");
        } else {
          toast.success("Check your email to verify your account");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your email");
        setMode("login");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-display font-semibold">
          Style<span className="text-gold italic">Vault</span>
        </h1>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-sm mx-auto w-full">

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-4xl font-display font-bold tracking-tight leading-tight">
            {mode === "login" && <>Welcome<br /><span className="text-gold italic">back.</span></>}
            {mode === "signup" && <>Join the<br /><span className="text-gold italic">community.</span></>}
            {mode === "forgot" && <>Reset your<br /><span className="text-gold italic">password.</span></>}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {mode === "login" && "Sign in to discover closets near you."}
            {mode === "signup" && "Create your account and start exploring."}
            {mode === "forgot" && "We'll send a reset link to your email."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-13 rounded-2xl bg-white border border-border/70 px-4 py-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-gold transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="w-full h-13 rounded-2xl bg-white border border-border/70 px-4 py-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold hover:shadow-[0_8px_32px_-4px_hsl(var(--gold)/0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none mt-2"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </>
            }
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-8 text-center">
          {mode === "forgot" ? (
            <button
              onClick={() => setMode("login")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-gold font-semibold hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
