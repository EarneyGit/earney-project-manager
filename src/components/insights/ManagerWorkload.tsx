import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fmtINR } from "@/lib/utils";

export interface WorkloadData {
  id: string;
  full_name: string;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  overdue_projects: number;
  total_tasks: number;
  completed_tasks: number;
  managed_budget: number;
}

export default function ManagerWorkload({ data }: { data: WorkloadData[] }) {
  if (!data || data.length === 0) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sortedData = [...data].sort((a, b) => Number(b.active_projects) - Number(a.active_projects));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {sortedData.map(m => {
        const taskRate = m.total_tasks > 0 ? (Number(m.completed_tasks) / Number(m.total_tasks)) * 100 : 0;
        
        return (
          <Card key={m.id} className={`shadow-sm transition-shadow hover:shadow-md ${Number(m.overdue_projects) > 0 ? 'ring-1 ring-red-300' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg">
                  {getInitials(m.full_name)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{m.full_name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Manager</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4 bg-muted/30 p-2 rounded-lg">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Active</p>
                  <p className="font-semibold">{m.active_projects}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                  <p className="font-semibold text-emerald-600">{m.completed_projects}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Overdue</p>
                  <p className={`font-semibold ${Number(m.overdue_projects) > 0 ? 'text-red-600' : 'text-foreground'}`}>
                    {m.overdue_projects}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Task Completion</span>
                  <span className="font-medium">{taskRate.toFixed(0)}%</span>
                </div>
                <Progress value={taskRate} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{m.completed_tasks} / {m.total_tasks} tasks</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Managed Budget</span>
                <span className="font-bold text-indigo-600">{fmtINR(m.managed_budget)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
