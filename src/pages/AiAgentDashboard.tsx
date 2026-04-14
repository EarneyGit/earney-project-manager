import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import * as api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Play, RefreshCw, Settings2, AlertTriangle, CheckCircle2, Clock,
  MessageSquare, Users, ToggleLeft, ToggleRight, Send, Loader2, ShieldCheck,
} from "lucide-react";

interface Conversation {
  userId: string; userName: string; userRole: string;
  messages: any[]; unreadCount: number; lastMessage: any; lastActivity: string;
}
interface RunLog {
  id: string; run_type: string; status: string; messages_sent: number;
  risks_found: number; ai_summary: string; risk_breakdown: any;
  duration_ms: number; created_at: string;
}
interface Cfg {
  enabled: boolean; start_hour: number; end_hour: number;
  interval_hours: number; skip_sundays: boolean;
  overdue_days_threshold: number; budget_risk_pct: number;
}

const MODEL_DEFAULTS: Record<string, string> = {
  gemini: "gemini-2.0-flash", openai: "gpt-4o", groq: "llama-3.3-70b-versatile",
  claude: "claude-3-5-sonnet-20241022", deepseek: "deepseek-chat",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const statusColor: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  running:   "bg-blue-100 text-blue-700",
  failed:    "bg-red-100 text-red-700",
};

const priorityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-amber-100 text-amber-700",
  medium:   "bg-indigo-100 text-indigo-700",
  low:      "bg-emerald-100 text-emerald-700",
};

type Tab = "overview" | "conversations" | "logs" | "config";

export default function AiAgentDashboard() {
  const { currentUser, isAdmin } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [cfg, setCfg] = useState<Cfg>({
    enabled: true, start_hour: 10, end_hour: 19,
    interval_hours: 2, skip_sundays: true, overdue_days_threshold: 0, budget_risk_pct: 80,
  });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [aiCreds, setAiCreds] = useState<{ key: string; provider: string; model: string; base: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    const [convs, agentLogs, config] = await Promise.all([
      api.fetchAllAriaConversations(activeCompany.id),
      api.fetchAriaLogs(activeCompany.id),
      api.getAriaConfig(activeCompany.id),
    ]);
    setConversations(convs as Conversation[]);
    setLogs(agentLogs as RunLog[]);
    if (config) setCfg(config as Cfg);
    setLoading(false);
  }, [activeCompany?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!activeCompany) return;
    api.getAllCompanySettings(activeCompany.id).then((settings: Record<string, string>) => {
      const primary = settings["ai_primary_provider"];
      const providers = primary
        ? [primary, "gemini", "openai", "groq", "claude", "deepseek"]
        : ["gemini", "openai", "groq", "claude", "deepseek", "mistral"];
      const seen = new Set<string>();
      for (const prov of providers) {
        if (seen.has(prov)) continue;
        seen.add(prov);
        const key = settings[`ai_key_${prov}`];
        if (key) {
          setAiCreds({ key, provider: prov, model: settings[`ai_model_${prov}`] || MODEL_DEFAULTS[prov] || "", base: settings[`ai_base_${prov}`] || "" });
          return;
        }
      }
    });
  }, [activeCompany?.id]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Admin access only.</p>
        </div>
      </div>
    );
  }

  const totalMsgs = conversations.reduce((s, c) => s + c.messages.length, 0);
  const totalRisks = logs.reduce((s, l) => s + (l.risks_found || 0), 0);
  const pendingReplies = conversations.filter((c) => c.unreadCount > 0).length;
  const lastRun = logs[0];

  const handleRunNow = async () => {
    if (!activeCompany || !aiCreds || scanning) return;
    setScanning(true);
    setScanResult(null);
    const result = await (api as any).runAriaScan({
      companyId: activeCompany.id,
      triggeredBy: currentUser?.id,
      aiKey: aiCreds.key, aiProvider: aiCreds.provider,
      aiModel: aiCreds.model, customBaseUrl: aiCreds.base,
    });
    setScanResult(result);
    setScanning(false);
    if (result?.success) {
      toast({ title: "✅ ARIA Scan Complete", description: `${result.messagesSent} messages sent · ${result.risksFound} risks found` });
    } else {
      toast({ variant: "destructive", title: "Scan failed", description: result?.error || "Unknown error" });
    }
    loadData();
  };

  const handleSaveConfig = async () => {
    if (!activeCompany) return;
    setSavingConfig(true);
    const ok = await api.saveAriaConfig(activeCompany.id, cfg);
    setSavingConfig(false);
    toast(ok ? { title: "✅ ARIA config saved" } : { variant: "destructive", title: "Failed to save config" });
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview",       label: "Overview",       icon: <Bot className="h-4 w-4" /> },
    { id: "conversations",  label: "Conversations",  icon: <MessageSquare className="h-4 w-4" />, badge: pendingReplies },
    { id: "logs",           label: "Run Logs",       icon: <Clock className="h-4 w-4" /> },
    { id: "config",         label: "Configure",      icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                ARIA
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                  {cfg.enabled ? "Active" : "Paused"}
                </span>
              </h1>
              <p className="text-sm text-gray-500">AI Risk & Intelligence Agent · Monitoring your team</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={handleRunNow} disabled={scanning || !aiCreds} className="bg-violet-700 hover:bg-violet-800 text-white">
              {scanning
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Scanning…</>
                : <><Play className="h-4 w-4 mr-1.5" /> Run ARIA Now</>}
            </Button>
          </div>
        </div>

        {/* No AI key warning */}
        {!aiCreds && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">No AI key configured</p>
              <p className="text-amber-600 text-xs mt-0.5">ARIA needs an API key to generate messages. Configure one in <strong>AI Settings</strong>.</p>
            </div>
          </div>
        )}

        {/* Scan result banner */}
        {scanResult && (
          <div className={`rounded-2xl p-4 mb-6 border ${scanResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className="font-semibold text-sm mb-1 flex items-center gap-2">
              {scanResult.success
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Scan Complete</>
                : <><AlertTriangle className="h-4 w-4 text-red-500" /> Scan Failed</>}
            </p>
            {scanResult.success
              ? <p className="text-xs text-gray-700">{scanResult.aiSummary || `${scanResult.messagesSent} messages sent · ${scanResult.risksFound} risks found.`}</p>
              : <p className="text-xs text-red-600">{scanResult.error}</p>}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "bg-violet-700 text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}>
              {t.icon} {t.label}
              {(t.badge ?? 0) > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Messages Sent", value: totalMsgs, colors: "bg-violet-50 text-violet-700", icon: <MessageSquare className="h-5 w-5" /> },
                { label: "Risks Detected", value: totalRisks, colors: "bg-amber-50 text-amber-700", icon: <AlertTriangle className="h-5 w-5" /> },
                { label: "Conversations", value: conversations.length, colors: "bg-blue-50 text-blue-700", icon: <Users className="h-5 w-5" /> },
                { label: "Pending Replies", value: pendingReplies, colors: "bg-red-50 text-red-700", icon: <Send className="h-5 w-5" /> },
              ].map((k) => (
                <div key={k.label} className={`${k.colors.split(" ")[0]} rounded-2xl p-4`}>
                  <div className={`mb-2 ${k.colors.split(" ")[1]}`}>{k.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {lastRun && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" /> Last ARIA Run
                </p>
                <div className="flex flex-wrap gap-2 text-sm mb-3">
                  <Badge className={statusColor[lastRun.status]}>{lastRun.status}</Badge>
                  <span className="text-gray-500 text-xs">{new Date(lastRun.created_at).toLocaleString("en-IN")}</span>
                  <span className="text-gray-600 text-xs font-medium">{lastRun.messages_sent} messages</span>
                  {lastRun.risks_found > 0 && <span className="text-red-600 text-xs font-medium">{lastRun.risks_found} risks</span>}
                  {lastRun.duration_ms && <span className="text-gray-400 text-xs ml-auto">{(lastRun.duration_ms / 1000).toFixed(1)}s</span>}
                </div>
                {lastRun.ai_summary && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{lastRun.ai_summary}</p>
                )}
              </div>
            )}

            {conversations.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" /> Recent Team Activity
                </p>
                <div className="space-y-1">
                  {conversations.slice(0, 6).map((c) => (
                    <button key={c.userId} onClick={() => { setSelectedConv(c); setTab("conversations"); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-violet-700">{(c.userName || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {c.userName} <span className="text-xs text-gray-400 font-normal capitalize">({c.userRole})</span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">{c.lastMessage?.message}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-gray-400">{timeAgo(c.lastActivity)}</p>
                        {c.unreadCount > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">{c.unreadCount} new</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {conversations.length === 0 && !loading && (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-violet-600" />
                </div>
                <p className="font-semibold text-gray-700">ARIA hasn't scanned yet</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Click "Run ARIA Now" to start the first scan and send check-ins to your team.</p>
                <Button onClick={handleRunNow} disabled={scanning || !aiCreds} className="bg-violet-700 text-white">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Run ARIA Now
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── CONVERSATIONS ───────────────────────────────── */}
        {tab === "conversations" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* List */}
            <div className="sm:col-span-1 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Team Conversations</p>
              </div>
              <div className="overflow-y-auto max-h-[520px]">
                {conversations.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center p-6">No conversations yet.</p>
                ) : conversations.map((c) => (
                  <button key={c.userId} onClick={() => setSelectedConv(c)}
                    className={`w-full flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 text-left ${selectedConv?.userId === c.userId ? "bg-violet-50" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-violet-700">{(c.userName || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.userName}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{c.userRole}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{c.lastMessage?.message}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-[9px] text-gray-400">{timeAgo(c.lastActivity)}</p>
                      {c.unreadCount > 0 && (
                        <div className="mt-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center mx-auto">
                          {c.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Thread */}
            <div className="sm:col-span-2 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden min-h-[400px]">
              {!selectedConv ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
                  <div>
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Select a conversation to view messages
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-violet-700">{(selectedConv.userName || "?")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{selectedConv.userName}</p>
                      <p className="text-xs text-gray-400 capitalize">{selectedConv.userRole} · {selectedConv.messages.length} messages</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[450px]">
                    {selectedConv.messages.map((msg: any) => {
                      const isAria = msg.sender_type === "aria";
                      return (
                        <div key={msg.id} className={`flex ${isAria ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] rounded-xl p-2.5 text-xs ${isAria ? "bg-violet-50 border border-violet-100" : "bg-gray-100"}`}>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[9px] font-bold text-gray-500">{isAria ? "ARIA" : selectedConv.userName}</span>
                              <span className="text-[9px] text-gray-400">· {timeAgo(msg.created_at)}</span>
                              {msg.priority && msg.priority !== "medium" && (
                                <Badge className={`text-[8px] py-0 px-1 ${priorityColor[msg.priority]}`}>{msg.priority}</Badge>
                              )}
                            </div>
                            <p className="text-gray-800 leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS ─────────────────────────────────────────── */}
        {tab === "logs" && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <p className="font-semibold text-gray-800 text-sm">ARIA Run History</p>
              <span className="text-xs text-gray-400">{logs.length} runs</span>
            </div>
            {logs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No runs yet. Click "Run ARIA Now" to start.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                      <Badge className={statusColor[log.status]}>{log.status}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{log.run_type}</Badge>
                      <span className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString("en-IN")}</span>
                      <span className="text-gray-700 text-xs font-medium">{log.messages_sent} msgs</span>
                      {log.risks_found > 0 && (
                        <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />{log.risks_found} risks
                        </span>
                      )}
                      {log.duration_ms && <span className="text-gray-400 text-xs ml-auto">{(log.duration_ms / 1000).toFixed(1)}s</span>}
                    </div>
                    {log.ai_summary && (
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 leading-relaxed">{log.ai_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIG ───────────────────────────────────────── */}
        {tab === "config" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">ARIA Configuration</p>
                <p className="text-xs text-gray-400 mt-0.5">Control schedule, thresholds, and messaging behaviour</p>
              </div>
              <button onClick={() => setCfg((p) => ({ ...p, enabled: !p.enabled }))}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${cfg.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {cfg.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                {cfg.enabled ? "Enabled" : "Paused"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Start Hour (24h IST)", key: "start_hour", min: 6, max: 14 },
                { label: "End Hour (24h IST)", key: "end_hour", min: 14, max: 22 },
                { label: "Check-in Every (hours)", key: "interval_hours", min: 1, max: 6 },
                { label: "Overdue Alert After (days)", key: "overdue_days_threshold", min: 0, max: 7 },
                { label: "Budget Risk Threshold (%)", key: "budget_risk_pct", min: 50, max: 100 },
              ].map(({ label, key, min, max }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={min} max={max}
                      value={(cfg as any)[key]}
                      onChange={(e) => setCfg((p) => ({ ...p, [key]: Number(e.target.value) }))}
                      className="flex-1 accent-violet-600"
                    />
                    <span className="text-sm font-bold text-gray-800 w-6 text-right">{(cfg as any)[key]}</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Skip Sundays</p>
                  <p className="text-xs text-gray-400">No messages on Sunday</p>
                </div>
                <button onClick={() => setCfg((p) => ({ ...p, skip_sundays: !p.skip_sundays }))}
                  className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${cfg.skip_sundays ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-500"}`}>
                  {cfg.skip_sundays ? "Yes" : "No"}
                </button>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
              <p className="font-semibold mb-1">📅 Current Schedule</p>
              <p>ARIA checks in every <strong>{cfg.interval_hours}h</strong> from <strong>{cfg.start_hour}:00</strong> to <strong>{cfg.end_hour}:00 IST</strong>, Mon–{cfg.skip_sundays ? "Sat" : "Sun"}.</p>
              <p className="mt-1 text-indigo-500">Tone: <strong>Friendly</strong> for normal work · <strong>Strict</strong> for overdue tasks & delays.</p>
            </div>

            <Button onClick={handleSaveConfig} disabled={savingConfig} className="bg-violet-700 text-white hover:bg-violet-800">
              {savingConfig && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
