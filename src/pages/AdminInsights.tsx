import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, Package, ExternalLink, AlertTriangle } from "lucide-react";
import * as api from "@/services/api";

// Insight sub-components
import KpiStrip, { OverviewData } from "@/components/insights/KpiStrip";
import FinancialKpis from "@/components/insights/FinancialKpis";
import TaskHealthBar, { TaskRateData } from "@/components/insights/TaskHealthBar";
import RevenueTrendChart, { TrendData } from "@/components/insights/RevenueTrendChart";
import PaymentAgingChart, { AgingData } from "@/components/insights/PaymentAgingChart";
import ClientLeaderboard, { ClientData } from "@/components/insights/ClientLeaderboard";
import RiskRadar, { AtRiskProject } from "@/components/insights/RiskRadar";
import DeadlineHeatmap from "@/components/insights/DeadlineHeatmap";
import StatusPriorityMatrix from "@/components/insights/StatusPriorityMatrix";
import VelocityChart from "@/components/insights/VelocityChart";
import ManagerWorkload, { WorkloadData } from "@/components/insights/ManagerWorkload";
import { CompanyWalletSnapshot, CompanyPerformanceChart, CompanyPerfData } from "@/components/insights/CompanyPerformanceChart";
import ServiceDistribution from "@/components/insights/ServiceDistribution";

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface InsightsData {
  overview: OverviewData | null;
  trend: TrendData[];
  clients: ClientData[];
  atRisk: AtRiskProject[];
  workload: WorkloadData[];
  taskRate: TaskRateData | null;
  companyPerf: CompanyPerfData[];
  aging: AgingData[];
  // New module data
  attendanceOverview: any | null;
  freelancerSpend: any | null;
  vendorSpend: any | null;
}

export default function AdminInsights() {
  const { isAdmin } = useAuth();
  const { projects: allProjects } = useProjects();
  const navigate = useNavigate();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      const [
        overview, trend, clients, atRisk, workload,
        taskRate, companyPerf, aging,
        attendanceOverview, freelancerSpend, vendorSpend,
      ] = await Promise.allSettled([
        api.fetchInsightsOverview(),
        api.fetchRevenueTrend(),
        api.fetchClientInsights(),
        api.fetchProjectsAtRisk(),
        api.fetchManagerWorkload(),
        api.fetchTaskCompletionRate(),
        api.fetchCompanyPerformance(),
        api.fetchPaymentAging(),
        // New module endpoints
        api.fetchAttendanceInsights(currentMonth, currentYear),
        api.fetchFreelancerSpend(),
        api.fetchVendorSpend(),
      ]);

      const safeVal = (r: PromiseSettledResult<any>, fallback: any) =>
        r.status === "fulfilled" && !r.value?.error ? r.value : fallback;

      setData({
        overview:           safeVal(overview, null),
        trend:              safeVal(trend, []),
        clients:            safeVal(clients, []),
        atRisk:             safeVal(atRisk, []),
        workload:           safeVal(workload, []),
        taskRate:           safeVal(taskRate, null),
        companyPerf:        safeVal(companyPerf, []),
        aging:              safeVal(aging, []),
        attendanceOverview: safeVal(attendanceOverview, null),
        freelancerSpend:    safeVal(freelancerSpend, null),
        vendorSpend:        safeVal(vendorSpend, null),
      });
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const att = data?.attendanceOverview;
  const fl = data?.freelancerSpend;
  const vd = data?.vendorSpend;

  const monthName = now.toLocaleString("default", { month: "long" });

  const flPaidPct = fl?.total_contracted > 0
    ? Math.round((fl.total_paid / fl.total_contracted) * 100) : 0;
  const vPaidPct = vd?.total_billed > 0
    ? Math.round((vd.total_paid / vd.total_billed) * 100) : 0;

  return (
    <div className="max-w-screen-2xl mx-auto py-6 pb-20 px-2 lg:px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Insights</h1>
        <p className="text-gray-500 mt-1">Deep analytical views across projects, revenue, attendance, and operations.</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-[73px] z-30 bg-background/95 backdrop-blur-sm pt-2 pb-4 mb-4 border-b">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue & Clients</TabsTrigger>
              <TabsTrigger value="projects">Projects & Risk</TabsTrigger>
              <TabsTrigger value="team">Team & Ops</TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB 1: Overview ── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <KpiStrip data={data?.overview || null} />
            <FinancialKpis data={data?.overview || null} />
            <Separator />
            <TaskHealthBar data={data?.taskRate || null} />
            <CompanyWalletSnapshot data={data?.companyPerf || []} />
          </TabsContent>

          {/* ── TAB 2: Revenue & Clients ── */}
          <TabsContent value="revenue" className="space-y-6 mt-0">
            <RevenueTrendChart data={data?.trend || []} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaymentAgingChart data={data?.aging || []} />
            </div>
            <ClientLeaderboard data={data?.clients || []} />
          </TabsContent>

          {/* ── TAB 3: Projects & Risk ── */}
          <TabsContent value="projects" className="space-y-6 mt-0">
            <RiskRadar data={data?.atRisk || []} />
            <DeadlineHeatmap atRiskData={data?.atRisk || []} allProjects={allProjects || []} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusPriorityMatrix allProjects={allProjects || []} />
              <VelocityChart allProjects={allProjects || []} />
            </div>
          </TabsContent>

          {/* ── TAB 4: Team & Ops ── */}
          <TabsContent value="team" className="space-y-6 mt-0">
            <ManagerWorkload data={data?.workload || []} />
            <CompanyPerformanceChart data={data?.companyPerf || []} />
            <ServiceDistribution />

            <Separator />

            {/* ─── Attendance Snapshot ─── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="border-l-4 border-sky-500 pl-3">
                  <h2 className="text-lg font-semibold text-gray-900">Attendance — {monthName} {currentYear}</h2>
                  <p className="text-xs text-gray-500">Employee and freelancer attendance this month</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/attendance")}
                  className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Full Attendance
                </Button>
              </div>

              {att ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Emp Present",   value: att.emp_present ?? 0,  color: "text-emerald-600" },
                    { label: "Emp Absent",    value: att.emp_absent ?? 0,   color: "text-red-500" },
                    { label: "On Leave",      value: att.emp_leave ?? 0,    color: "text-violet-600" },
                    { label: "FL Days Worked",value: att.fl_present ?? 0,   color: "text-blue-600" },
                    { label: "FL Payable",    value: fmt(att.fl_total_payable ?? 0), color: "text-amber-600", isAmount: true },
                  ].map(({ label, value, color, isAmount }) => (
                    <Card key={label} className="border-border shadow-sm">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        <p className={`text-2xl font-bold tabular-nums ${color}`}>
                          {isAmount ? value : value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-border text-muted-foreground text-sm gap-2">
                  <UserCheck className="h-4 w-4" /> No attendance data for this month
                </div>
              )}
            </div>

            <Separator />

            {/* ─── Freelancer & Vendor Cost Summary ─── */}
            <div>
              <div className="border-l-4 border-purple-500 pl-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">External Cost Summary</h2>
                <p className="text-xs text-gray-500">Freelancer payouts and vendor payables overview</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Freelancer card */}
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Freelancers</p>
                          <p className="text-xs text-muted-foreground">{fl?.total_freelancers ?? 0} active · {fl?.total_assignments ?? 0} assignments</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/admin-freelancers")}
                        className="text-xs gap-1 h-7 px-2">
                        <ExternalLink className="h-3 w-3" /> View
                      </Button>
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contracted</span>
                        <span className="font-semibold tabular-nums">{fmt(fl?.total_contracted ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-semibold tabular-nums text-emerald-600">{fmt(fl?.total_paid ?? 0)}</span>
                      </div>
                      <Progress value={flPaidPct} className="h-1.5" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-semibold tabular-nums text-amber-600">{fmt(fl?.total_pending ?? 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vendor card */}
                <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Package className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Vendors</p>
                          <p className="text-xs text-muted-foreground">{vd?.total_vendors ?? 0} vendors · {vd?.total_bills ?? 0} bills</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/admin-vendors")}
                        className="text-xs gap-1 h-7 px-2">
                        <ExternalLink className="h-3 w-3" /> View
                      </Button>
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Billed</span>
                        <span className="font-semibold tabular-nums">{fmt(vd?.total_billed ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-semibold tabular-nums text-emerald-600">{fmt(vd?.total_paid ?? 0)}</span>
                      </div>
                      <Progress value={vPaidPct} className="h-1.5" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-semibold tabular-nums text-amber-600">{fmt(vd?.total_pending ?? 0)}</span>
                      </div>
                      {(vd?.overdue_bills ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-xs text-red-600 font-medium">
                            {vd.overdue_bills} overdue bill{vd.overdue_bills > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
