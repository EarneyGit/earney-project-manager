import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { fmtINR } from "@/lib/utils";

export interface ClientData {
  client_name: string;
  project_count: number;
  completed: number;
  in_progress: number;
  overdue: number;
  total_budget: number;
  total_collected: number;
  total_pending: number;
}

export default function ClientLeaderboard({ data }: { data: ClientData[] }) {
  const [search, setSearch] = useState("");

  if (!data || data.length === 0) return null;

  const filteredData = data.filter(c => 
    c.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 font-bold text-xs">1</span>;
    if (index === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-800 font-bold text-xs">2</span>;
    if (index === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-amber-100 font-bold text-xs">3</span>;
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground font-medium text-xs">{index + 1}</span>;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-emerald-500 pl-3">
            Top Clients by Revenue
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium w-12 text-center">Rank</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-center">Projects</th>
                <th className="px-4 py-3 font-medium text-right">Total Budget</th>
                <th className="px-4 py-3 font-medium text-right">Collected</th>
                <th className="px-4 py-3 font-medium text-right">Pending</th>
                <th className="px-4 py-3 font-medium min-w-[120px]">Collection Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">No clients found matching "{search}"</td>
                </tr>
              ) : (
                filteredData.map((c, i) => {
                  const rate = c.total_budget > 0 ? (Number(c.total_collected) / Number(c.total_budget)) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 text-center">{getRankBadge(i)}</td>
                      <td className="px-4 py-3 font-medium">{c.client_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{c.project_count}</span>
                          <div className="flex gap-1 mt-1 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700" title="Completed">{c.completed}</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" title="In Progress">{c.in_progress}</span>
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700" title="Overdue">{c.overdue}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtINR(c.total_budget)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{fmtINR(c.total_collected)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmtINR(c.total_pending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-9 text-right">{rate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
