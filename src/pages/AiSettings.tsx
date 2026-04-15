import React, { useState, useEffect, useCallback } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { LLM_PROVIDERS, LLMProvider } from "@/types/company";
import * as api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  KeyRound, Eye, EyeOff, Trash2, CheckCircle2, ExternalLink,
  Settings2, Building2, Loader2, Star, Zap, TestTube2, X,
} from "lucide-react";

interface ProviderState {
  apiKey: string;
  model: string;
  customModel: string;      // freeform override
  customBaseUrl: string;    // for "custom" provider
  saved: boolean;
  loading: boolean;
  showKey: boolean;
  testResult: "idle" | "testing" | "ok" | "fail";
  testMsg: string;
}

const defaultState = (defaultModel: string): ProviderState => ({
  apiKey: "", model: defaultModel, customModel: "", customBaseUrl: "",
  saved: false, loading: true, showKey: false,
  testResult: "idle", testMsg: "",
});

export default function AiSettings() {
  const { activeCompany, companies, setActiveCompany } = useCompany();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [states, setStates] = useState<Record<LLMProvider, ProviderState>>(
    () => Object.fromEntries(LLM_PROVIDERS.map((p) => [p.provider, defaultState(p.defaultModel)])) as any
  );
  const [primaryProvider, setPrimaryProvider] = useState<LLMProvider | "">("");

  // Load all saved keys & models for active company
  const loadSettings = useCallback(async () => {
    if (!activeCompany) return;
    for (const p of LLM_PROVIDERS) {
      const [keyVal, modelVal, baseUrl] = await Promise.all([
        api.getCompanySetting(activeCompany.id, `ai_key_${p.provider}`),
        api.getCompanySetting(activeCompany.id, `ai_model_${p.provider}`),
        api.getCompanySetting(activeCompany.id, `ai_base_${p.provider}`),
      ]);
      setStates((prev) => ({
        ...prev,
        [p.provider]: {
          ...prev[p.provider],
          apiKey: keyVal || "",
          model: modelVal || p.defaultModel,
          customModel: modelVal && !p.models.find((m) => m.id === modelVal) ? modelVal : "",
          customBaseUrl: baseUrl || "",
          saved: !!keyVal,
          loading: false,
        },
      }));
    }
    const prim = await api.getCompanySetting(activeCompany.id, "ai_primary_provider");
    if (prim) setPrimaryProvider(prim as LLMProvider);
  }, [activeCompany?.id]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access restricted to admins.</p>
      </div>
    );
  }

  const updateState = (provider: LLMProvider, patch: Partial<ProviderState>) =>
    setStates((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));

  const effectiveModel = (provider: LLMProvider) => {
    const s = states[provider];
    return s.customModel.trim() || s.model;
  };

  const handleSave = async (provider: LLMProvider) => {
    if (!activeCompany) return;
    const s = states[provider];
    const key = s.apiKey.trim();
    if (!key) return;
    updateState(provider, { loading: true });

    const model = effectiveModel(provider);
    const [k1, k2, k3] = await Promise.all([
      api.setCompanySetting(activeCompany.id, `ai_key_${provider}`, key),
      api.setCompanySetting(activeCompany.id, `ai_model_${provider}`, model),
      provider === "custom" && s.customBaseUrl.trim()
        ? api.setCompanySetting(activeCompany.id, `ai_base_${provider}`, s.customBaseUrl.trim())
        : Promise.resolve(true),
    ]);

    const ok = k1 && k2 && k3;
    updateState(provider, { loading: false, saved: ok });
    const label = LLM_PROVIDERS.find((p) => p.provider === provider)!.label;
    if (ok) toast({ title: "✅ Saved", description: `${label} key & model saved for ${activeCompany.name}` });
    else toast({ variant: "destructive", title: "Failed to save" });
  };

  const handleDelete = async (provider: LLMProvider) => {
    if (!activeCompany) return;
    updateState(provider, { loading: true });
    await Promise.all([
      api.deleteCompanySetting(activeCompany.id, `ai_key_${provider}`),
      api.deleteCompanySetting(activeCompany.id, `ai_model_${provider}`),
      api.deleteCompanySetting(activeCompany.id, `ai_base_${provider}`),
    ]);
    const defaultModel = LLM_PROVIDERS.find((p) => p.provider === provider)!.defaultModel;
    updateState(provider, {
      apiKey: "", model: defaultModel, customModel: "",
      saved: false, loading: false, testResult: "idle", testMsg: "",
    });
    if (primaryProvider === provider) {
      setPrimaryProvider("");
      await api.deleteCompanySetting(activeCompany.id, "ai_primary_provider");
    }
    toast({ title: "API key removed" });
  };

  const handleSetPrimary = async (provider: LLMProvider) => {
    if (!activeCompany) return;
    setPrimaryProvider(provider);
    await api.setCompanySetting(activeCompany.id, "ai_primary_provider", provider);
    toast({ title: "Primary AI set", description: `${LLM_PROVIDERS.find(p => p.provider === provider)!.label} is now used first for all AI features.` });
  };

  // Live connection test
  const handleTest = async (provider: LLMProvider) => {
    const s = states[provider];
    const key = s.apiKey.trim() || (await api.getCompanySetting(activeCompany!.id, `ai_key_${provider}`));
    if (!key) { updateState(provider, { testResult: "fail", testMsg: "No API key found. Save key first." }); return; }
    const model = effectiveModel(provider);
    updateState(provider, { testResult: "testing", testMsg: "" });

    try {
      const prompt = "Say 'OK' in exactly one word.";
      let text = "";

      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        const d = await res.json();
        if (d.error) throw new Error(d.error.message);
        text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (provider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: "user", content: prompt }] }),
        });
        const d = await res.json();
        if (d.error) throw new Error(d.error.message);
        text = d.content?.[0]?.text || "";
      } else if (provider === "cohere") {
        const res = await fetch("https://api.cohere.ai/v1/generate", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, max_tokens: 10, prompt }),
        });
        const d = await res.json();
        if (d.message) throw new Error(d.message);
        text = d.generations?.[0]?.text || "";
      } else {
        // OpenAI-compatible (OpenAI, Groq, Mistral, DeepSeek, Together, OpenRouter, xAI, Custom)
        const baseUrls: Record<string, string> = {
          openai: "https://api.openai.com/v1",
          groq: "https://api.groq.com/openai/v1",
          mistral: "https://api.mistral.ai/v1",
          deepseek: "https://api.deepseek.com/v1",
          together: "https://api.together.xyz/v1",
          openrouter: "https://openrouter.ai/api/v1",
          xai: "https://api.x.ai/v1",
          custom: s.customBaseUrl.trim() || "",
        };
        const base = baseUrls[provider] || "";
        if (!base) throw new Error("Custom Base URL required for custom provider.");

        // OpenRouter requires HTTP-Referer + X-Title headers
        const extraHeaders: Record<string, string> = provider === "openrouter"
          ? {
              "HTTP-Referer": "https://earney-project-manager.vercel.app",
              "X-Title": "Earney Projects Manager",
            }
          : {};

        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            ...extraHeaders,
          },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 10 }),
        });
        const d = await res.json();
        if (d.error) throw new Error(typeof d.error === "string" ? d.error : d.error?.message || JSON.stringify(d.error));
        text = d.choices?.[0]?.message?.content || "";
      }

      updateState(provider, { testResult: "ok", testMsg: `✅ Connected! Model responded: "${text.trim()}"` });
    } catch (e: any) {
      updateState(provider, { testResult: "fail", testMsg: `❌ ${e.message || "Connection failed"}` });
    }
  };

  const configuredCount = LLM_PROVIDERS.filter((p) => states[p.provider].saved).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Model Settings</h1>
              <p className="text-gray-500 text-sm">Configure API keys for any AI platform — paste your key, pick a model, go.</p>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${configuredCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              <KeyRound className="h-3.5 w-3.5" />
              {configuredCount} of {LLM_PROVIDERS.length} providers configured
            </div>
            {primaryProvider && (
              <div className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                Primary: {LLM_PROVIDERS.find(p => p.provider === primaryProvider)?.label}
              </div>
            )}
          </div>
        </div>

        {/* Company banner */}
        {!activeCompany ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <Building2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 text-sm">No company selected</p>
              <p className="text-amber-600 text-xs">Select a company to manage its AI keys.</p>
            </div>
            {companies.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setActiveCompany(companies[0])}>
                Select {companies[0].name}
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 mb-6">
            <Building2 className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-600 flex-1">
              Keys stored for: <strong>{activeCompany.name}</strong>
            </p>
            <Badge variant="outline" className="text-xs">Active Company</Badge>
          </div>
        )}

        {/* Info box */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 text-sm text-indigo-700">
          <p className="font-semibold mb-1 flex items-center gap-2"><Zap className="h-4 w-4" /> How it works</p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Paste your API key, select a model (or type a custom one), then click <strong>Save</strong>.
            Use <strong>Test Connection</strong> to verify it works instantly.
            Set one provider as <strong>Primary</strong> — that's what all AI features (team tips, scaling advice, chatbox) use first.
            Keys are stored securely in your company's settings — never shared.
          </p>
        </div>

        {/* Provider cards */}
        <div className="space-y-3">
          {LLM_PROVIDERS.map((providerCfg) => {
            const s = states[providerCfg.provider];
            const isPrimary = primaryProvider === providerCfg.provider;
            const isCustom = providerCfg.provider === "custom";
            const activeModel = effectiveModel(providerCfg.provider);

            return (
              <Card key={providerCfg.provider}
                className={`border-2 transition-all ${isPrimary ? "border-amber-300 shadow-md shadow-amber-100" : s.saved ? "border-emerald-200" : "border-gray-100"}`}>
                <CardContent className="p-4">
                  {/* Row 1: Provider header */}
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${providerCfg.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-base leading-none">{providerCfg.logo}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{providerCfg.label}</p>
                          {isPrimary && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-1 h-5">
                              <Star className="h-2.5 w-2.5 fill-amber-500" /> Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">Model: <span className="font-mono">{activeModel || "—"}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : s.saved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 text-[10px]">Not set</Badge>
                      )}
                      <a href={providerCfg.docsUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                        Get API key <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Row 2: API Key input */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={s.showKey ? "text" : "password"}
                          value={s.apiKey}
                          onChange={(e) => updateState(providerCfg.provider, { apiKey: e.target.value, saved: false, testResult: "idle" })}
                          placeholder={s.saved ? "••••••••••••••••••••••" : providerCfg.placeholder}
                          className="pr-10 font-mono text-xs h-9"
                          disabled={!activeCompany}
                        />
                        <button type="button" onClick={() => updateState(providerCfg.provider, { showKey: !s.showKey })}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {s.showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <Button onClick={() => handleSave(providerCfg.provider)}
                        disabled={!s.apiKey.trim() || !activeCompany || s.loading}
                        className="bg-gray-900 text-white hover:bg-gray-800 h-9 px-3 text-xs">
                        {s.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                      {s.saved && (
                        <Button onClick={() => handleDelete(providerCfg.provider)} variant="outline" size="sm"
                          className="h-9 px-2.5 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50" disabled={s.loading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Model selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {!isCustom && providerCfg.models.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600">Model</Label>
                        <Select
                          value={s.model}
                          onValueChange={(v) => updateState(providerCfg.provider, { model: v, customModel: "", saved: false })}
                          disabled={!activeCompany}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {providerCfg.models.map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-xs font-mono">
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Custom model override (always shown) */}
                    <div>
                      <Label className="text-xs text-gray-600">
                        {isCustom ? "Model ID" : "Custom model override"}{" "}
                        <span className="text-gray-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        value={s.customModel}
                        onChange={(e) => updateState(providerCfg.provider, { customModel: e.target.value, saved: false })}
                        placeholder={isCustom ? "e.g. my-model-v1" : `e.g. ${providerCfg.defaultModel}`}
                        className="h-8 text-xs font-mono mt-1"
                        disabled={!activeCompany}
                      />
                    </div>

                    {/* Custom Base URL (only for custom provider) */}
                    {isCustom && (
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-gray-600">Base URL (OpenAI-compatible endpoint)</Label>
                        <Input
                          value={s.customBaseUrl}
                          onChange={(e) => updateState(providerCfg.provider, { customBaseUrl: e.target.value, saved: false })}
                          placeholder="https://your-api.example.com/v1"
                          className="h-8 text-xs font-mono mt-1"
                          disabled={!activeCompany}
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 4: Action buttons */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Button
                      onClick={() => handleTest(providerCfg.provider)}
                      disabled={!activeCompany || s.testResult === "testing"}
                      variant="outline" size="sm"
                      className="h-7 text-xs gap-1.5 border-gray-200">
                      {s.testResult === "testing"
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Testing…</>
                        : <><TestTube2 className="h-3 w-3" /> Test Connection</>}
                    </Button>

                    {s.saved && !isPrimary && (
                      <Button onClick={() => handleSetPrimary(providerCfg.provider)} variant="outline" size="sm"
                        className="h-7 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Star className="h-3 w-3" /> Set as Primary
                      </Button>
                    )}

                    {s.testResult === "ok" && (
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {s.testMsg}
                      </span>
                    )}
                    {s.testResult === "fail" && (
                      <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                        <X className="h-3 w-3 flex-shrink-0" /> {s.testMsg}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security note */}
        <div className="mt-6 p-4 bg-gray-100 rounded-2xl text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">🔒 Security</p>
          Keys are stored per-company in Supabase, accessible only to admin accounts via Row-Level Security.
          They are never logged or sent anywhere except directly to the respective AI provider's API when you trigger an AI feature.
          Each company has its own isolated keys — switching the active company uses that company's keys.
        </div>
      </div>
    </div>
  );
}
