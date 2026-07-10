import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export default function VelocityChart({ allProjects }: { allProjects: any[] }) {
  if (!allProjects || allProjects.length === 0) return null;

  // Generate last 12 months
  const months = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    months.push({
      date: new Date(d.getTime()),
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: 0
    });
    d.setMonth(d.getMonth() + 1);
  }

  // Count completions
  allProjects.forEach(p => {
    if (p.status === 'Completed' && p.updated_at) {
      const pDate = new Date(p.updated_at);
      const m = months.find(x => x.date.getMonth() === pDate.getMonth() && x.date.getFullYear() === pDate.getFullYear());
      if (m) m.count++;
    }
  });

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-emerald-500 pl-3">
          <TrendingUp className="h-4 w-4 mr-2" />
          Completion Velocity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} width={40} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" name="Projects Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
