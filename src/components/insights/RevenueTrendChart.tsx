import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtINR } from "@/lib/utils";

export interface TrendData {
  month: string;
  month_date: string;
  budget: number;
  collected: number;
  pending: number;
}

export default function RevenueTrendChart({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) return null;

  const totalBudget = data.reduce((sum, d) => sum + Number(d.budget), 0);
  const totalCollected = data.reduce((sum, d) => sum + Number(d.collected), 0);
  const avgMonthlyCollected = totalCollected / data.length;

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-indigo-500 pl-3">
            Monthly Revenue Trend
          </CardTitle>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Last 12 mo Budget</p>
              <p className="font-semibold text-foreground">{fmtINR(totalBudget)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Last 12 mo Collected</p>
              <p className="font-semibold text-emerald-600">{fmtINR(totalCollected)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Avg Monthly Collection</p>
              <p className="font-semibold text-blue-600">{fmtINR(avgMonthlyCollected)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} width={80} />
              <Tooltip 
                formatter={(value: number) => fmtINR(value)}
                labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
              <Area type="monotone" dataKey="budget" name="Contracted Budget" stroke="#6366f1" fillOpacity={1} fill="url(#colorBudget)" />
              <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" fillOpacity={1} fill="url(#colorCollected)" />
              <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
