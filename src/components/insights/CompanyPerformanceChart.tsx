import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtINR } from "@/lib/utils";

export interface CompanyPerfData {
  id: string;
  name: string;
  project_count: number;
  completed: number;
  in_progress: number;
  total_budget: number;
  total_collected: number;
  wallet_balance: number;
  funds_added: number;
  funds_spent: number;
}

export function CompanyWalletSnapshot({ data }: { data: CompanyPerfData[] }) {
  if (!data || data.length === 0) return null;

  const sortedData = [...data].sort((a, b) => b.wallet_balance - a.wallet_balance);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-indigo-500 pl-3">
          Company Wallet Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium text-center">Projects</th>
                <th className="px-4 py-3 font-medium text-right">Wallet Balance</th>
                <th className="px-4 py-3 font-medium text-right">Funds Added</th>
                <th className="px-4 py-3 font-medium text-right">Funds Spent</th>
                <th className="px-4 py-3 font-medium text-right">Contracted</th>
                <th className="px-4 py-3 font-medium text-right">Collected</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((c, i) => (
                <tr key={c.id} className={`border-b border-border hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-center">{c.project_count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmtINR(c.wallet_balance)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtINR(c.funds_added)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmtINR(c.funds_spent)}</td>
                  <td className="px-4 py-3 text-right">{fmtINR(c.total_budget)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtINR(c.total_collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompanyPerformanceChart({ data }: { data: CompanyPerfData[] }) {
  const [sortField, setSortField] = useState<keyof CompanyPerfData>('total_budget');
  const [sortDesc, setSortDesc] = useState(true);

  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({
    name: d.name.substring(0, 15) + (d.name.length > 15 ? '...' : ''),
    Budget: Number(d.total_budget),
    Collected: Number(d.total_collected),
    Wallet: Number(d.wallet_balance)
  }));

  const sortedTableData = [...data].sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (va < vb) return sortDesc ? 1 : -1;
    if (va > vb) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleSort = (field: keyof CompanyPerfData) => {
    if (sortField === field) setSortDesc(!sortDesc);
    else { setSortField(field); setSortDesc(true); }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-indigo-500 pl-3">
            Company Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} width={80} />
                <Tooltip formatter={(value: number) => fmtINR(value)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Wallet" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  {[{k: 'name', l: 'Company'}, {k: 'total_budget', l: 'Total Budget'}, {k: 'total_collected', l: 'Collected'}, {k: 'wallet_balance', l: 'Wallet Balance'}].map(col => (
                    <th key={col.k} 
                        className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                        onClick={() => handleSort(col.k as keyof CompanyPerfData)}>
                      {col.l} {sortField === col.k && (sortDesc ? '↓' : '↑')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTableData.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{fmtINR(c.total_budget)}</td>
                    <td className="px-4 py-3 text-emerald-600">{fmtINR(c.total_collected)}</td>
                    <td className="px-4 py-3 font-semibold">{fmtINR(c.wallet_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
