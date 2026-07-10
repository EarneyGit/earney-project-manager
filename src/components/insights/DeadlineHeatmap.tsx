import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AtRiskProject } from "./RiskRadar";
import { Calendar } from "lucide-react";

export default function DeadlineHeatmap({ atRiskData, allProjects }: { atRiskData: AtRiskProject[], allProjects: any[] }) {
  // Generate next 30 days
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Count deadlines per day
  const deadlinesMap: Record<string, any[]> = {};
  
  // Mix in both atRiskData and allProjects to find deadlines
  const allKnown = [...atRiskData, ...allProjects];
  // Deduplicate by ID
  const uniqueProjects = Array.from(new Map(allKnown.map(p => [p.id, p])).values());

  uniqueProjects.forEach(p => {
    if (p.deadline && p.status !== 'Completed') {
      const d = new Date(p.deadline);
      d.setHours(0,0,0,0);
      const iso = d.toISOString().split('T')[0];
      if (!deadlinesMap[iso]) deadlinesMap[iso] = [];
      deadlinesMap[iso].push(p);
    }
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-amber-200';
    if (count >= 2 && count <= 3) return 'bg-amber-400';
    return 'bg-red-500';
  };

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-indigo-500 pl-3">
          <Calendar className="h-4 w-4 mr-2" />
          30-Day Deadline Density
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-2">
          {days.map((date, i) => {
            const iso = date.toISOString().split('T')[0];
            const projects = deadlinesMap[iso] || [];
            const count = projects.length;
            
            return (
              <Tooltip key={iso}>
                <TooltipTrigger asChild>
                  <div 
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-[4px] border border-border/50 cursor-pointer transition-transform hover:scale-110 ${getHeatmapColor(count)}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold mb-1">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  {count === 0 ? (
                    <p className="text-xs text-muted-foreground">No deadlines</p>
                  ) : (
                    <ul className="text-xs space-y-1">
                      {projects.map(p => (
                        <li key={p.id}>• {p.name}</li>
                      ))}
                    </ul>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-muted border border-border/50" />
          <div className="w-3 h-3 rounded-[2px] bg-amber-200 border border-border/50" />
          <div className="w-3 h-3 rounded-[2px] bg-amber-400 border border-border/50" />
          <div className="w-3 h-3 rounded-[2px] bg-red-500 border border-border/50" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
