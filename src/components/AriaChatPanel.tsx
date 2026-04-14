import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import * as api from "@/services/api";
import { Bot, Send, X, Minimize2, Maximize2, Loader2, AlertTriangle, Info, Star } from "lucide-react";

interface AriaMessage {
  id: string;
  sender_type: "aria" | "user";
  message: string;
  message_type: string;
  priority: string;
  requires_reply?: boolean;
  created_at: string;
}

const priorityStyle: Record<string, string> = {
  critical: "border-l-4 border-red-500 bg-red-50",
  high: "border-l-4 border-amber-500 bg-amber-50",
  medium: "border-l-4 border-indigo-400 bg-indigo-50",
  low: "border-l-4 border-emerald-400 bg-emerald-50",
};

const typeIcon: Record<string, React.ReactNode> = {
  delay_alert: <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />,
  task_alert: <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />,
  risk_alert: <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />,
  check_in: <Info className="h-3 w-3 text-indigo-500 flex-shrink-0" />,
  praise: <Star className="h-3 w-3 text-amber-400 flex-shrink-0" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MODEL_DEFAULTS: Record<string, string> = {
  gemini: "gemini-2.0-flash", openai: "gpt-4o", groq: "llama-3.3-70b-versatile",
  claude: "claude-3-5-sonnet-20241022", deepseek: "deepseek-chat", mistral: "mistral-large-latest",
};

export default function AriaChatPanel() {
  const { currentUser } = useAuth();
  const { activeCompany } = useCompany();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<AriaMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiCreds, setAiCreds] = useState<{ key: string; provider: string; model: string; base: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load AI credentials from company settings
  useEffect(() => {
    if (!activeCompany) return;
    api.getAllCompanySettings(activeCompany.id).then((settings: Record<string, string>) => {
      const primary = settings["ai_primary_provider"];
      const order = primary
        ? [primary, "gemini", "openai", "groq", "claude", "deepseek", "mistral"]
        : ["gemini", "openai", "groq", "claude", "deepseek", "mistral"];
      const seen = new Set<string>();
      for (const prov of order) {
        if (seen.has(prov)) continue;
        seen.add(prov);
        const key = settings[`ai_key_${prov}`];
        if (key) {
          setAiCreds({
            key,
            provider: prov,
            model: settings[`ai_model_${prov}`] || MODEL_DEFAULTS[prov] || "",
            base: settings[`ai_base_${prov}`] || "",
          });
          return;
        }
      }
    });
  }, [activeCompany?.id]);

  // Poll unread count every 30s
  useEffect(() => {
    if (!currentUser?.id || !activeCompany) return;
    const poll = async () => {
      const count = await api.fetchAriaUnreadCount(currentUser.id, activeCompany.id);
      setUnreadCount(count);
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, activeCompany?.id]);

  const loadMessages = useCallback(async () => {
    if (!currentUser?.id || !activeCompany) return;
    const msgs = await api.fetchAriaMessages(currentUser.id, activeCompany.id, 60);
    setMessages(msgs as AriaMessage[]);
  }, [currentUser?.id, activeCompany?.id]);

  useEffect(() => {
    if (open && !minimized) {
      setLoading(true);
      loadMessages().finally(() => setLoading(false));
      if (currentUser?.id && activeCompany) {
        api.markAriaMessagesRead(currentUser.id, activeCompany.id);
        setUnreadCount(0);
      }
    }
  }, [open, minimized]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !currentUser?.id || !activeCompany) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    const optimistic: AriaMessage = {
      id: `temp-${Date.now()}`, sender_type: "user", message: msg,
      message_type: "user_update", priority: "medium",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    await api.sendAriaUserReply({
      userId: currentUser.id,
      companyId: activeCompany.id,
      message: msg,
      userName: currentUser.name || "Team member",
      userRole: currentUser.role,
      aiKey: aiCreds?.key,
      aiProvider: aiCreds?.provider,
      aiModel: aiCreds?.model,
      customBaseUrl: aiCreds?.base,
    });

    await loadMessages();
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!currentUser) return null;

  const lastAriaMsg = [...messages].reverse().find((m) => m.sender_type === "aria");

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-20 z-40 w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-2xl flex items-center justify-center hover:bg-violet-700 transition-all hover:scale-110"
        title="ARIA — AI Work Assistant"
      >
        <Bot className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center px-1 shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="absolute -bottom-1.5 right-0 text-[8px] font-black bg-white text-violet-700 rounded-full px-1 leading-tight shadow">
          ARIA
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed z-40 flex flex-col bg-white shadow-2xl border border-gray-200 transition-all rounded-2xl ${
      minimized
        ? "bottom-20 sm:bottom-6 right-4 sm:right-20 w-72 h-14"
        : "inset-x-2 bottom-2 sm:inset-auto sm:bottom-6 sm:right-20 sm:w-96 sm:h-[580px]"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-700 text-white rounded-t-2xl flex-shrink-0">
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">ARIA</p>
          {!minimized && (
            <p className="text-[10px] text-violet-200">
              {lastAriaMsg ? `Last message ${timeAgo(lastAriaMsg.created_at)}` : "AI Work Assistant · Always here 👋"}
            </p>
          )}
        </div>
        <button onClick={() => setMinimized(!minimized)} className="text-violet-200 hover:text-white p-1">
          {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
        <button onClick={() => setOpen(false)} className="text-violet-200 hover:text-white p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {minimized ? null : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 bg-gray-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bot className="h-7 w-7 text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Hey {currentUser.name?.split(" ")[0]}! I'm ARIA 👋</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  I'm your AI work assistant. I'll check in every 2 hours (10AM–7PM) to keep you on track.
                  You can chat with me anytime here!
                </p>
              </div>
            ) : messages.map((msg) => {
              const isAria = msg.sender_type === "aria";
              return (
                <div key={msg.id} className={`flex ${isAria ? "justify-start" : "justify-end"}`}>
                  {isAria ? (
                    <div className={`max-w-[85%] rounded-xl rounded-tl-sm p-3 text-xs ${priorityStyle[msg.priority] || "bg-white border border-gray-200"}`}>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="font-bold text-violet-700 text-[10px]">ARIA</span>
                        {typeIcon[msg.message_type]}
                        {msg.priority === "high" && (
                          <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded font-bold">ALERT</span>
                        )}
                        {msg.priority === "critical" && (
                          <span className="text-[9px] bg-red-200 text-red-800 px-1 rounded font-bold">URGENT</span>
                        )}
                        <span className="text-[9px] text-gray-400 ml-auto">{timeAgo(msg.created_at)}</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{msg.message}</p>
                      {msg.requires_reply && (
                        <p className="text-[9px] text-violet-500 mt-1.5 font-medium">💬 Reply to update your status</p>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-[85%] bg-violet-600 text-white rounded-xl rounded-tr-sm px-3 py-2 text-xs">
                      <p className="leading-relaxed">{msg.message}</p>
                      <p className="text-[9px] text-violet-200 mt-0.5 text-right">{timeAgo(msg.created_at)}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to ARIA or share your work status…"
                rows={2}
                className="flex-1 text-xs resize-none border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 transition-all flex-shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[9px] text-gray-300 mt-1.5 text-center">
              Enter to send · ARIA checks in every 2hrs · Mon–Sat 10AM–7PM IST
            </p>
          </div>
        </>
      )}
    </div>
  );
}
