import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fmtINR } from "@/lib/utils";
import { OverviewData } from "./KpiStrip";

export default function FinancialKpis({ data }: { data: OverviewData | null }) {
  if (!data) return null;

  const collectionRate = parseFloat(data.collection_rate_pct);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Revenue</p>
          <div className="mt-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{fmtINR(data.total_budget)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Contracted</p>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Collected</p>
          <div className="mt-2">
            <span className="text-3xl font-bold tabular-nums text-emerald-600">{fmtINR(data.total_collected)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={collectionRate} className="h-1.5 w-24" />
            <p className="text-xs text-muted-foreground">{collectionRate}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Outstanding</p>
          <div className="mt-2">
            <span className="text-3xl font-bold tabular-nums text-amber-600">{fmtINR(data.total_pending)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pending collection</p>
        </CardContent>
      </Card>
    </div>
  );
}
