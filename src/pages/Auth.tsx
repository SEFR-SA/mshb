import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import PasswordStrengthBar, { checkPasswordRules, allRulesPass } from "@/components/PasswordStrengthBar";
import { CheckCircle2, XCircle } from "lucide-react";

type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState(""); // email for signup/reset, email-or-username for login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [username, setUsername] = useState("");
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
        const { data, error } = await signUp(email, password, username.trim());
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
    <div className="flex min-h-screen items-center justify-center galaxy-gradient p-4">
      <Card className="w-full max-w-md glass galaxy-glow">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-galaxy-glow">
            <span className="text-primary">✦</span> {t("app.name")} <span className="text-primary">✦</span>
          </CardTitle>
          <CardDescription>
            {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : t("auth.resetPassword")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
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
            )}
            <div className="space-y-2">
              <Label>{mode === "login" ? t("auth.emailOrUsername") : t("auth.email")}</Label>
              {mode === "login" ? (
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              ) : (
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              )}
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {mode === "signup" && <PasswordStrengthBar password={password} />}
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label>{t("auth.confirmPassword")}</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
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
