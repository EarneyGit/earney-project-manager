import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { depositFunds, withdrawFunds } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Company {
  id: string;
  name: string;
}

interface FundDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSuccess: () => void;
}

export default function FundDepositModal({ open, onOpenChange, companies, onSuccess }: FundDepositModalProps) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !amount) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill in all required fields." });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Amount must be a positive number." });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "deposit") {
        await depositFunds({ companyId, amount: numAmount, note });
        toast({ title: "Deposit Successful", description: `₹${numAmount.toLocaleString("en-IN")} deposited successfully.` });
      } else {
        await withdrawFunds({ companyId, amount: numAmount, note });
        toast({ title: "Withdrawal Successful", description: `₹${numAmount.toLocaleString("en-IN")} withdrawn successfully.` });
      }
      onSuccess();
      onOpenChange(false);
      setCompanyId("");
      setAmount("");
      setNote("");
    } catch (error) {
      toast({ variant: "destructive", title: "Transaction Failed", description: error instanceof Error ? error.message : "An error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Manage Funds</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "deposit" | "withdraw")} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="deposit" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" /> Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-sm font-medium text-gray-700">Select Company *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="company" className="h-10">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-amount" className="text-sm font-medium text-gray-700">Amount (₹) *</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                required
                className="h-10 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-note" className="text-sm font-medium text-gray-700">Note (Optional)</Label>
              <Input
                id="tx-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={mode === "deposit" ? "e.g. Initial client payment" : "e.g. Refund or correction"}
                className="h-10"
              />
            </div>

            <DialogFooter className="pt-4 mt-2 border-t border-gray-100 flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">Cancel</Button>
              <Button type="submit" disabled={isLoading} className={`h-10 text-white ${mode === "deposit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {mode === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
