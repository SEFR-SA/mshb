import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const BoostSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serverId = searchParams.get("server_id");

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[340px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-lg">
        {/* Animated checkmark header */}
        <div className="flex h-32 items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="rounded-full bg-green-500/20 p-4"
            >
              <div className="rounded-full bg-green-500 p-3">
                <Check className="h-8 w-8 text-white" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 text-center space-y-4">
          <div>
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-pink-500" />
              {t("serverBoost.successTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t("serverBoost.successMessage")}</p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            onClick={() => navigate(serverId ? `/server/${serverId}` : "/")}
          >
            {t("serverBoost.returnToServer")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BoostSuccess;
