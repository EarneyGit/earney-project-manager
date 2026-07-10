import React, { useState, useMemo, useEffect } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import ProjectForm from "@/components/ProjectForm";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, SortAsc, SortDesc, Edit, Trash2,
  PieChart, BarChart as BarChartIcon, TrendingUp,
  Wallet, Clock, FolderOpen, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart as RechartsPieChart, Pie, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const statusStyle: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700 border border-gray-300",
  "In Progress": "bg-blue-100 text-blue-700 border border-blue-300",
  "Completed":   "bg-green-100 text-green-700 border border-green-300",
};

const priorityStyle: Record<string, string> = {
  Low:    "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border border-amber-200",
  High:   "bg-orange-100 text-orange-700 border border-orange-200",
  Urgent: "bg-red-100 text-red-700 border border-red-200",
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const calcProgress = (start: string, end: string) => {
  const s = new Date(start).getTime(), e = new Date(end).getTime(), n = Date.now();
  if (n <= s) return { progress: 0, days: Math.ceil((e - n) / 86400000) };
  if (n >= e) return { progress: 100, days: 0 };
  return {
    progress: Math.round(((n - s) / (e - s)) * 100),
    days: Math.max(0, Math.ceil((e - n) / 86400000)),
  };
};

const calcPending = (budget = 0, advance = 0, partial: number | any[] = 0) =>
  Math.max(0, budget - (advance + (typeof partial === "number" ? partial : 0)));

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, Icon, color }: { label: string; value: string; Icon: any; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5 truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{value}</p>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Project Card (mobile) ────────────────────────────────────────────────────
function ProjectCard({
  project, isAdmin, onEdit, onDelete,
}: { project: Project; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  const prog = calcProgress(project.startTime, project.deadline);
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 leading-tight">{project.name}</h3>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={statusStyle[project.status] || ""}>{project.status}</Badge>
          <Badge className={priorityStyle[project.priority] || ""}>{project.priority}</Badge>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Due</span>
            <span>{formatDate(project.deadline) || "—"}</span>
          </div>
          {isAdmin && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Budget</span>
                <span className="font-medium">{fmt(project.budget || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pending</span>
                <span className="font-medium text-red-600">{fmt(calcPending(project.budget, project.advancePayment, project.partialPayments))}</span>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{prog.progress}% · {prog.days}d left</span>
          </div>
          <Progress value={prog.progress} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Index = () => {
  const { projects, deleteProject, updateProject } = useProjects();
  const { isAdmin, isEditor, currentUser } = useAuth();
  const { activeCompany } = useCompany();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"deadline" | "name">("deadline");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string | null }>({ id: "", field: null });

  useEffect(() => {
    if (location.state?.openNewProjectForm) {
      setEditingProject(null);
      setOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const stats = useMemo(() => {
    const ps = Array.isArray(projects) ? projects : [];
    const totalBudget = ps.reduce((s, p) => s + (p.budget || 0), 0);
    const collected = ps.reduce((s, p) => s + (p.advancePayment || 0) + (typeof p.partialPayments === "number" ? p.partialPayments : 0), 0);
    const pending = ps.reduce((s, p) => s + calcPending(p.budget, p.advancePayment, p.partialPayments), 0);
    const active = ps.filter(p => p.status !== "Completed").length;

    const statusCounts = ps.reduce((a, p) => ({ ...a, [p.status]: (a[p.status] || 0) + 1 }), {} as Record<string, number>);
    const priorityCounts = ps.reduce((a, p) => ({ ...a, [p.priority]: (a[p.priority] || 0) + 1 }), {} as Record<string, number>);

    return {
      total: ps.length,
      active,
      totalBudget,
      collected,
      pending,
      statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      priorityData: Object.entries(priorityCounts).map(([name, value]) => ({ name, value })),
      paymentData: [
        { name: "Advance", value: ps.reduce((s, p) => s + (p.advancePayment || 0), 0) },
        { name: "Partial", value: ps.reduce((s, p) => s + (typeof p.partialPayments === "number" ? p.partialPayments : 0), 0) },
        { name: "Pending", value: pending },
      ],
    };
  }, [projects]);

  const filtered = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    return projects
      .filter((p) => {
        const q = search.toLowerCase();
        return (
          (p.name.toLowerCase().includes(q) || (p.assignedTo || []).some((a: string) => a.toLowerCase().includes(q))) &&
          (statusFilter === "all" || p.status === statusFilter)
        );
      })
      .sort((a, b) => {
        const asc = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "deadline") return asc * (new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        return asc * a.name.localeCompare(b.name);
      });
  }, [projects, search, statusFilter, sortBy, sortOrder]);

  const handleCellEdit = async (project: Project, field: string, value: any) => {
    try {
      await updateProject(project.id, { [field]: value });
      setEditingCell({ id: "", field: null });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeCompany?.name || "Dashboard"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stats.total} project{stats.total !== 1 ? "s" : ""} · All financials in INR
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Projects" value={String(stats.total)} Icon={FolderOpen} color="bg-indigo-600" />
          <StatCard label="Active Projects" value={String(stats.active)} Icon={Activity} color="bg-blue-600" />
          {isAdmin && (
            <>
              <StatCard label="Total Budget" value={fmt(stats.totalBudget)} Icon={Wallet} color="bg-violet-600" />
              <StatCard label="Collected" value={fmt(stats.collected)} Icon={TrendingUp} color="bg-emerald-600" />
              <StatCard label="Pending" value={fmt(stats.pending)} Icon={Clock} color="bg-rose-600" />
            </>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-white border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ProjectStatus.NOT_STARTED}>Not Started</SelectItem>
                <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "deadline" | "name")}>
              <SelectTrigger className="w-32 bg-white border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-white border-gray-200"
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>

            {(isAdmin || isEditor) && (
              <Button
                onClick={() => { setEditingProject(null); setOpen(true); }}
                className="bg-gray-900 text-white hover:bg-gray-800 sm:hidden"
              >
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            )}
          </div>
        </div>

        {/* Projects — Mobile Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No projects found</p>
            {(isAdmin || isEditor) && (
              <Button
                onClick={() => { setEditingProject(null); setOpen(true); }}
                className="mt-4 bg-gray-900 text-white"
              >
                <Plus className="h-4 w-4 mr-1" /> Create Project
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isAdmin={isAdmin}
                  onEdit={() => { setEditingProject(p); setOpen(true); }}
                  onDelete={() => deleteProject(p.id)}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Project</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[160px]">Timeline</th>
                      {isAdmin && (
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Financials</th>
                      )}
                      <th className="text-left px-5 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Team</th>
                      {(isAdmin || isEditor) && (
                        <th className="text-right px-5 py-3.5 font-semibold text-gray-600">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((project) => {
                      const prog = calcProgress(project.startTime, project.deadline);
                      const collected = (project.advancePayment || 0) + (typeof project.partialPayments === "number" ? project.partialPayments : 0);
                      const pending = calcPending(project.budget, project.advancePayment, project.partialPayments);
                      return (
                        <tr key={project.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-gray-900 truncate max-w-[220px]">{project.name}</div>
                            <div className="text-[13px] text-gray-500 mt-0.5 truncate max-w-[220px]">{project.clientName || "No Client"}</div>
                          </td>
                          <td className="px-5 py-3">
                            {editingCell.id === project.id && editingCell.field === "status" ? (
                              <Select defaultValue={project.status} onValueChange={(v) => handleCellEdit(project, "status", v)}>
                                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.values(ProjectStatus).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                onClick={() => (isAdmin || isEditor) && setEditingCell({ id: project.id, field: "status" })}
                                className={`cursor-pointer text-xs font-medium px-2 py-0.5 rounded-md ${statusStyle[project.status] || ""}`}
                              >
                                {project.status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 min-w-[160px]">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-gray-500 font-medium">{prog.progress}%</span>
                              <span className="text-gray-400">{prog.days}d left</span>
                            </div>
                            <Progress value={prog.progress} className="h-1.5" />
                          </td>
                          {isAdmin && (
                            <td className="px-5 py-3">
                              <div className="text-sm">
                                <div className="flex justify-between gap-4 mb-0.5">
                                  <span className="text-gray-500 text-xs">Budget:</span>
                                  <span className="font-medium text-gray-900">{fmt(project.budget || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4 mb-0.5">
                                  <span className="text-emerald-600/80 text-xs">Collected:</span>
                                  <span className="font-medium text-emerald-700">{fmt(collected)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-rose-600/80 text-xs">Pending:</span>
                                  <span className="font-medium text-rose-700">{fmt(pending)}</span>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo]).filter(Boolean).map((a, i) => (
                                <Badge key={i} variant="secondary" className="text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 font-normal px-1.5 py-0">
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          {(isAdmin || isEditor) && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                                  onClick={() => { setEditingProject(project); setOpen(true); }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    onClick={() => deleteProject(project.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}


                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Charts */}
        <div className="mt-8 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Project Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <PieChart className="h-4 w-4" /> Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BarChartIcon className="h-4 w-4" /> Priority Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.priorityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.priorityData.map((e, i) => (
                          <Cell key={i} fill={e.name === "Urgent" ? "#ef4444" : e.name === "High" ? "#f97316" : e.name === "Medium" ? "#f59e0b" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.paymentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Amount"]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <Cell fill="#6366f1" />
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <ProjectForm open={open} onOpenChange={setOpen} editingProject={editingProject} />
    </div>
  );
};

export default Index;
