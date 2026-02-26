import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CreditCard, ChevronDown, ChevronUp, Download, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MOCK_TRANSACTIONS = [
  { id: "1", date: "Feb 1, 2026", description: "Mshb Pro — Monthly", amount: "19.99 SAR" },
  { id: "2", date: "Jan 1, 2026", description: "Mshb Pro — Monthly", amount: "19.99 SAR" },
  { id: "3", date: "Dec 1, 2025", description: "Mshb Light — Monthly", amount: "4.99 SAR" },
];

const BillingTab = () => {
  const { t } = useTranslation();
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

  const handleAddCard = () => {
    toast({ title: t("settings.comingSoon") });
    setAddCardOpen(false);
  };

  const PAYMENT_LOGOS = [
    { name: "Visa", bg: "bg-blue-600", text: "text-white", label: "VISA" },
    { name: "Mastercard", bg: "bg-red-500", text: "text-white", label: "MC" },
    { name: "Apple Pay", bg: "bg-black", text: "text-white", label: "Pay" },
    { name: "MADA", bg: "bg-green-600", text: "text-white", label: "mada" },
    { name: "STCPay", bg: "bg-purple-600", text: "text-white", label: "STC" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.billing")}</h2>
        <p className="text-sm text-muted-foreground">Manage your payment methods and view transactions.</p>
      </div>

      {/* Payment Methods */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.paymentMethods")}</h3>
          <Button size="sm" variant="outline" onClick={() => setAddCardOpen(true)}>
            <Plus className="h-3.5 w-3.5 me-1.5" /> {t("settings.addPaymentMethod")}
          </Button>
        </div>

        {/* Accepted payment logos */}
        <div className="flex flex-wrap gap-2">
          {PAYMENT_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className={cn("h-8 px-3 rounded-md flex items-center justify-center text-xs font-bold", logo.bg, logo.text)}
              title={logo.name}
            >
              {logo.label}
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">No payment methods added yet.</p>
          <Button size="sm" variant="link" className="mt-1" onClick={() => setAddCardOpen(true)}>
            {t("settings.addPaymentMethod")}
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="bg-muted/20 px-4 py-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.transactionHistory")}</h3>
        </div>
        {MOCK_TRANSACTIONS.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("settings.noTransactions")}</div>
        ) : (
          <div className="divide-y divide-border/50">
            {MOCK_TRANSACTIONS.map((tx) => {
              const basePrice = parseFloat(tx.amount);
              const vat = +(basePrice * 0.15).toFixed(2);
              const total = +(basePrice + vat).toFixed(2);
              const isOpen = expandedTx === tx.id;
              return (
                <div key={tx.id}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors text-start"
                    onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tx.amount}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 bg-muted/10">
                      <div className="rounded-lg border border-border/50 bg-background p-3 space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("settings.basePrice")}</span>
                          <span>{basePrice.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("settings.vat")}</span>
                          <span>{vat.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-border/50 pt-2">
                          <span>{t("settings.total")}</span>
                          <span>{total.toFixed(2)} SAR</span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary text-xs mt-1"
                          onClick={() => toast({ title: "Receipt", description: "Receipt download coming soon." })}
                        >
                          <Download className="h-3 w-3 me-1" /> {t("settings.downloadReceipt")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Card Dialog */}
      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.addPaymentMethod")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.cardNumber")}</Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                placeholder="0000 0000 0000 0000"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.expiry")}</Label>
                <Input
                  value={expiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    setExpiry(v);
                  }}
                  placeholder="MM/YY"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("settings.cvv")}</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••"
                  type="password"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.nameOnCard")}</Label>
              <Input value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} placeholder="John Doe" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddCardOpen(false)}>{t("actions.cancel")}</Button>
            <Button onClick={handleAddCard}>{t("settings.addCard")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingTab;
