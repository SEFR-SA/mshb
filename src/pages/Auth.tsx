import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: t("auth.emailRequired"), variant: "destructive" });
      return;
    }
    if (mode !== "reset" && password.length < 8) {
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
        const { error } = await signIn(email, password);
        if (error) toast({ title: t("auth.loginError"), description: error.message, variant: "destructive" });
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) toast({ title: t("auth.signupError"), description: error.message, variant: "destructive" });
        else toast({ title: t("auth.checkEmail") });
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
                <Label>{t("auth.displayName")}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label>{t("auth.confirmPassword")}</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
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
