import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import PasswordStrengthBar, { checkPasswordRules, allRulesPass } from "@/components/PasswordStrengthBar";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "signup" | "reset";

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

  // Username uniqueness
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (mode !== "signup" || !username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username.trim())
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [username, mode]);

  if (!loading && user) return <Navigate to="/" replace />;

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
      if (usernameStatus === "taken") {
        toast({ title: t("auth.usernameTaken"), variant: "destructive" });
        return;
      }
      if (!dobMonth || !dobDay || !dobYear) {
        toast({ title: "Date of birth is required", variant: "destructive" });
        return;
      }
      if (!gender) {
        toast({ title: "Gender is required", variant: "destructive" });
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
          toast({ title: t("auth.emailAlreadyRegistered") || "This email is already registered. Please log in instead.", variant: "destructive" });
        } else {
          toast({ title: t("auth.checkEmail") });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.createAccount", "Create an account") : t("auth.resetPassword")}
          </CardTitle>
          <CardDescription>
            {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : t("auth.resetPassword")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                {/* 1. Email */}
                <div className="space-y-2">
                  <Label>{t("auth.email")}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                {/* 2. Display Name (optional) */}
                <div className="space-y-2">
                  <Label>{t("profile.displayName", "Display Name")} <span className="text-muted-foreground text-xs">({t("common.optional", "optional")})</span></Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>

                {/* 3. Username */}
                <div className="space-y-2">
                  <Label>{t("auth.username")}</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
                  {usernameStatus === "taken" && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> {t("auth.usernameTaken")}
                    </p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("auth.usernameAvailable")}
                    </p>
                  )}
                </div>

                {/* 4. Password with eye toggle */}
                <div className="space-y-2">
                  <Label>{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                {/* 5. Confirm Password with eye toggle */}
                <div className="space-y-2">
                  <Label>{t("auth.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 6. Date of Birth */}
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={dobMonth} onValueChange={setDobMonth}>
                      <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dobDay} onValueChange={setDobDay}>
                      <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dobYear} onValueChange={setDobYear}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 7. Gender */}
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Login mode fields */}
            {mode === "login" && (
              <>
                <div className="space-y-2">
                  <Label>{t("auth.emailOrUsername")}</Label>
                  <Input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Reset mode fields */}
            {mode === "reset" && (
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting || (mode === "signup" && usernameStatus === "taken")}>
              {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : t("auth.sendResetLink")}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm space-y-2">
            {mode === "login" && (
              <>
                <button className="text-primary hover:underline block w-full" onClick={() => setMode("reset")}>
                  {t("auth.forgotPassword")}
                </button>
                <p className="text-muted-foreground">
                  {t("auth.noAccount")}{" "}
                  <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                    {t("auth.signup")}
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground">
                {t("auth.hasAccount")}{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                  {t("auth.login")}
                </button>
              </p>
            )}
            {mode === "reset" && (
              <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                {t("auth.login")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
