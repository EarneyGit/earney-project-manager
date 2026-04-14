import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { fetchTeamPerformance, fetchAllLeaveRequests, updateLeaveRequest, getAllCompanySettings } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, CheckCircle2, CalendarOff, Clock, Loader2,
  TrendingUp, Wallet, Brain, AlertTriangle, RefreshCw,
  ShieldCheck, UserCheck, CheckCheck, XCircle,
} from "lucide-react";

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
  weeklyData: { date: string; label: string; count: number }[];
  todayStatus: "working" | "on_leave" | "not_working" | "not_checked_in";
  completionRate: number;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_date: string;
  reason: string;
  status: string;
  profile?: { full_name: string; role: string };
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
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const [teamData, leaveData, settings] = await Promise.all([
        fetchTeamPerformance(activeCompany.id),
        fetchAllLeaveRequests("pending"),
        getAllCompanySettings(activeCompany.id),
      ]);
      setTeam(teamData);
      setLeaves(leaveData);
      setCompanySettings(settings);
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

  const handleLeave = async (id: string, status: "approved" | "rejected") => {
    await updateLeaveRequest(id, status);
    toast({ title: status === "approved" ? "Leave Approved" : "Leave Rejected" });
    loadData();
  };

  const getAiTip = async (member: TeamMember) => {
    let apiKey = "";
    let model = "";
    let provider = "";

    for (const p of PROVIDERS) {
      const k = companySettings[p.key];
      if (k) { apiKey = k; model = p.model; provider = p.id; break; }
    }

    if (!apiKey) {
      setAiTips((prev) => ({
        ...prev,
        [member.id]: "💡 No AI key configured. Set a Gemini or OpenAI key in AI Settings to get personalised tips.",
      }));
      return;
    }

    setAiLoading((prev) => ({ ...prev, [member.id]: true }));
    try {
      const prompt = `You are an executive coach. Give a concise 2-3 sentence productivity improvement tip for ${member.name} (${member.role}). Context: completion rate ${member.completionRate}%, ${member.doneCount} tasks done out of ${member.taskCount} total, ${member.overdueCount} overdue tasks, daily contribution value ₹${member.dailyValue}. Be actionable and direct.`;

      let tip = "";
      if (provider === "gemini") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        const data = await res.json();
        tip = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate tip.";
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 150 }),
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
              {activeCompany?.name} · Live team status and deliverable tracking
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

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
                      <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 gap-1"
                        onClick={() => handleLeave(lr.id, "approved")}>
                        <CheckCheck className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-red-200 text-red-600 hover:bg-red-50 gap-1"
                        onClick={() => handleLeave(lr.id, "rejected")}>
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
            {/* Managers first, then employees */}
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
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({
  member, aiTip, aiLoading, onGetTip,
}: {
  member: TeamMember;
  aiTip?: string;
  aiLoading?: boolean;
  onGetTip: () => void;
}) {
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const completionPct = member.completionRate;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Card header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{member.name}</p>
            <Badge className={`text-[10px] mt-0.5 capitalize ${member.role === "manager" ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {member.role}
            </Badge>
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
            <div className="h-24">
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

          {/* Daily value */}
          <div className="flex items-center justify-between bg-violet-50 rounded-xl px-3 py-2 border border-violet-100">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-600" />
              <span className="text-xs text-violet-700 font-medium">Est. Daily Company Value</span>
            </div>
            <span className="text-sm font-bold text-violet-700">
              ₹{member.dailyValue.toLocaleString("en-IN")}/day
            </span>
          </div>

          {/* Overdue alert indicator */}
          {member.overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">
                {member.overdueCount} task{member.overdueCount > 1 ? "s" : ""} overdue — immediate action needed
              </p>
            </div>
          )}

          {/* AI Tip */}
          {aiTip ? (
            <div className="bg-indigo-50 rounded-xl px-3 py-3 border border-indigo-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">AI Coach Tip</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">{aiTip}</p>
            </div>
          ) : (
            <Button
              onClick={onGetTip}
              disabled={aiLoading}
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-2"
            >
              {aiLoading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting AI Tip…</>
              ) : (
                <><Brain className="h-3.5 w-3.5" /> Get AI Productivity Tip</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
