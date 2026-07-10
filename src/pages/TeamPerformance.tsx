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

const OPENAI_COMPAT_BASES: Record<string, string> = {
  openai:     "https://api.openai.com/v1",
  groq:       "https://api.groq.com/openai/v1",
  mistral:    "https://api.mistral.ai/v1",
  deepseek:   "https://api.deepseek.com/v1",
  together:   "https://api.together.xyz/v1",
  openrouter: "https://openrouter.ai/api/v1",
  xai:        "https://api.x.ai/v1",
};

async function callAI(provider: string, apiKey: string, model: string, prompt: string, customBaseUrl = "") {
  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
    );
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.content?.[0]?.text || "";
  }
  if (provider === "cohere") {
    const res = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 300, prompt }),
    });
    const d = await res.json();
    if (d.message) throw new Error(d.message);
    return d.generations?.[0]?.text || "";
  }
  // OpenAI-compatible fallback
  const base = provider === "custom" ? customBaseUrl : (OPENAI_COMPAT_BASES[provider] || "https://api.openai.com/v1");
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  if (provider === "openrouter") { headers["HTTP-Referer"] = window.location.origin; headers["X-Title"] = "Earney Projects"; }
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 300 }),
  });
  const d = await res.json();
  if (d.error) throw new Error(typeof d.error === "string" ? d.error : d.error?.message);
  return d.choices?.[0]?.message?.content || "";
}

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
    if (!activeCompany) { setLoading(false); return; }
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
    } catch (e) {
      console.error("TeamPerformance loadData error:", e);
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

  const getAiKey = async () => {
    if (!activeCompany) return null;
    // Try primary provider first
    const primary = companySettings["ai_primary_provider"];
    const providers = primary
      ? [primary, ...Object.keys(OPENAI_COMPAT_BASES), "gemini", "claude", "cohere", "custom"].filter((v, i, a) => a.indexOf(v) === i)
      : ["gemini", "openai", "claude", "groq", "deepseek", "mistral", "together", "openrouter", "xai", "cohere", "custom"];
    for (const prov of providers) {
      const key = companySettings[`ai_key_${prov}`];
      if (key) {
        const model = companySettings[`ai_model_${prov}`] ||
          (await import("@/types/company")).LLM_PROVIDERS.find((p: any) => p.provider === prov)?.defaultModel || "";
        const customBaseUrl = companySettings[`ai_base_${prov}`] || "";
        return { apiKey: key, model, provider: prov, customBaseUrl };
      }
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
    const creds = await getAiKey();
    if (!creds) {
      setAiTips((prev) => ({ ...prev, [member.id]: "💡 No AI key configured. Add an API key in AI Settings to get personalised tips." }));
      return;
    }
    setAiLoading((prev) => ({ ...prev, [member.id]: true }));
    try {
      const prompt = `You are an executive coach. Give a concise 2-3 sentence productivity improvement tip for ${member.name} (${member.role}). Context: completion rate ${member.completionRate}%, ${member.doneCount} tasks done out of ${member.taskCount} total, ${member.overdueCount} overdue tasks, daily value ₹${member.dailyValue}, monthly salary ₹${member.monthlySalary}, working days this month: ${member.workingDaysMonth}. Be actionable and direct.`;
      const tip = await callAI(creds.provider, creds.apiKey, creds.model, prompt, creds.customBaseUrl);
      setAiTips((prev) => ({ ...prev, [member.id]: tip || "Could not generate tip." }));
    } catch {
      setAiTips((prev) => ({ ...prev, [member.id]: "⚠️ Failed to get AI tip. Check your API key in AI Settings." }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  // Company-wide AI scaling advice
  const getScalingAdvice = async () => {
    const creds = await getAiKey();
    if (!creds) {
      setScalingAdvice("💡 No AI key configured. Add an API key in AI Settings to get scaling advice.");
      return;
    }
    if (!pnl) return;
    setScalingLoading(true);
    try {
      const avgCompletion = team.length > 0 ? Math.round(team.reduce((s, m) => s + m.completionRate, 0) / team.length) : 0;
      const overdueTotal = team.reduce((s, m) => s + m.overdueCount, 0);
      const prompt = `You are a Chief Executive Officer and business advisor. Analyze this company and give concrete scaling recommendations in 4-5 sentences.
Company: ${activeCompany?.name}
Team: ${pnl.teamSize} people (${team.filter(m => m.role === "manager").length} managers, ${team.filter(m => m.role === "employee").length} employees)
Active projects: ${pnl.projectCount}
Total project budget: ₹${pnl.totalBudget.toLocaleString("en-IN")}
Est. monthly revenue: ₹${pnl.monthlyRevenue.toLocaleString("en-IN")}
Monthly salary cost: ₹${pnl.totalMonthlySalary.toLocaleString("en-IN")}
Monthly profit/loss: ₹${pnl.monthlyProfit.toLocaleString("en-IN")} (${isProfit ? "PROFIT" : "LOSS"})
Avg task completion: ${avgCompletion}%
Overdue tasks: ${overdueTotal}
Should I hire more employees, acquire more projects, or do something else to grow and scale? Be specific and actionable.`;
      const advice = await callAI(creds.provider, creds.apiKey, creds.model, prompt, creds.customBaseUrl);
      setScalingAdvice(advice || "Could not generate advice.");
    } catch {
      setScalingAdvice("⚠️ Failed to get scaling advice. Check your API key in AI Settings.");
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

        {/* Team members table */}
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
          <div className="space-y-8">
            {["manager", "employee"].map((roleGroup) => {
              const members = team.filter((m) => m.role === roleGroup);
              if (members.length === 0) return null;
              return (
                <div key={roleGroup}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {roleGroup === "manager" ? <ShieldCheck className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {roleGroup === "manager" ? "Managers" : "Employees"}
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                          <tr>
                            <th className="px-5 py-4 font-semibold">Team Member</th>
                            <th className="px-5 py-4 font-semibold">Status</th>
                            <th className="px-5 py-4 font-semibold">Tasks & Completion</th>
                            <th className="px-5 py-4 font-semibold">Financials</th>
                            <th className="px-5 py-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {members.map((member) => (
                            <MemberTableRow
                              key={member.id}
                              member={member}
                              aiTip={aiTips[member.id]}
                              aiLoading={aiLoading[member.id]}
                              onGetTip={() => getAiTip(member)}
                              onViewProfile={() => openProfile(member)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
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

// ─── Member Table Row ──────────────────────────────────────────────────────────────
function MemberTableRow({
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
    <tr className="hover:bg-gray-50/80 transition-colors group">
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-3 cursor-pointer" onClick={onViewProfile} title="View Profile">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-700 transition-colors shadow-sm">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{member.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-[10px] capitalize px-1.5 py-0 ${member.role === "manager" ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {member.role}
              </Badge>
              <span className="text-[10px] text-gray-400">📅 {member.workingDaysMonth}d (mo)</span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="px-5 py-4 align-top">
        <Badge className={`text-[11px] font-medium border px-2 py-0.5 ${statusBadge[member.todayStatus]}`}>
          {statusLabel[member.todayStatus]}
        </Badge>
        {member.overdueCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-red-600 bg-red-50/80 px-2 py-1 rounded-md border border-red-100 inline-flex">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            {member.overdueCount} overdue
          </div>
        )}
      </td>
      
      <td className="px-5 py-4 align-top min-w-[200px]">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{member.doneCount} / {member.taskCount} tasks done</span>
          <span className="font-semibold">{completionPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
          <div
            className={`h-1.5 rounded-full transition-all ${completionPct >= 70 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="font-medium text-indigo-600">{member.projectCount} Projects</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-emerald-600">{member.doneCount} Done</span>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="space-y-1.5">
          <div 
            className="flex justify-between items-center bg-violet-50/50 rounded px-2 py-1 border border-violet-100 cursor-pointer w-36"
            onClick={() => setShowSalary(!showSalary)}
            title="Click to reveal salary"
          >
            <span className="text-[10px] text-violet-600 font-medium">Salary/mo</span>
            <span className="text-xs font-bold text-violet-700">
              {showSalary ? (member.monthlySalary > 0 ? `₹${member.monthlySalary.toLocaleString("en-IN")}` : "N/A") : "••••••"}
            </span>
          </div>
          <div className="flex justify-between items-center bg-indigo-50/50 rounded px-2 py-1 border border-indigo-100 w-36">
            <span className="text-[10px] text-indigo-600 font-medium">Daily Val</span>
            <span className="text-xs font-bold text-indigo-700">₹{member.dailyValue.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top text-right w-64">
        {aiTip ? (
          <div className="bg-indigo-50 rounded-lg px-2 py-1.5 border border-indigo-100 text-left mb-2 relative">
            <div className="flex items-center gap-1 mb-0.5">
              <Brain className="h-3 w-3 text-indigo-600" />
              <span className="text-[9px] font-semibold text-indigo-700 uppercase tracking-wider">AI Coach</span>
            </div>
            <p className="text-[10px] text-indigo-800 leading-tight">{aiTip}</p>
          </div>
        ) : null}
        
        <div className="flex gap-2 justify-end">
          <Button onClick={onViewProfile} variant="ghost" size="sm" className="h-8 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-200">
            Profile
          </Button>
          {!aiTip && (
            <Button onClick={onGetTip} disabled={aiLoading} variant="outline" size="sm"
              className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 bg-white shadow-sm">
              {aiLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</> : <><Brain className="h-3 w-3" /> AI Tip</>}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
