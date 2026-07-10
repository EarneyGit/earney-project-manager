import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

interface FundOverviewGridProps {
  overview: {
    totalAdded: number;
    totalSpent: number;
    totalBalance: number;
  } | null;
}

export default function FundOverviewGrid({ overview }: FundOverviewGridProps) {
  const formatINR = (val: number) =>
    "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Balance */}
      <Card className="bg-black text-white shadow-md border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">Total Balance</p>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-4 font-mono">{formatINR(overview?.totalBalance || 0)}</p>
          <p className="text-xs text-gray-400 mt-2">Available across all active companies</p>
        </CardContent>
      </Card>

      {/* Total Deposited (Added) */}
      <Card className="bg-white border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Deposited</p>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <ArrowDownRight className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4 font-mono">{formatINR(overview?.totalAdded || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">All time funds added</p>
        </CardContent>
      </Card>

      {/* Total Spent (Withdrawn) */}
      <Card className="bg-white border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
              <ArrowUpRight className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4 font-mono">{formatINR(overview?.totalSpent || 0)}</p>
          <p className="text-xs text-gray-500 mt-2">All time funds utilized</p>
        </CardContent>
      </Card>
    </div>
  );
}
