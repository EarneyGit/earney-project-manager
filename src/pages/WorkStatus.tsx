import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  getMyWorkStatus, setWorkStatus, submitLeaveRequest,
  fetchMyLeaveRequests, fetchServicesWithDeliveryStatus, fetchProjectsByManager, fetchTasks,
} from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import WorkStatusModal from "@/components/WorkStatusModal";
import DelayAlertBanner from "@/components/DelayAlertBanner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  CheckCircle2, CalendarOff, Loader2, Clock, AlertTriangle, Send, RefreshCw,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
};

export default function WorkStatus() {
  const { currentUser } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const [todayStatus, setTodayStatus] = useState<"loading" | "not_checked_in" | "working" | "not_working">("loading");
  const [showModal, setShowModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [delayedServices, setDelayedServices] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ws, leaves] = await Promise.all([
        getMyWorkStatus(),
        fetchMyLeaveRequests(),
      ]);

      setTodayStatus(!ws ? "not_checked_in" : ws.is_working ? "working" : "not_working");
      setMyLeaves(leaves || []);

      // Load delay data if company is set
      if (activeCompany && currentUser) {
        const projects = await fetchProjectsByManager(currentUser.id, activeCompany.id);
        const allDelays: any[] = [];
        for (const proj of projects) {
          const svcs = await fetchServicesWithDeliveryStatus(proj.id);
          const delayed = svcs.filter((s: any) => s.delayStatus !== "on_track");
          allDelays.push(...delayed.map((d: any) => ({ ...d, projectName: proj.name })));
        }
        setDelayedServices(allDelays);

        // Weekly deliverables
        const tasks = await fetchTasks({ assignedTo: currentUser.id });
        const doneTasks = tasks.filter((t: any) => t.status === "done");
        const weekly = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split("T")[0];
          const label = d.toLocaleDateString("en-IN", { weekday: "short" });
          const count = doneTasks.filter((t: any) => t.updatedAt?.startsWith(dateStr)).length;
          return { label, count };
        });
        setWeeklyData(weekly);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeCompany]);

  const handleWorkingConfirm = async () => {
    setShowModal(false);
    const ok = await setWorkStatus(true);
    if (ok) {
      setTodayStatus("working");
      toast({ title: "✅ Checked in", description: "You're logged as working today." });
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) { toast({ variant: "destructive", title: "Select a leave date" }); return; }
    setSubmittingLeave(true);
    try {
      await submitLeaveRequest(leaveDate, leaveReason);
      toast({ title: "Leave Request Submitted", description: "Your admin will review and approve it." });
      setLeaveDate("");
      setLeaveReason("");
      loadData();
    } catch {
      toast({ variant: "destructive", title: "Failed to submit leave request" });
    } finally {
      setSubmittingLeave(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Work Status</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your check-in, deliverables and leave</p>
        </div>

        {/* Delay alerts */}
        {delayedServices.length > 0 && <DelayAlertBanner services={delayedServices} />}

        {/* Today status card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${todayStatus === "working" ? "bg-emerald-500" : "bg-amber-400"}`} />
              <p className="font-semibold text-gray-800">Today's Status</p>
            </div>

            {todayStatus === "working" ? (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">You're checked in and working today!</span>
              </div>
            ) : todayStatus === "loading" ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-800">You haven't checked in for today.</span>
                </div>
                <Button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-10 rounded-xl flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> I'm Working Today
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly chart */}
        {weeklyData.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700">My Deliverables — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 2, right: 0, left: -36, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v} tasks`, "Done"]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((_, i) => (
                        <Cell key={i} fill={i === 6 ? "#6366f1" : "#e5e7eb"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply for leave */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CalendarOff className="h-4 w-4" /> Apply for Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <form onSubmit={handleLeaveSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="leave-date" className="text-sm">Leave Date *</Label>
                <Input
                  id="leave-date"
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  min={todayStr}
                  className="h-10 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-reason" className="text-sm">Reason (optional)</Label>
                <Input
                  id="leave-reason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Medical appointment"
                  className="h-10 rounded-xl border-gray-200"
                />
              </div>
              <Button
                type="submit"
                disabled={submittingLeave}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
              >
                {submittingLeave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Leave Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My leave history */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">My Leave History</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadData} className="h-7 gap-1 text-xs">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : myLeaves.length === 0 ? (
              <p className="text-sm text-gray-400">No leave requests yet.</p>
            ) : (
              <div className="space-y-2">
                {myLeaves.map((lr: any) => (
                  <div key={lr.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(lr.leave_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {lr.reason && <p className="text-xs text-gray-400">{lr.reason}</p>}
                    </div>
                    <Badge className={`text-[10px] border capitalize ${statusColors[lr.status] || ""}`}>
                      {lr.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <WorkStatusModal open={showModal} onConfirm={handleWorkingConfirm} />
    </div>
  );
}
