import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BoostCancel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[340px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-lg">
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
          <div className="rounded-full bg-muted p-3">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="px-6 py-5 text-center space-y-4">
          <div>
            <h2 className="text-xl font-bold">{t("serverBoost.cancelTitle")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("serverBoost.cancelMessage")}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            {t("serverBoost.returnToApp")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BoostCancel;
