import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import {
  fetchFinanceOverview,
  fetchFundTransfers,
  fetchCompanies,
  fetchFreelancerSpend,
  fetchVendorSpend,
} from "@/services/api";
import FundOverviewGrid from "@/components/FundOverviewGrid";
import FundLedger from "@/components/FundLedger";
import FundTransferModal from "@/components/FundTransferModal";
import FundDepositModal from "@/components/FundDepositModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Plus, ArrowRightLeft, RefreshCw,
  Users, Package, AlertTriangle, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function AdminFinance() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [freelancerSpend, setFreelancerSpend] = useState<any>(null);
  const [vendorSpend, setVendorSpend] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, transfersData, companiesData, flData, vData] =
        await Promise.allSettled([
          fetchFinanceOverview(),
          fetchFundTransfers(),
          fetchCompanies(),
          fetchFreelancerSpend(),
          fetchVendorSpend(),
        ]);
      if (overviewData.status === "fulfilled") setOverview(overviewData.value);
      if (transfersData.status === "fulfilled") setTransfers(transfersData.value);
      if (companiesData.status === "fulfilled") setCompanies(companiesData.value);
      if (flData.status === "fulfilled") setFreelancerSpend(flData.value);
      if (vData.status === "fulfilled") setVendorSpend(vData.value);
    } catch {
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not fetch finance data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const flPaidPct = freelancerSpend?.total_contracted > 0
    ? Math.round((freelancerSpend.total_paid / freelancerSpend.total_contracted) * 100)
    : 0;

  const vPaidPct = vendorSpend?.total_billed > 0
    ? Math.round((vendorSpend.total_paid / vendorSpend.total_billed) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Central Finance Control</h1>
            <p className="text-gray-500 text-sm mt-1">Company funds, freelancer payouts, vendor payables, and transfers.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadData} disabled={loading}
              className="h-10 w-10 p-0 rounded-full border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsTransferOpen(true)}
              className="h-10 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm gap-2 rounded-lg">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              Transfer Funds
            </Button>
            <Button onClick={() => setIsDepositOpen(true)}
              className="h-10 bg-black hover:bg-gray-800 text-white shadow-sm gap-2 rounded-lg">
              <Plus className="h-4 w-4" />
              Manage Deposits
            </Button>
          </div>
        </div>

        {/* ── Company Funds ── */}
        <FundOverviewGrid overview={overview} />
        <FundLedger transfers={transfers} isLoading={loading} />

        <Separator className="my-8" />

        {/* ── Freelancer Payouts ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="border-l-4 border-violet-500 pl-3">
                <h2 className="text-lg font-semibold text-gray-900">Freelancer Payouts</h2>
                <p className="text-xs text-gray-500">Outstanding payments owed to freelancers</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin-freelancers")}
              className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Manage Freelancers
            </Button>
          </div>

          {freelancerSpend ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Freelancers</p>
                  <p className="text-2xl font-bold tabular-nums">{freelancerSpend.total_freelancers ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{freelancerSpend.total_assignments ?? 0} assignments</p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-sm">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Contracted</p>
                  <p className="text-2xl font-bold tabular-nums text-indigo-600">{fmt(freelancerSpend.total_contracted)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Across all assignments</p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-sm">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Paid</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmt(freelancerSpend.total_paid)}</p>
                  <Progress value={flPaidPct} className="h-1.5 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">{flPaidPct}% of contracted</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-400 border-border shadow-sm">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending Payout</p>
                  <p className="text-2xl font-bold tabular-nums text-amber-600">{fmt(freelancerSpend.total_pending)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Yet to be paid</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              <Users className="h-4 w-4 mr-2" /> No freelancer data yet
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* ── Vendor Payables ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="border-l-4 border-orange-500 pl-3">
              <h2 className="text-lg font-semibold text-gray-900">Vendor Payables</h2>
              <p className="text-xs text-gray-500">Bills and outstanding payments to vendors</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin-vendors")}
              className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Manage Vendors
            </Button>
          </div>

          {vendorSpend ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Vendors</p>
                    <p className="text-2xl font-bold tabular-nums">{vendorSpend.total_vendors ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{vendorSpend.total_bills ?? 0} bills raised</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Billed</p>
                    <p className="text-2xl font-bold tabular-nums text-indigo-600">{fmt(vendorSpend.total_billed)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Across all bills</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Paid</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmt(vendorSpend.total_paid)}</p>
                    <Progress value={vPaidPct} className="h-1.5 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{vPaidPct}% settled</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-400 border-border shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending Payable</p>
                    <p className="text-2xl font-bold tabular-nums text-amber-600">{fmt(vendorSpend.total_pending)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unpaid / partial bills</p>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue bills alert */}
              {(vendorSpend.overdue_bills ?? 0) > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">{vendorSpend.overdue_bills} bill{vendorSpend.overdue_bills > 1 ? "s" : ""} overdue</span>
                    {" "}— past due date and not yet fully paid.{" "}
                    <button onClick={() => navigate("/admin-vendors")}
                      className="underline font-medium hover:text-red-900">
                      View vendors →
                    </button>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              <Package className="h-4 w-4 mr-2" /> No vendor data yet
            </div>
          )}
        </div>

      </main>

      {/* Modals */}
      <FundTransferModal open={isTransferOpen} onOpenChange={setIsTransferOpen}
        companies={companies} onSuccess={loadData} />
      <FundDepositModal open={isDepositOpen} onOpenChange={setIsDepositOpen}
        companies={companies} onSuccess={loadData} />
    </div>
  );
}
