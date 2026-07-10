import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transferFunds } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRightLeft } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface FundTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSuccess: () => void;
}

export default function FundTransferModal({ open, onOpenChange, companies, onSuccess }: FundTransferModalProps) {
  const [fromCompanyId, setFromCompanyId] = useState("");
  const [toCompanyId, setToCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCompanyId || !toCompanyId || !amount) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill in all required fields." });
      return;
    }
    if (fromCompanyId === toCompanyId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Source and destination companies must be different." });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Amount must be a positive number." });
      return;
    }

    setIsLoading(true);
    try {
      await transferFunds({ fromCompanyId, toCompanyId, amount: numAmount, note });
      toast({ title: "Transfer Successful", description: `₹${numAmount.toLocaleString("en-IN")} transferred successfully.` });
      onSuccess();
      onOpenChange(false);
      setFromCompanyId("");
      setToCompanyId("");
      setAmount("");
      setNote("");
    } catch (error) {
      toast({ variant: "destructive", title: "Transfer Failed", description: error instanceof Error ? error.message : "An error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            Transfer Funds
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="from-company" className="text-sm font-medium text-gray-700">From Company *</Label>
            <Select value={fromCompanyId} onValueChange={setFromCompanyId}>
              <SelectTrigger id="from-company" className="h-10">
                <SelectValue placeholder="Select source company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to-company" className="text-sm font-medium text-gray-700">To Company *</Label>
            <Select value={toCompanyId} onValueChange={setToCompanyId}>
              <SelectTrigger id="to-company" className="h-10">
                <SelectValue placeholder="Select destination company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-amount" className="text-sm font-medium text-gray-700">Amount (₹) *</Label>
            <Input
              id="transfer-amount"
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
            <Label htmlFor="transfer-note" className="text-sm font-medium text-gray-700">Note (Optional)</Label>
            <Input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Project advance reallocation"
              className="h-10"
            />
          </div>

          <DialogFooter className="pt-4 mt-2 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transferring…</> : "Transfer Funds"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
