import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import * as api from "@/services/api";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

export default function ServiceDistribution() {
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    api.fetchServices().then(res => {
      if (res && !res.error) setServices(res);
    }).catch(console.error);
  }, []);

  if (!services || services.length === 0) return null;

  // Group by client_type
  const typeMap: Record<string, number> = {};
  // Group by frequency
  const freqMap: Record<string, number> = {};

  services.forEach(s => {
    const type = s.client_type || 'Unknown';
    const freq = s.frequency || 'Unknown';
    typeMap[type] = (typeMap[type] || 0) + 1;
    freqMap[freq] = (freqMap[freq] || 0) + 1;
  });

  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  const freqData = Object.entries(freqMap).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-border p-2 rounded shadow-md text-sm">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-muted-foreground">{payload[0].value} services</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-pink-500 pl-3">
          <PieChartIcon className="h-4 w-4 mr-2" />
          Service Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[300px] mt-4">
          <div className="w-full h-full flex flex-col items-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">By Client Type</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full h-full flex flex-col items-center">
            <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">By Frequency</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={freqData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {freqData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
