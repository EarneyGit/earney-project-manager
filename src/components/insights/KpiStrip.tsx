import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export interface OverviewData {
  total_projects: number;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  overdue_count: number;
  due_this_week_count: number;
  total_budget: number;
  total_collected: number;
  total_pending: number;
  collection_rate_pct: string;
}

export default function KpiStrip({ data }: { data: OverviewData | null }) {
  if (!data) return null;

  const cards = [
    {
      label: "Total Projects",
      value: data.total_projects,
      accent: "border-indigo-500",
      sub: "All time",
    },
    {
      label: "Completed",
      value: data.completed_count,
      accent: "border-emerald-500",
      sub: data.total_projects > 0 ? `${((data.completed_count / data.total_projects) * 100).toFixed(1)}% of total` : "0%",
    },
    {
      label: "In Progress",
      value: data.in_progress_count,
      accent: "border-blue-500",
      sub: "Active now",
    },
    {
      label: "Overdue",
      value: data.overdue_count,
      accent: "border-red-500",
      sub: "Needs attention",
      icon: data.overdue_count > 0 ? <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2 mb-1" /> : null,
    },
    {
      label: "Due This Week",
      value: data.due_this_week_count,
      accent: "border-amber-500",
      sub: "Next 7 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((c, i) => (
        <Card key={i} className={`border-l-4 ${c.accent} shadow-sm hover:shadow-md transition-shadow`}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{c.label}</p>
            <div className="mt-2 flex items-baseline">
              <span className="text-3xl font-bold tabular-nums text-foreground">{c.value}</span>
              {c.icon}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
