import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import * as api from "@/services/api";

// Sub-components
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

interface InsightsData {
  overview: OverviewData | null;
  trend: TrendData[];
  clients: ClientData[];
  atRisk: AtRiskProject[];
  workload: WorkloadData[];
  taskRate: TaskRateData | null;
  companyPerf: CompanyPerfData[];
  aging: AgingData[];
}

export default function AdminInsights() {
  const { isAdmin } = useAuth();
  const { projects: allProjects } = useProjects();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      const [overview, trend, clients, atRisk, workload, taskRate, companyPerf, aging] =
        await Promise.allSettled([
          api.fetchInsightsOverview(),
          api.fetchRevenueTrend(),
          api.fetchClientInsights(),
          api.fetchProjectsAtRisk(),
          api.fetchManagerWorkload(),
          api.fetchTaskCompletionRate(),
          api.fetchCompanyPerformance(),
          api.fetchPaymentAging(),
        ]);
      
      setData({
        overview:    overview.status === 'fulfilled' && !overview.value.error ? overview.value    : null,
        trend:       trend.status === 'fulfilled' && !trend.value.error       ? trend.value       : [],
        clients:     clients.status === 'fulfilled' && !clients.value.error   ? clients.value     : [],
        atRisk:      atRisk.status === 'fulfilled' && !atRisk.value.error     ? atRisk.value      : [],
        workload:    workload.status === 'fulfilled' && !workload.value.error ? workload.value    : [],
        taskRate:    taskRate.status === 'fulfilled' && !taskRate.value.error ? taskRate.value    : null,
        companyPerf: companyPerf.status === 'fulfilled' && !companyPerf.value.error ? companyPerf.value : [],
        aging:       aging.status === 'fulfilled' && !aging.value.error       ? aging.value       : [],
      });
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-screen-2xl mx-auto py-6 pb-20 px-2 lg:px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Insights</h1>
        <p className="text-gray-500 mt-1">Deep analytical views across projects, revenue, and operations.</p>
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

          <TabsContent value="overview" className="space-y-6 mt-0">
            <KpiStrip data={data?.overview || null} />
            <FinancialKpis data={data?.overview || null} />
            <Separator />
            <TaskHealthBar data={data?.taskRate || null} />
            <CompanyWalletSnapshot data={data?.companyPerf || []} />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 mt-0">
            <RevenueTrendChart data={data?.trend || []} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaymentAgingChart data={data?.aging || []} />
            </div>
            <ClientLeaderboard data={data?.clients || []} />
          </TabsContent>

          <TabsContent value="projects" className="space-y-6 mt-0">
            <RiskRadar data={data?.atRisk || []} />
            <DeadlineHeatmap atRiskData={data?.atRisk || []} allProjects={allProjects || []} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusPriorityMatrix allProjects={allProjects || []} />
              <VelocityChart allProjects={allProjects || []} />
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-0">
            <ManagerWorkload data={data?.workload || []} />
            <CompanyPerformanceChart data={data?.companyPerf || []} />
            <ServiceDistribution />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
