import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Undo2, Calendar, FileText } from "lucide-react";

interface FundTransfer {
  id: string;
  from_company_id: string | null;
  to_company_id: string | null;
  from_company_name: string | null;
  to_company_name: string | null;
  amount: string | number;
  type: "deposit" | "withdrawal" | "transfer" | "return";
  note: string | null;
  created_at: string;
  actioned_by_name: string | null;
}

interface FundLedgerProps {
  transfers: FundTransfer[];
  isLoading: boolean;
}

export default function FundLedger({ transfers, isLoading }: FundLedgerProps) {
  const formatINR = (val: number | string) =>
    "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowDownToLine className="h-4 w-4 text-emerald-600" />;
      case "withdrawal": return <ArrowUpFromLine className="h-4 w-4 text-rose-600" />;
      case "transfer": return <ArrowRightLeft className="h-4 w-4 text-indigo-600" />;
      case "return": return <Undo2 className="h-4 w-4 text-amber-600" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "deposit": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "withdrawal": return "bg-rose-50 text-rose-700 border-rose-200";
      case "transfer": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "return": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTransactionDesc = (tx: FundTransfer) => {
    switch (tx.type) {
      case "deposit": return `Deposited to ${tx.to_company_name}`;
      case "withdrawal": return `Withdrawn from ${tx.from_company_name}`;
      case "transfer": return `Transferred from ${tx.from_company_name} to ${tx.to_company_name}`;
      case "return": return `Returned from ${tx.from_company_name} to ${tx.to_company_name}`;
      default: return "Unknown Transaction";
    }
  };

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
        <CardTitle className="text-base font-semibold text-gray-800">Transaction Ledger</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading transactions...</div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            No transaction history found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transfers.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-full border ${getTypeColor(tx.type).replace("text-", "bg-white text-").split(" ")[0]} bg-white`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{getTransactionDesc(tx)}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      {tx.actioned_by_name && (
                        <span>By {tx.actioned_by_name}</span>
                      )}
                    </div>
                    {tx.note && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded px-2 py-1 inline-block border border-gray-100">
                        {tx.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2 shrink-0 md:w-[150px]">
                  <p className={`font-mono font-bold ${tx.type === "deposit" ? "text-emerald-600" : tx.type === "withdrawal" ? "text-rose-600" : "text-gray-900"}`}>
                    {tx.type === "deposit" ? "+" : tx.type === "withdrawal" ? "-" : ""}{formatINR(tx.amount)}
                  </p>
                  <Badge variant="outline" className={`capitalize text-[10px] px-1.5 py-0 ${getTypeColor(tx.type)}`}>
                    {tx.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
