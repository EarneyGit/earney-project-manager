import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fmtINR } from "@/lib/utils";

export interface AgingData {
  aging_bucket: string;
  project_count: number;
  outstanding_amount: number;
}

const BUCKET_COLORS: Record<string, string> = {
  'current': '#10b981', // emerald-500
  '1-30 days': '#f59e0b', // amber-500
  '31-60 days': '#f97316', // orange-500
  '61-90 days': '#ef4444', // red-500
  '90+ days': '#991b1b', // red-800
};

export default function PaymentAgingChart({ data }: { data: AgingData[] }) {
  if (!data || data.length === 0) return null;

  // Ensure all buckets are present even if 0
  const order = ['current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
  const chartData = order.map(bucket => {
    const existing = data.find(d => d.aging_bucket === bucket);
    return {
      bucket,
      amount: existing ? Number(existing.outstanding_amount) : 0,
      projects: existing ? Number(existing.project_count) : 0
    };
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-amber-500 pl-3">
          Payment Aging Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="bucket" width={80} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                formatter={(value: number, name: string) => [fmtINR(value), "Outstanding Amount"]}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.bucket] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 font-medium">Aging Bucket</th>
                <th className="px-4 py-3 font-medium text-center">Projects</th>
                <th className="px-4 py-3 font-medium text-right">Outstanding Amount</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.bucket} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: BUCKET_COLORS[row.bucket] }} />
                    {row.bucket.charAt(0).toUpperCase() + row.bucket.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-center">{row.projects}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmtINR(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
