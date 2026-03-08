import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import PasswordStrengthBar, { checkPasswordRules, allRulesPass } from "@/components/PasswordStrengthBar";
import { CheckCircle2, XCircle, Eye, EyeOff, Mail, Lock, ArrowLeft, User, Chrome } from "lucide-react";

type AuthMode = "login" | "signup" | "reset" | "pending";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const inputClass = "h-14 text-lg bg-muted/50 border border-border rounded-xl focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";
const btnClass = "w-full h-14 text-lg rounded-xl";

const Auth = () => {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState(1);

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

  // Show toast if kicked from another device
  useEffect(() => {
    if (localStorage.getItem("mshb_kicked")) {
      localStorage.removeItem("mshb_kicked");
      toast({ title: t("auth.kickedOut"), variant: "destructive" });
    }
  }, []);

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
      const { data } = await supabase.rpc("check_username_available" as any, { p_username: username.trim() });
      setUsernameStatus(data ? "available" : "taken");
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [username, mode]);

  // Reset step when switching modes
  useEffect(() => {
    if (mode === "signup") setStep(1);
  }, [mode]);

  if (!loading && user) {
    const pendingInvite = localStorage.getItem("pendingInvite");
    if (pendingInvite && /^[a-zA-Z0-9_-]+$/.test(pendingInvite)) {
      localStorage.removeItem("pendingInvite");
      return <Navigate to={`/invite/${pendingInvite}`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const daysInMonth = dobMonth && dobYear
    ? new Date(Number(dobYear), MONTHS.indexOf(dobMonth) + 1, 0).getDate()
    : 31;

  // ── Step navigation helpers ──
  const canGoNext = (s: number): boolean => {
    switch (s) {
      case 2: return !!email.trim() && !!username.trim() && username.trim().length >= 3 && usernameStatus === "available";
      case 3: return allRulesPass(checkPasswordRules(password)) && password === confirmPw && confirmPw.length > 0;
      case 4: return !!dobMonth && !!dobDay && !!dobYear && !!gender;
      default: return true;
    }
  };

  const goNext = () => { if (canGoNext(step) && step < 5) setStep(step + 1); };
  const goBack = () => { if (step > 1) setStep(step - 1); };

  // ── Final submit ──
  const handleSignup = async () => {
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast({ title: t("auth.emailRequired"), variant: "destructive" });
      return;
    }
    if (!allRulesPass(checkPasswordRules(password))) {
      toast({ title: t("auth.passwordMin"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await signIn(identifier.trim(), password);
      if (error) toast({ title: t("auth.loginError"), description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: t("auth.emailRequired"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      else toast({ title: t("auth.resetSent") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast({ title: t("auth.loginError"), description: (error as Error).message, variant: "destructive" });
  };

  // ── Shared components ──
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

  const ProgressBar = () => (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i <= step ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );

  // ── Pending state ──
  if (mode === "pending") {
    return (
      <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-md w-full flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:hidden mb-4"><LogoBadge /></div>
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t("verifyEmail.title")}</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              {t("verifyEmail.description", { email: pendingEmail })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("verifyEmail.wrongEmail")}{" "}
              <button className="text-primary hover:underline" onClick={() => { setMode("signup"); setPendingEmail(""); }}>
                {t("verifyEmail.goBack")}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step renderers for signup ──
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="step1">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("auth.createAccount")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.heroSubtext")}</p>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          className={`${btnClass} gap-3`}
          onClick={() => { setStep(2); }}
        >
          <Mail className="h-5 w-5" />
          {t("auth.continueWithEmail") || "Continue with Email"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className={`${btnClass} gap-3 border border-border`}
          onClick={handleGoogleSignIn}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t("auth.continueWithGoogle") || "Continue with Google"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        {t("auth.disclaimer") || "By signing up you agree to the"}{" "}
        <a href="#" className="text-primary hover:underline">{t("auth.privacyPolicy") || "Privacy Policy"}</a>{" "}
        {t("common.and") || "and"}{" "}
        <a href="#" className="text-primary hover:underline">{t("auth.termsOfUse") || "Terms of Use"}</a>
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="step2">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("auth.createAccount")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.accountBasics") || "Let's start with the basics"}</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.username")}</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="username"
            className={inputClass}
          />
          {usernameStatus === "too_short" && (
            <p className="text-xs text-yellow-500 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {t("auth.usernameTooShort")}</p>
          )}
          {usernameStatus === "taken" && (
            <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {t("auth.usernameTaken")}</p>
          )}
          {usernameStatus === "available" && (
            <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {t("auth.usernameAvailable")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.email")}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <Button type="button" className={btnClass} onClick={goNext} disabled={!canGoNext(2)}>
        {t("common.continue") || "Continue"}
      </Button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="step3">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("auth.security") || "Security"}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.securitySubtext") || "Choose a strong password"}</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.password")}</Label>
          <div className="relative">
            <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} ps-12 pe-12`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <PasswordStrengthBar password={password} />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.confirmPassword")}</Label>
          <div className="relative">
            <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type={showConfirmPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`${inputClass} ps-12 pe-12`}
            />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" tabIndex={-1}>
              {showConfirmPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {confirmPw && password !== confirmPw && (
            <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {t("auth.passwordMismatch")}</p>
          )}
        </div>
      </div>

      <Button type="button" className={btnClass} onClick={goNext} disabled={!canGoNext(3)}>
        {t("common.continue") || "Continue"}
      </Button>
    </div>
  );

  const selectTriggerClass = inputClass;

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="step4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("auth.aboutYou") || "About You"}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.demographicsSubtext") || "Tell us a bit about yourself"}</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.dateOfBirth")}</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select value={dobMonth} onValueChange={setDobMonth}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder={t("auth.month")} /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dobDay} onValueChange={setDobDay}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder={t("auth.day")} /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dobYear} onValueChange={setDobYear}>
              <SelectTrigger className={selectTriggerClass}><SelectValue placeholder={t("auth.year")} /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t("auth.gender")}</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className={selectTriggerClass}><SelectValue placeholder={t("auth.selectGender")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">{t("auth.male")}</SelectItem>
              <SelectItem value="Female">{t("auth.female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="button" className={btnClass} onClick={goNext} disabled={!canGoNext(4)}>
        {t("common.continue") || "Continue"}
      </Button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="step5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("auth.almostDone") || "Almost Done"}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.profileSubtext") || "Pick a display name"}</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className={labelClass}>
            {t("profile.displayName")}{" "}
            <span className="text-muted-foreground/70 normal-case font-normal">({t("common.optional")})</span>
          </Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={username || t("profile.displayName")}
            className={inputClass}
          />
        </div>
      </div>

      <Button type="button" className={btnClass} onClick={handleSignup} disabled={submitting}>
        {submitting ? "..." : t("auth.signup")}
      </Button>
    </div>
  );

  const signupSteps: Record<number, () => React.ReactNode> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
  };

  // ── Main render ──
  return (
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
      <LeftPanel />

      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="lg:hidden"><LogoBadge /></div>
          <div className="hidden lg:block" />
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? (t("auth.signup") || "Sign up") : (t("auth.login") || "Log in")}
          </Button>
        </div>

        {/* Progress bar (signup only) */}
        {mode === "signup" && step > 1 && (
          <div className="max-w-md w-full mx-auto mb-6 mt-2">
            <ProgressBar />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">

            {/* Back button for signup steps 2-5 */}
            {mode === "signup" && step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back") || "Back"}
              </button>
            )}

            {/* Signup flow */}
            {mode === "signup" && signupSteps[step]?.()}

            {/* Login flow */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="login">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">{t("auth.login")}</h2>
                  <p className="text-sm text-muted-foreground">{t("auth.welcomeBack") || "Welcome back"}</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className={labelClass}>{t("auth.emailOrUsername")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className={`${inputClass} ps-12`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={labelClass}>{t("auth.password")}</Label>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("reset")}>
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={`${inputClass} ps-12 pe-12`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" tabIndex={-1}>
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" className={btnClass} disabled={submitting}>
                  {submitting ? "..." : t("auth.login")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t("common.or") || "or"}</span></div>
                </div>

                <Button type="button" variant="outline" className={`${btnClass} gap-3 border border-border`} onClick={handleGoogleSignIn}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t("auth.continueWithGoogle") || "Continue with Google"}
                </Button>
              </form>
            )}

            {/* Reset flow */}
            {mode === "reset" && (
              <form onSubmit={handleReset} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key="reset">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">{t("auth.resetPassword")}</h2>
                  <p className="text-sm text-muted-foreground">{t("auth.resetSubtext") || "Enter your email to reset"}</p>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass}>{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={`${inputClass} ps-12`} />
                  </div>
                </div>

                <Button type="submit" className={btnClass} disabled={submitting}>
                  {submitting ? "..." : t("auth.sendResetLink")}
                </Button>

                <p className="text-center text-sm">
                  <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                    {t("auth.login")}
                  </button>
                </p>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
