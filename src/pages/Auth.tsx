import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import PasswordStrengthBar, { checkPasswordRules, allRulesPass } from "@/components/PasswordStrengthBar";
import { CheckCircle2, XCircle, Eye, EyeOff, Mail, Lock } from "lucide-react";

type AuthMode = "login" | "signup" | "reset" | "pending";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const Auth = () => {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");

  // Login
  const [identifier, setIdentifier] = useState("");
  // Signup / Reset
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // DOB
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");

  // Gender
  const [gender, setGender] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Username uniqueness
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available" | "too_short">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (mode !== "signup" || !username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    if (username.trim().length < 3) {
      setUsernameStatus("too_short");
      return;
    }
    setUsernameStatus("checking");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc("get_email_by_username", { p_username: username.trim() });
      setUsernameStatus(data ? "taken" : "available");
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [username, mode]);

  if (!loading && user) {
    const pendingInvite = localStorage.getItem("pendingInvite");
    if (pendingInvite) {
      localStorage.removeItem("pendingInvite");
      return <Navigate to={`/invite/${pendingInvite}`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const daysInMonth = dobMonth && dobYear
    ? new Date(Number(dobYear), MONTHS.indexOf(dobMonth) + 1, 0).getDate()
    : 31;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!identifier.trim()) {
        toast({ title: t("auth.emailRequired"), variant: "destructive" });
        return;
      }
    } else if (mode === "signup") {
      if (!email.trim()) {
        toast({ title: t("auth.emailRequired"), variant: "destructive" });
        return;
      }
      if (!username.trim()) {
        toast({ title: t("auth.usernameRequired"), variant: "destructive" });
        return;
      }
      if (username.trim().length < 3) {
        toast({ title: t("auth.usernameTooShort"), variant: "destructive" });
        return;
      }
      if (usernameStatus === "taken") {
        toast({ title: t("auth.usernameTaken"), variant: "destructive" });
        return;
      }
      if (!dobMonth || !dobDay || !dobYear) {
        toast({ title: t("auth.dateOfBirthRequired"), variant: "destructive" });
        return;
      }
      if (!gender) {
        toast({ title: t("auth.genderRequired"), variant: "destructive" });
        return;
      }
    } else {
      if (!email.trim()) {
        toast({ title: t("auth.emailRequired"), variant: "destructive" });
        return;
      }
    }

    if (mode !== "reset" && !allRulesPass(checkPasswordRules(password))) {
      toast({ title: t("auth.passwordMin"), variant: "destructive" });
      return;
    }
    if (mode === "signup" && password !== confirmPw) {
      toast({ title: t("auth.passwordMismatch"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(identifier.trim(), password);
        if (error) toast({ title: t("auth.loginError"), description: error.message, variant: "destructive" });
      } else if (mode === "signup") {
        const monthIdx = MONTHS.indexOf(dobMonth) + 1;
        const dateOfBirth = `${dobYear}-${String(monthIdx).padStart(2, "0")}-${String(Number(dobDay)).padStart(2, "0")}`;
        const { data, error } = await signUp(email, password, username.trim(), displayName.trim() || undefined, dateOfBirth, gender);
        if (error) {
          toast({ title: t("auth.signupError"), description: error.message, variant: "destructive" });
        } else if (data?.user?.identities?.length === 0) {
          toast({ title: t("auth.emailAlreadyRegistered"), variant: "destructive" });
        } else {
          setPendingEmail(email);
          setMode("pending");
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        else toast({ title: t("auth.resetSent") });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared layout components ──────────────────────────────────────────────

  const LogoBadge = () => (
    <div className="flex items-center gap-3">
      <img src={`${import.meta.env.BASE_URL}favicon.png`} alt={t("app.name")} className="h-9 w-9 rounded-xl" />
      <span className="text-xl font-bold tracking-tight">{t("app.name")}</span>
    </div>
  );

  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border bg-muted/30">
      <LogoBadge />
      <div className="space-y-4">
        <h1 className="text-4xl font-bold leading-tight">{t("auth.heroHeadline")}</h1>
        <p className="text-lg text-muted-foreground">{t("auth.heroSubtext")}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("app.name")}
      </p>
    </div>
  );

  // ── Pending (email verification) state ───────────────────────────────────

  if (mode === "pending") {
    return (
      <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-md w-full flex flex-col items-center gap-4 text-center">
            <div className="lg:hidden mb-4">
              <LogoBadge />
            </div>
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t("verifyEmail.title")}</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              {t("verifyEmail.description", { email: pendingEmail })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("verifyEmail.wrongEmail")}{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => { setMode("signup"); setPendingEmail(""); }}
              >
                {t("verifyEmail.goBack")}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main auth forms (login / signup / reset) ─────────────────────────────

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
      <LeftPanel />

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full space-y-6">

          {/* Mobile-only logo */}
          <div className="lg:hidden mb-2">
            <LogoBadge />
          </div>

          {/* Page heading + inline mode-switch */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">
              {mode === "login"
                ? t("auth.login")
                : mode === "signup"
                ? t("auth.createAccount")
                : t("auth.resetPassword")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" && (
                <>{t("auth.noAccount")}{" "}
                  <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                    {t("auth.signup")}
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>{t("auth.hasAccount")}{" "}
                  <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                    {t("auth.login")}
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── SIGNUP fields ── */}
            {mode === "signup" && (
              <>
                {/* Email */}
                <div className="space-y-2">
                  <Label>{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="ps-10 h-12" />
                  </div>
                </div>

                {/* Display Name (optional) */}
                <div className="space-y-2">
                  <Label>
                    {t("profile.displayName")}{" "}
                    <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                  </Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-12" />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label>{t("auth.username")}</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required className="h-12" />
                  {usernameStatus === "too_short" && (
                    <p className="text-xs text-yellow-500 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> {t("auth.usernameTooShort")}
                    </p>
                  )}
                  {usernameStatus === "taken" && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> {t("auth.usernameTaken")}
                    </p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("auth.usernameAvailable")}
                    </p>
                  )}
                </div>

                {/* Password with strength bar */}
                <div className="space-y-2">
                  <Label>{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="ps-10 pe-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label>{t("auth.confirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                      className="ps-10 pe-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      tabIndex={-1}
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label>{t("auth.dateOfBirth")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={dobMonth} onValueChange={setDobMonth}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t("auth.month")} /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={dobDay} onValueChange={setDobDay}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t("auth.day")} /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dobYear} onValueChange={setDobYear}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t("auth.year")} /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>{t("auth.gender")}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-12"><SelectValue placeholder={t("auth.selectGender")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">{t("auth.male")}</SelectItem>
                      <SelectItem value="Female">{t("auth.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── LOGIN fields ── */}
            {mode === "login" && (
              <>
                <div className="space-y-2">
                  <Label>{t("auth.emailOrUsername")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="ps-10 h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("auth.password")}</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline py-1"
                      onClick={() => setMode("reset")}
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="ps-10 pe-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── RESET field ── */}
            {mode === "reset" && (
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="ps-10 h-12" />
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={submitting || (mode === "signup" && (usernameStatus === "taken" || usernameStatus === "too_short" || usernameStatus === "checking"))}
            >
              {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : t("auth.sendResetLink")}
            </Button>
          </form>

          {/* Reset mode — back to login link */}
          {mode === "reset" && (
            <p className="text-center text-sm">
              <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                {t("auth.login")}
              </button>
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;
