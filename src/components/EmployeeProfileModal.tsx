import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchUserLeaveHistory } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  X, CalendarCheck, CalendarOff, Wallet, CheckCircle2, Clock,
  TrendingUp, AlertTriangle, ShieldCheck, UserCheck,
} from "lucide-react";

interface WeeklyDataPoint { date: string; label: string; count: number; }
interface TeamMember {
  id: string;
  name: string;
  role: string;
  projectCount: number;
  taskCount: number;
  doneCount: number;
  pendingCount: number;
  overdueCount: number;
  dailyValue: number;
  weeklyData: WeeklyDataPoint[];
  todayStatus: string;
  completionRate: number;
  monthlySalary: number;
  workingDaysMonth: number;
  workingDaysYear: number;
}

interface EmployeeProfileModalProps {
  member: TeamMember | null;
  open: boolean;
  onClose: () => void;
}

const statusBadge: Record<string, string> = {
  working: "bg-emerald-100 text-emerald-700 border-emerald-200",
  on_leave: "bg-blue-100 text-blue-700 border-blue-200",
  not_working: "bg-gray-100 text-gray-500 border-gray-200",
  not_checked_in: "bg-amber-100 text-amber-700 border-amber-200",
};
const statusLabel: Record<string, string> = {
  working: "✅ Working Today",
  on_leave: "🏖 On Leave",
  not_working: "❌ Not Working",
  not_checked_in: "⏳ Not Checked In",
};

export default function EmployeeProfileModal({ member, open, onClose }: EmployeeProfileModalProps) {
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (member && open) {
      fetchUserLeaveHistory(member.id).then(setLeaves);
    }
  }, [member, open]);

  if (!member) return null;

  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const completionPct = member.completionRate;
  const isManager = member.role === "manager";

  // Month working days target (approx business days)
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const targetDays = Math.round(daysInMonth * (5 / 7)); // ~business days
  const attendancePct = targetDays > 0 ? Math.min(100, Math.round((member.workingDaysMonth / targetDays) * 100)) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-900 px-5 py-4 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isManager ? "bg-indigo-600" : "bg-gray-700"}`}>
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-[10px] border ${isManager ? "bg-indigo-900 text-indigo-300 border-indigo-700" : "bg-gray-700 text-gray-300 border-gray-600"} capitalize`}>
                  {isManager ? <ShieldCheck className="h-3 w-3 mr-1 inline" /> : <UserCheck className="h-3 w-3 mr-1 inline" />}
                  {member.role}
                </Badge>
                <Badge className={`text-[10px] border ${statusBadge[member.todayStatus]}`}>
                  {statusLabel[member.todayStatus]}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 space-y-5">
          {/* Salary & Daily Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="h-3.5 w-3.5 text-violet-600" />
                <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Monthly Salary</span>
              </div>
              <p className="text-lg font-bold text-violet-800">
                {member.monthlySalary > 0 ? `₹${member.monthlySalary.toLocaleString("en-IN")}` : "Not Set"}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Daily Value</span>
              </div>
              <p className="text-lg font-bold text-indigo-800">
                ₹{member.dailyValue.toLocaleString("en-IN")}/day
              </p>
            </div>
          </div>

          {/* Working Days */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> Working Days
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                <p className="text-2xl font-bold text-emerald-700">{member.workingDaysMonth}</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">This Month</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Target ~{targetDays} days</p>
                <div className="w-full bg-emerald-100 rounded-full h-1 mt-2">
                  <div
                    className={`h-1 rounded-full transition-all ${attendancePct >= 80 ? "bg-emerald-500" : attendancePct >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${attendancePct}%` }}
                  />
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                <p className="text-2xl font-bold text-blue-700">{member.workingDaysYear}</p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">This Year</p>
                <p className="text-[10px] text-blue-400 mt-0.5">
                  ~{Math.round(member.workingDaysYear / Math.max(1, new Date().getMonth() + 1))}/month avg
                </p>
              </div>
            </div>
          </div>

          {/* Performance stats */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Performance
            </p>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {[
                { label: "Projects", val: member.projectCount, color: "text-indigo-600" },
                { label: "Tasks", val: member.taskCount, color: "text-gray-700" },
                { label: "Done", val: member.doneCount, color: "text-emerald-600" },
                { label: "Overdue", val: member.overdueCount, color: member.overdueCount > 0 ? "text-red-600" : "text-gray-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg py-2">
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Completion bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Completion Rate</span>
                <span className="font-semibold">{completionPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${completionPct >= 70 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly chart */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Deliverables — Last 7 Days
            </p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={member.weeklyData} margin={{ top: 2, right: 0, left: -36, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => [`${v} tasks`, "Done"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {member.weeklyData.map((_, i) => (
                      <Cell key={i} fill={i === 6 ? "#6366f1" : "#e5e7eb"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overdue alert */}
          {member.overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">
                {member.overdueCount} overdue task{member.overdueCount > 1 ? "s" : ""} — immediate action required
              </p>
            </div>
          )}

          {/* Approved Leaves this year */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CalendarOff className="h-3.5 w-3.5" /> Approved Leaves This Year ({leaves.length})
            </p>
            {leaves.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 text-center">No approved leaves this year.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {leaves.map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-700">
                      {new Date(l.leave_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {l.reason && <span className="text-xs text-gray-400 truncate max-w-[120px]">{l.reason}</span>}
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 ml-2">Approved</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={onClose} variant="outline" className="w-full h-10 rounded-xl">
            Close Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
