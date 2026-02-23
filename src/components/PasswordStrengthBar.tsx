import React from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

const COMMON_PASSWORDS = [
  "password", "password1", "123456", "12345678", "qwerty", "abc123",
  "letmein", "admin", "welcome", "monkey", "master", "dragon",
  "login", "princess", "football", "shadow", "sunshine", "trustno1",
];

export interface PasswordRules {
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  hasLength: boolean;
  notCommon: boolean;
}

export function checkPasswordRules(password: string): PasswordRules {
  return {
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()\-_+={}[\]:;"'<>,.?/\\|]/.test(password),
    hasLength: password.length >= 8,
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  };
}

export function getStrength(rules: PasswordRules): number {
  return Object.values(rules).filter(Boolean).length;
}

export function allRulesPass(rules: PasswordRules): boolean {
  return Object.values(rules).every(Boolean);
}

interface Props {
  password: string;
}

const PasswordStrengthBar = ({ password }: Props) => {
  const { t } = useTranslation();
  const rules = checkPasswordRules(password);
  const met = getStrength(rules);

  const level =
    met <= 1 ? 0 : met <= 3 ? 1 : met <= 4 ? 2 : 3;

  const colors = [
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
  ];

  const labels = [
    t("auth.strengthWeak"),
    t("auth.strengthGood"),
    t("auth.strengthStrong"),
    t("auth.strengthVeryStrong"),
  ];

  const ruleItems: { key: keyof PasswordRules; label: string }[] = [
    { key: "hasUpper", label: t("auth.ruleUppercase") },
    { key: "hasLower", label: t("auth.ruleLowercase") },
    { key: "hasDigit", label: t("auth.ruleNumber") },
    { key: "hasSpecial", label: t("auth.ruleSpecial") },
    { key: "hasLength", label: t("auth.ruleLength") },
    { key: "notCommon", label: t("auth.ruleCommon") },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= level ? colors[level] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${colors[level].replace("bg-", "text-")}`}>
        {labels[level]}
      </p>

      {/* Rule checklist */}
      <ul className="space-y-1">
        {ruleItems.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-1.5 text-xs">
            {rules[key] ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-destructive" />
            )}
            <span className={rules[key] ? "text-muted-foreground" : "text-foreground"}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthBar;
