import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export interface TaskRateData {
  total_tasks: number;
  done: number;
  in_progress: number;
  todo: number;
  overdue_tasks: number;
  completion_rate_pct: string;
}

export default function TaskHealthBar({ data }: { data: TaskRateData | null }) {
  if (!data) return null;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow mb-6">
      <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Tasks</p>
            <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{data.total_tasks}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Done</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">{data.done}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">In Progress</p>
            <p className="text-2xl font-bold tabular-nums text-blue-600 mt-1">{data.in_progress}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">To Do</p>
            <p className="text-2xl font-bold tabular-nums text-gray-600 mt-1">{data.todo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Overdue</p>
            <p className="text-2xl font-bold tabular-nums text-red-600 mt-1">{data.overdue_tasks}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 pl-0 md:pl-6 border-t md:border-t-0 md:border-l pt-4 md:pt-0 border-border min-w-[200px] justify-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center bg-muted"
            style={{ 
              background: `conic-gradient(#10b981 ${data.completion_rate_pct}%, #f1f5f9 0)` 
            }}
          >
            <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{data.completion_rate_pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Completion Rate</p>
            <p className="text-xs text-muted-foreground">Overall health</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
