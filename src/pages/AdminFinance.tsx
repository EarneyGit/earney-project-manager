import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  fetchFinanceOverview,
  fetchFundTransfers,
  fetchCompanies,
} from "@/services/api";
import FundOverviewGrid from "@/components/FundOverviewGrid";
import FundLedger from "@/components/FundLedger";
import FundTransferModal from "@/components/FundTransferModal";
import FundDepositModal from "@/components/FundDepositModal";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminFinance() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [overview, setOverview] = useState<{ totalAdded: number; totalSpent: number; totalBalance: number } | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, transfersData, companiesData] = await Promise.all([
        fetchFinanceOverview(),
        fetchFundTransfers(),
        fetchCompanies(),
      ]);
      setOverview(overviewData);
      setTransfers(transfersData);
      setCompanies(companiesData);
    } catch (error) {
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not fetch finance data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Central Finance Control</h1>
            <p className="text-gray-500 text-sm mt-1">Manage company funds, deposits, withdrawals, and inter-company transfers.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadData} disabled={loading} className="h-10 w-10 p-0 rounded-full border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsTransferOpen(true)} className="h-10 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm gap-2 rounded-lg">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              Transfer Funds
            </Button>
            <Button onClick={() => setIsDepositOpen(true)} className="h-10 bg-black hover:bg-gray-800 text-white shadow-sm gap-2 rounded-lg">
              <Plus className="h-4 w-4" />
              Manage Deposits
            </Button>
          </div>
        </div>

        {/* Overview Grid */}
        <FundOverviewGrid overview={overview} />

        {/* Ledger */}
        <FundLedger transfers={transfers} isLoading={loading} />

        {/* Modals */}
        <FundTransferModal
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          companies={companies}
          onSuccess={loadData}
        />
        <FundDepositModal
          open={isDepositOpen}
          onOpenChange={setIsDepositOpen}
          companies={companies}
          onSuccess={loadData}
        />
      </main>
    </div>
  );
}
