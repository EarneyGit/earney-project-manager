import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function StatusPriorityMatrix({ allProjects }: { allProjects: any[] }) {
  const navigate = useNavigate();
  
  if (!allProjects) return null;

  const statuses = ['Not Started', 'In Progress', 'Completed'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  const getPriorityColor = (priority: string, count: number) => {
    if (count === 0) return 'bg-muted/30 text-muted-foreground hover:bg-muted/50';
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'High': return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'Medium': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getCount = (status: string, priority: string) => {
    return allProjects.filter(p => 
      p.status === status && 
      (p.priority === priority || (!p.priority && priority === 'Low'))
    ).length;
  };

  const handleCellClick = (status: string, priority: string) => {
    navigate(`/dashboard?status=${encodeURIComponent(status)}&priority=${encodeURIComponent(priority)}`);
  };

  return (
    <Card className="shadow-sm mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center border-l-4 border-indigo-500 pl-3">
          Status × Priority Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium text-muted-foreground">Status \ Priority</th>
                {priorities.map(p => (
                  <th key={p} className="p-2 text-center font-medium text-muted-foreground uppercase text-xs tracking-wider">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statuses.map(s => (
                <tr key={s} className="border-t border-border">
                  <td className="p-3 font-medium">{s}</td>
                  {priorities.map(p => {
                    const count = getCount(s, p);
                    return (
                      <td key={`${s}-${p}`} className="p-2 text-center">
                        <button
                          onClick={() => handleCellClick(s, p)}
                          className={`w-full h-12 rounded-md font-bold text-lg transition-colors flex items-center justify-center ${getPriorityColor(p, count)}`}
                        >
                          {count}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Click on any cell to filter the main project dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
