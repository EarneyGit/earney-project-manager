import React, { useState, useRef, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { LLM_PROVIDERS, LLMProvider } from "@/types/company";
import * as api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, X, Send, Minimize2, Maximize2, Loader2, Building2, AlertCircle,
  Settings, ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─── Build System Prompt from company data ──────────────────────
const buildSystemPrompt = (companyName: string, snapshot: any): string => {
  const { projects = [], tasks = [], managers = [], employees = [] } = snapshot;

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalCollected = projects.reduce((s, p) => s + (p.advance_payment || 0) + (p.partial_payments || 0), 0);
  const totalPending = projects.reduce((s, p) => s + (p.pending_payment || 0), 0);

  const today = new Date();
  const overdueProjects = projects.filter((p) => p.deadline && new Date(p.deadline) < today && p.status !== "Completed");
  const tasksByProject = (pid: string) => tasks.filter((t) => t.project_id === pid);
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== "done");

  const managerLoadMap: Record<string, number> = {};
  projects.forEach((p) => {
    if (p.manager_id) managerLoadMap[p.manager_id] = (managerLoadMap[p.manager_id] || 0) + 1;
  });

  const employeeTaskMap: Record<string, { total: number; done: number }> = {};
  tasks.forEach((t) => {
    if (t.assigned_to) {
      if (!employeeTaskMap[t.assigned_to]) employeeTaskMap[t.assigned_to] = { total: 0, done: 0 };
      employeeTaskMap[t.assigned_to].total++;
      if (t.status === "done") employeeTaskMap[t.assigned_to].done++;
    }
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const projectDetails = projects.map((p) => {
    const pts = tasksByProject(p.id);
    const doneTasks = pts.filter((t) => t.status === "done").length;
    const ipTasks = pts.filter((t) => t.status === "in_progress").length;
    const todoTasks = pts.filter((t) => t.status === "todo").length;
    const mgr = managers.find((m) => m.id === p.manager_id);
    const assignees = [...new Set(pts.map((t) => employees.find((e) => e.id === t.assigned_to)?.full_name).filter(Boolean))];
    return `  • "${p.name}" | Client: ${p.client_name || "—"} | Status: ${p.status} | Priority: ${p.priority}
    Manager: ${mgr?.full_name || "Unassigned"} | Budget: ${fmt(p.budget || 0)} | Collected: ${fmt((p.advance_payment || 0) + (p.partial_payments || 0))} | Pending: ${fmt(p.pending_payment || 0)}
    Tasks: ${pts.length} total (${doneTasks} done, ${ipTasks} in progress, ${todoTasks} to do)
    Employees: ${assignees.join(", ") || "None assigned"}
    Deadline: ${p.deadline || "No deadline"}${overdueProjects.some((op) => op.id === p.id) ? " ⚠️ OVERDUE" : ""}`;
  }).join("\n\n");

  const performanceAlerts = [];
  if (overdueProjects.length > 0)
    performanceAlerts.push(`🔴 Overdue projects: ${overdueProjects.map((p) => `"${p.name}"`).join(", ")}`);
  if (overdueTasks.length > 0)
    performanceAlerts.push(`🟡 Overdue tasks: ${overdueTasks.length} tasks past due date`);

  employees.forEach((emp) => {
    const empTasks = employeeTaskMap[emp.id];
    if (!empTasks || empTasks.total === 0)
      performanceAlerts.push(`⚪ ${emp.full_name} has no tasks assigned`);
    else if (empTasks.done === 0)
      performanceAlerts.push(`🔴 ${emp.full_name} has 0 tasks completed out of ${empTasks.total}`);
  });

  return `You are the Chief Executive AI advisor for "${companyName}".
You have full visibility into this company's projects, financials, team performance, and tasks.
CRITICAL RULE: Only answer questions using the data below. Do NOT reference or mix in data from any other company.
Be concise, strategic, and direct — like a top-tier CEO advisor.

═══ COMPANY: ${companyName.toUpperCase()} ═══

FINANCIALS:
  Total Budget:    ${fmt(totalBudget)}
  Collected:       ${fmt(totalCollected)}
  Pending:         ${fmt(totalPending)}
  Projects:        ${projects.length} total

TEAM:
  Managers (${managers.length}): ${managers.map((m) => m.full_name).join(", ") || "None"}
  Employees (${employees.length}): ${employees.map((e) => e.full_name).join(", ") || "None"}

PROJECT DETAILS:
${projectDetails || "  No projects created yet."}

PERFORMANCE FLAGS:
${performanceAlerts.length > 0 ? performanceAlerts.map((a) => `  ${a}`).join("\n") : "  ✅ All systems normal — no critical issues detected"}

═══════════════════════════════════════
Now answer the user's question as a strategic executive advisor. Format your response with clear sections using markdown. Keep it actionable and data-driven.`;
};

// ─── LLM API calls — all 11 providers ─────────────────────────
const OPENAI_COMPAT_BASES: Partial<Record<LLMProvider, string>> = {
  openai:     "https://api.openai.com/v1",
  groq:       "https://api.groq.com/openai/v1",
  mistral:    "https://api.mistral.ai/v1",
  deepseek:   "https://api.deepseek.com/v1",
  together:   "https://api.together.xyz/v1",
  openrouter: "https://openrouter.ai/api/v1",
  xai:        "https://api.x.ai/v1",
};

const callLLM = async (
  provider: LLMProvider, apiKey: string, model: string,
  messages: any[], customBaseUrl = ""
): Promise<string> => {
  // OpenAI-compatible providers
  if (provider in OPENAI_COMPAT_BASES || provider === "custom") {
    const base = provider === "custom"
      ? customBaseUrl.trim() || ""
      : OPENAI_COMPAT_BASES[provider as keyof typeof OPENAI_COMPAT_BASES]!;
    if (!base) throw new Error("Custom Base URL not configured. Set it in AI Settings.");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "Earney Projects";
    }
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.7 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `${provider} API error ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0]?.message?.content || "No response";
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m) => m.role !== "system");
    const contents = userMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  }

  if (provider === "claude") {
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model, max_tokens: 1500, system: systemMsg, messages: userMsgs }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "No response";
  }

  if (provider === "cohere") {
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const chatHistory = messages.filter((m) => m.role !== "system").slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "CHATBOT" : "USER",
      message: m.content,
    }));
    const lastUser = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const res = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, message: lastUser, preamble: systemMsg, chat_history: chatHistory, max_tokens: 1500 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Cohere API error ${res.status}`);
    }
    const data = await res.json();
    return data.text || "No response";
  }

  throw new Error(`Provider "${provider}" not supported.`);
};

// ─── Message type ────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant" | "error";
  content: string;
}

// ─── Main Component ──────────────────────────────────────────────
export default function AiChatbox() {
  const { activeCompany } = useCompany();
  const { isAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [activeModel, setActiveModel] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const providerConfig = LLM_PROVIDERS.find((p) => p.provider === provider)!;

  // Load primary provider + API key + saved model on company change
  useEffect(() => {
    if (!activeCompany) return;
    const loadKey = async () => {
      // Load primary provider preference
      const prim = await api.getCompanySetting(activeCompany.id, "ai_primary_provider");
      const activeProv = (prim as LLMProvider) || provider;
      if (prim && prim !== provider) setProvider(activeProv as LLMProvider);
      // Load key and model for the active provider
      const [key, model] = await Promise.all([
        api.getCompanySetting(activeCompany.id, `ai_key_${activeProv}`),
        api.getCompanySetting(activeCompany.id, `ai_model_${activeProv}`),
      ]);
      setApiKey(key || "");
      setApiKeySaved(!!key);
      if (model) setActiveModel(model);
      else {
        const def = LLM_PROVIDERS.find(p => p.provider === activeProv)?.defaultModel || "";
        setActiveModel(def);
      }
    };
    loadKey();
  }, [activeCompany?.id]);

  // Fetch snapshot when chatbox opens
  useEffect(() => {
    if (open && activeCompany && !snapshot) {
      setLoadingSnapshot(true);
      api.fetchCompanySnapshot(activeCompany.id)
        .then(setSnapshot)
        .finally(() => setLoadingSnapshot(false));
    }
    if (!activeCompany) setSnapshot(null);
  }, [open, activeCompany?.id]);

  // Refresh snapshot when company changes
  useEffect(() => {
    setSnapshot(null);
    setMessages([]);
  }, [activeCompany?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveApiKey = async () => {
    if (!activeCompany || !apiKey.trim()) return;
    const ok = await api.setCompanySetting(activeCompany.id, `ai_key_${provider}`, apiKey.trim());
    if (ok) setApiKeySaved(true);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }
    if (!snapshot) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(activeCompany!.name, snapshot);
      const history = messages
        .filter((m) => m.role !== "error")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: input.trim() },
      ];

    const text = await callLLM(provider, apiKey, activeModel || providerConfig.defaultModel, llmMessages, customBaseUrl);
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "error", content: err.message || "Failed to get response." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAdmin) return null;

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-gray-800 transition-all hover:scale-110"
        title="AI Executive Advisor"
      >
        <Bot className="h-6 w-6 sm:h-7 sm:w-7" />
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-500 rounded-full text-[10px] flex items-center justify-center font-bold shadow">AI</span>
      </button>
    );
  }

  return (
    <div className={`fixed z-50 flex flex-col bg-white shadow-2xl border border-gray-200 transition-all ${
      minimized
        ? "bottom-6 right-4 sm:right-6 w-72 h-14 rounded-2xl"
        : "inset-0 sm:inset-auto sm:bottom-6 sm:right-4 sm:w-96 sm:h-[600px] sm:rounded-2xl"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white flex-shrink-0 rounded-t-2xl sm:rounded-t-2xl">
        <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">AI Executive Advisor</p>
          {activeCompany && !minimized && (
            <p className="text-[10px] text-gray-300 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {activeCompany.name} · <span className="font-mono">{activeModel || providerConfig.defaultModel}</span>
            </p>
          )}
        </div>
        <button onClick={() => setMinimized(!minimized)} className="text-gray-300 hover:text-white">
          {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
        <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {minimized ? null : (
        <>
          {/* Provider + API key bar */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <Select value={provider} onValueChange={(v) => { setProvider(v as LLMProvider); setApiKeySaved(false); }}>
              <SelectTrigger className="h-7 text-xs flex-1 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((p) => (
                  <SelectItem key={p.provider} value={p.provider} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                apiKeySaved ? "border-green-300 text-green-600 bg-green-50" : "border-orange-300 text-orange-600 bg-orange-50"
              }`}
            >
              {apiKeySaved ? "✓ Key Set" : "Set Key"}
            </button>
          </div>

          {/* API key input (collapsible) */}
          {showKeyInput && (
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1.5">
                {providerConfig.label} API Key{" "}
                <a href={providerConfig.docsUrl} target="_blank" rel="noopener noreferrer"
                   className="text-blue-500 hover:underline">Get key ↗</a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setApiKeySaved(false); }}
                  placeholder={providerConfig.placeholder}
                  className="flex-1 text-xs px-2 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                />
                <Button size="sm" className="text-xs h-7 bg-black text-white" onClick={saveApiKey}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* No company selected */}
          {!activeCompany ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Building2 className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">No company selected</p>
              <p className="text-gray-400 text-xs mt-1">Select a company from the header to start</p>
            </div>
          ) : loadingSnapshot ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Loading company data…</p>
              </div>
            </div>
          ) : (
            <>
              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                  <div className="text-center pt-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Bot className="h-6 w-6 text-violet-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Hello, I'm your AI Executive Advisor</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Analyzing <strong>{activeCompany.name}</strong>'s data</p>
                    <div className="space-y-2 text-left">
                      {[
                        "How are our projects performing?",
                        "Which employees need attention?",
                        "What are the biggest financial risks?",
                        "Which manager is underperforming?",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "error" ? (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 max-w-[90%]">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{msg.content}</p>
                      </div>
                    ) : msg.role === "user" ? (
                      <div className="bg-black text-white rounded-xl rounded-br-sm px-3 py-2 max-w-[80%]">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]">
                        <div className="text-xs text-gray-700 prose prose-xs max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                {!apiKey.trim() && (
                  <div className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    Set your {providerConfig.label} API key above to start chatting
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about projects, team, financials…"
                    rows={2}
                    className="flex-1 text-sm resize-none border-gray-200 focus:ring-black"
                    disabled={loading || !apiKey.trim()}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim() || !apiKey.trim()}
                    className="h-10 w-10 bg-black text-white p-0 rounded-xl flex-shrink-0"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-300 mt-1.5 text-center">
                  Enter to send • Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
