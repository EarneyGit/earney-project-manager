import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { fmtINR, formatDate } from "@/lib/utils";

export interface AtRiskProject {
  id: string;
  name: string;
  client_name: string;
  status: string;
  priority: string;
  deadline: string;
  budget: number;
  pending_payment: number;
  manager_name: string;
  company_name: string;
  risk_type: 'overdue' | 'due_soon' | 'at_risk';
  days_overdue: number;
}

const PriorityBadge = ({ priority }: { priority: string }) => {
  const getColors = () => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return <Badge variant="outline" className={`${getColors()} text-[10px] uppercase px-1.5 py-0`}>{priority || 'Low'}</Badge>;
};

export default function RiskRadar({ data }: { data: AtRiskProject[] }) {
  if (!data) return null;

  const overdue = data.filter(p => p.risk_type === 'overdue');
  const dueSoon = data.filter(p => p.risk_type === 'due_soon');

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-48 text-center p-4">
      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>
      <p className="text-sm font-medium text-emerald-700">{message}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      {/* OVERDUE */}
      <Card className="shadow-sm border-red-200">
        <CardHeader className="pb-3 border-b bg-red-50/50">
          <CardTitle className="text-base font-semibold flex items-center text-red-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Overdue Projects ({overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdue.length === 0 ? (
            <EmptyState message="No overdue projects. Great job!" />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-border">
                {overdue.map(p => (
                  <li key={p.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={p.priority} />
                        <span className="font-semibold text-sm">{p.name}</span>
                      </div>
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {Math.floor(p.days_overdue)} days overdue
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-between mt-2">
                      <div className="flex flex-col gap-1">
                        <span>Client: <span className="text-foreground font-medium">{p.client_name || 'N/A'}</span></span>
                        <span>Manager: {p.manager_name || 'Unassigned'}</span>
                      </div>
                      <div className="text-right flex flex-col gap-1">
                        <span>Pending: <span className="text-amber-600 font-semibold">{fmtINR(p.pending_payment)}</span></span>
                        <span>Due: {formatDate(p.deadline)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DUE SOON */}
      <Card className="shadow-sm border-amber-200">
        <CardHeader className="pb-3 border-b bg-amber-50/50">
          <CardTitle className="text-base font-semibold flex items-center text-amber-700">
            <Clock className="h-4 w-4 mr-2" />
            Due This Week ({dueSoon.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dueSoon.length === 0 ? (
            <EmptyState message="No projects due in the next 7 days." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-border">
                {dueSoon.map(p => {
                  const daysLeft = Math.ceil(-p.days_overdue);
                  return (
                    <li key={p.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={p.priority} />
                          <span className="font-semibold text-sm">{p.name}</span>
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          {daysLeft === 0 ? 'Due today' : `Due in ${daysLeft} days`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between mt-2">
                        <span>Client: <span className="text-foreground font-medium">{p.client_name || 'N/A'}</span></span>
                        <Badge variant="outline" className="text-[10px] font-normal">{p.status}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
