import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  fetchTeamPerformance, fetchAllLeaveRequests, updateLeaveRequest,
  getAllCompanySettings, fetchCompanyPnL,
} from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmployeeProfileModal from "@/components/EmployeeProfileModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Users, CheckCircle2, CalendarOff, Clock, Loader2,
  Wallet, Brain, AlertTriangle, RefreshCw,
  ShieldCheck, UserCheck, CheckCheck, XCircle,
  TrendingUp, TrendingDown, DollarSign, Building2,
} from "lucide-react";

interface TeamMember {
  id: string; name: string; role: string;
  projectCount: number; taskCount: number; doneCount: number;
  pendingCount: number; overdueCount: number; dailyValue: number;
  weeklyData: { date: string; label: string; count: number }[];
  todayStatus: "working" | "on_leave" | "not_working" | "not_checked_in";
  completionRate: number; monthlySalary: number;
  workingDaysMonth: number; workingDaysYear: number;
}

interface LeaveRequest {
  id: string; user_id: string; leave_date: string;
  reason: string; status: string;
  profile?: { full_name: string; role: string };
}

interface PnL {
  totalBudget: number; monthlyRevenue: number;
  totalMonthlySalary: number; monthlyProfit: number;
  teamSize: number; projectCount: number;
}

const statusBadge: Record<string, string> = {
  working: "bg-emerald-100 text-emerald-700 border-emerald-200",
  on_leave: "bg-blue-100 text-blue-700 border-blue-200",
  not_working: "bg-gray-100 text-gray-500 border-gray-200",
  not_checked_in: "bg-amber-100 text-amber-700 border-amber-200",
};

const statusLabel: Record<string, string> = {
  working: "✅ Working",
  on_leave: "🏖 On Leave",
  not_working: "❌ Not Working",
  not_checked_in: "⏳ Not Checked In",
};

const PROVIDERS = [
  { id: "gemini", key: "gemini_api_key", model: "gemini-2.0-flash" },
  { id: "openai", key: "openai_api_key", model: "gpt-4o" },
];

export default function TeamPerformance() {
  const { isAdmin } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pnl, setPnL] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [scalingAdvice, setScalingAdvice] = useState("");
  const [scalingLoading, setScalingLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const [teamData, leaveData, settings, pnlData] = await Promise.all([
        fetchTeamPerformance(activeCompany.id),
        fetchAllLeaveRequests("pending"),
        getAllCompanySettings(activeCompany.id),
        fetchCompanyPnL(activeCompany.id),
      ]);
      setTeam(teamData);
      setLeaves(leaveData);
      setCompanySettings(settings);
      setPnL(pnlData);
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Admin access only.</p>
        </div>
      </div>
    );
  }

  const working = team.filter((m) => m.todayStatus === "working").length;
  const onLeave = team.filter((m) => m.todayStatus === "on_leave").length;
  const notIn = team.filter((m) => m.todayStatus === "not_checked_in").length;
  const isProfit = (pnl?.monthlyProfit || 0) >= 0;

  const getAiKey = () => {
    for (const p of PROVIDERS) {
      const k = companySettings[p.key];
      if (k) return { apiKey: k, model: p.model, provider: p.id };
    }
    return null;
  };

  const handleLeave = async (id: string, status: "approved" | "rejected") => {
    await updateLeaveRequest(id, status);
    toast({ title: status === "approved" ? "Leave Approved ✅" : "Leave Rejected ❌" });
    loadData();
  };

  const openProfile = (member: TeamMember) => {
    setSelectedMember(member);
    setProfileOpen(true);
  };

  // Per-employee AI tip
  const getAiTip = async (member: TeamMember) => {
    const creds = getAiKey();
    if (!creds) {
      setAiTips((prev) => ({ ...prev, [member.id]: "💡 No AI key configured. Set a Gemini or OpenAI key in AI Settings." }));
      return;
    }
    setAiLoading((prev) => ({ ...prev, [member.id]: true }));
    try {
      const prompt = `You are an executive coach. Give a concise 2-3 sentence productivity improvement tip for ${member.name} (${member.role}). Context: completion rate ${member.completionRate}%, ${member.doneCount} tasks done out of ${member.taskCount} total, ${member.overdueCount} overdue tasks, daily value ₹${member.dailyValue}, monthly salary ₹${member.monthlySalary}, working days this month: ${member.workingDaysMonth}. Be actionable and direct.`;
      let tip = "";
      if (creds.provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${creds.model}:generateContent?key=${creds.apiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        tip = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate tip.";
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.apiKey}` },
          body: JSON.stringify({ model: creds.model, messages: [{ role: "user", content: prompt }], max_tokens: 150 }),
        });
        const data = await res.json();
        tip = data.choices?.[0]?.message?.content || "Could not generate tip.";
      }
      setAiTips((prev) => ({ ...prev, [member.id]: tip }));
    } catch {
      setAiTips((prev) => ({ ...prev, [member.id]: "⚠️ Failed to get AI tip. Check your API key." }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  // Company-wide AI scaling advice
  const getScalingAdvice = async () => {
    const creds = getAiKey();
    if (!creds) {
      setScalingAdvice("💡 No AI key configured. Set a Gemini or OpenAI key in AI Settings to get scaling advice.");
      return;
    }
    if (!pnl) return;
    setScalingLoading(true);
    try {
      const avgCompletion = team.length > 0 ? Math.round(team.reduce((s, m) => s + m.completionRate, 0) / team.length) : 0;
      const overdueTotal = team.reduce((s, m) => s + m.overdueCount, 0);
      const prompt = `You are a Chief Executive Officer and business advisor. Analyze this company and give concrete scaling recommendations in 4-5 sentences.
Company: ${activeCompany?.name}
Team size: ${pnl.teamSize} people (${team.filter(m => m.role === "manager").length} managers, ${team.filter(m => m.role === "employee").length} employees)
Active projects: ${pnl.projectCount}
Total project budget: ₹${pnl.totalBudget.toLocaleString("en-IN")}
Est. monthly revenue: ₹${pnl.monthlyRevenue.toLocaleString("en-IN")}
Monthly salary cost: ₹${pnl.totalMonthlySalary.toLocaleString("en-IN")}
Monthly profit/loss: ₹${pnl.monthlyProfit.toLocaleString("en-IN")} (${isProfit ? "PROFIT" : "LOSS"})
Avg task completion rate: ${avgCompletion}%
Total overdue tasks: ${overdueTotal}
Should I hire more employees, acquire more projects, or do something else to grow and scale? Be specific and actionable.`;

      let advice = "";
      if (creds.provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${creds.model}:generateContent?key=${creds.apiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        advice = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate advice.";
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.apiKey}` },
          body: JSON.stringify({ model: creds.model, messages: [{ role: "user", content: prompt }], max_tokens: 300 }),
        });
        const data = await res.json();
        advice = data.choices?.[0]?.message?.content || "Could not generate advice.";
      }
      setScalingAdvice(advice);
    } catch {
      setScalingAdvice("⚠️ Failed to get scaling advice. Check your API key.");
    } finally {
      setScalingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" /> Team Performance
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {activeCompany?.name} · Live team status, P&L and deliverable tracking
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* ── P&L Section ──────────────────────────────────────── */}
        {pnl && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" /> Company Financials (Est. Monthly)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Est. Monthly Revenue", value: `₹${pnl.monthlyRevenue.toLocaleString("en-IN")}`, Icon: TrendingUp, color: "bg-emerald-500", sub: `Total budget ₹${pnl.totalBudget.toLocaleString("en-IN")}` },
                { label: "Monthly Salary Cost", value: `₹${pnl.totalMonthlySalary.toLocaleString("en-IN")}`, Icon: Wallet, color: "bg-amber-500", sub: `${pnl.teamSize} employees` },
                {
                  label: isProfit ? "Monthly Profit" : "Monthly Loss",
                  value: `₹${Math.abs(pnl.monthlyProfit).toLocaleString("en-IN")}`,
                  Icon: isProfit ? TrendingUp : TrendingDown,
                  color: isProfit ? "bg-violet-600" : "bg-red-500",
                  sub: isProfit ? "In profit ✅" : "Operating at loss ⚠️",
                },
                { label: "Active Projects", value: pnl.projectCount, Icon: Building2, color: "bg-indigo-500", sub: `${pnl.teamSize} team members` },
              ].map(({ label, value, Icon, color, sub }) => (
                <Card key={label}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
                        <p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Scaling Advice */}
            <div className="mt-3">
              {scalingAdvice ? (
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">AI CEO Scaling Advice for {activeCompany?.name}</span>
                    <button onClick={() => setScalingAdvice("")} className="ml-auto text-indigo-400 hover:text-indigo-600 text-lg leading-none">×</button>
                  </div>
                  <p className="text-sm text-indigo-900 leading-relaxed">{scalingAdvice}</p>
                </div>
              ) : (
                <Button
                  onClick={getScalingAdvice}
                  disabled={scalingLoading}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-10 rounded-xl gap-2"
                >
                  {scalingLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing company data…</> : <><Brain className="h-4 w-4" /> Get AI Scaling Advice (Hire more? Get more projects?)</>}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Today's status bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Team", value: team.length, Icon: Users, color: "bg-indigo-500" },
            { label: "Working Today", value: working, Icon: CheckCircle2, color: "bg-emerald-500" },
            { label: "On Leave", value: onLeave, Icon: CalendarOff, color: "bg-blue-500" },
            { label: "Not Checked In", value: notIn, Icon: Clock, color: "bg-amber-500" },
          ].map(({ label, value, Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Leave Requests */}
        {leaves.length > 0 && (
          <Card className="mb-6 border-amber-200">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                <CalendarOff className="h-4 w-4" />
                Pending Leave Requests ({leaves.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {leaves.map((lr) => (
                  <div key={lr.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {lr.profile?.full_name || "Unknown"}
                        <Badge className="ml-2 text-[10px] bg-gray-100 text-gray-600 border-gray-200">{lr.profile?.role}</Badge>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        📅 {new Date(lr.leave_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {lr.reason && <> · <em>"{lr.reason}"</em></>}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 gap-1" onClick={() => handleLeave(lr.id, "approved")}>
                        <CheckCheck className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-red-200 text-red-600 hover:bg-red-50 gap-1" onClick={() => handleLeave(lr.id, "rejected")}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team member cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No team members found. Create manager or employee accounts first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {["manager", "employee"].map((roleGroup) => {
              const members = team.filter((m) => m.role === roleGroup);
              if (members.length === 0) return null;
              return (
                <div key={roleGroup}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {roleGroup === "manager" ? <ShieldCheck className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {roleGroup === "manager" ? "Managers" : "Employees"}
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        aiTip={aiTips[member.id]}
                        aiLoading={aiLoading[member.id]}
                        onGetTip={() => getAiTip(member)}
                        onViewProfile={() => openProfile(member)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <EmployeeProfileModal
        member={selectedMember}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({
  member, aiTip, aiLoading, onGetTip, onViewProfile,
}: {
  member: TeamMember;
  aiTip?: string;
  aiLoading?: boolean;
  onGetTip: () => void;
  onViewProfile: () => void;
}) {
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const completionPct = member.completionRate;
  const [showSalary, setShowSalary] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Card header — clickable for profile */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors group"
          onClick={onViewProfile}
          title="Click to view full profile"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-700 transition-colors">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{member.name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <Badge className={`text-[10px] capitalize ${member.role === "manager" ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {member.role}
              </Badge>
              <span className="text-[10px] text-gray-400">📅 {member.workingDaysMonth}d this month · {member.workingDaysYear}d this year</span>
            </div>
          </div>
          <Badge className={`text-[10px] border ${statusBadge[member.todayStatus]}`}>
            {statusLabel[member.todayStatus]}
          </Badge>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Projects", val: member.projectCount, color: "text-indigo-600" },
              { label: "Tasks", val: member.taskCount, color: "text-gray-700" },
              { label: "Done", val: member.doneCount, color: "text-emerald-600" },
              { label: "Overdue", val: member.overdueCount, color: member.overdueCount > 0 ? "text-red-600" : "text-gray-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg py-2 px-1">
                <p className={`text-lg font-bold ${color}`}>{val}</p>
                <p className="text-[10px] text-gray-400 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Completion Rate</span>
              <span className="font-semibold">{completionPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${completionPct >= 70 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Weekly chart */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Deliverables — Last 7 Days</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={member.weeklyData} margin={{ top: 2, right: 0, left: -36, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => [`${v} tasks`, "Done"]} labelStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {member.weeklyData.map((_, i) => (
                      <Cell key={i} fill={i === 6 ? "#6366f1" : "#e5e7eb"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Salary + Daily Value row */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="flex flex-col bg-violet-50 rounded-xl px-3 py-2 border border-violet-100 cursor-pointer select-none"
              onClick={() => setShowSalary(!showSalary)}
              title="Click to reveal salary"
            >
              <span className="text-[10px] text-violet-500 font-medium">Monthly Salary</span>
              <span className="text-sm font-bold text-violet-700 mt-0.5">
                {showSalary
                  ? (member.monthlySalary > 0 ? `₹${member.monthlySalary.toLocaleString("en-IN")}` : "Not set")
                  : "••••••"
                }
              </span>
            </div>
            <div className="flex flex-col bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
              <span className="text-[10px] text-indigo-500 font-medium">Est. Daily Value</span>
              <span className="text-sm font-bold text-indigo-700 mt-0.5">₹{member.dailyValue.toLocaleString("en-IN")}/day</span>
            </div>
          </div>

          {/* Overdue alert */}
          {member.overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">
                {member.overdueCount} task{member.overdueCount > 1 ? "s" : ""} overdue — immediate action needed
              </p>
            </div>
          )}

          {/* Action row */}
          <div className="flex gap-2">
            <Button onClick={onViewProfile} variant="outline" size="sm" className="flex-1 h-8 text-xs border-gray-200">
              👤 View Full Profile
            </Button>
            {aiTip ? (
              <div className="flex-1 bg-indigo-50 rounded-lg px-2 py-1.5 border border-indigo-100">
                <div className="flex items-center gap-1 mb-0.5">
                  <Brain className="h-3 w-3 text-indigo-600" />
                  <span className="text-[9px] font-semibold text-indigo-700 uppercase tracking-wider">AI Tip</span>
                </div>
                <p className="text-[10px] text-indigo-800 leading-relaxed line-clamp-3">{aiTip}</p>
              </div>
            ) : (
              <Button onClick={onGetTip} disabled={aiLoading} variant="outline" size="sm"
                className="flex-1 h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1">
                {aiLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Getting…</> : <><Brain className="h-3 w-3" /> AI Tip</>}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
