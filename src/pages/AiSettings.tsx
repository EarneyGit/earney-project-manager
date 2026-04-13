import React, { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { LLM_PROVIDERS, LLMProvider } from "@/types/company";
import * as api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound, Eye, EyeOff, Trash2, CheckCircle2, ExternalLink, Settings2, Building2, Loader2,
} from "lucide-react";

interface KeyState {
  value: string;
  saved: boolean;
  loading: boolean;
  show: boolean;
}

export default function AiSettings() {
  const { activeCompany, companies, setActiveCompany } = useCompany();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [keys, setKeys] = useState<Record<LLMProvider, KeyState>>(
    () => Object.fromEntries(
      LLM_PROVIDERS.map((p) => [p.provider, { value: "", saved: false, loading: true, show: false }])
    ) as any
  );

  // Load saved keys for active company
  useEffect(() => {
    if (!activeCompany) return;
    LLM_PROVIDERS.forEach(async ({ provider }) => {
      const val = await api.getCompanySetting(activeCompany.id, `ai_key_${provider}`);
      setKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], value: val || "", saved: !!val, loading: false },
      }));
    });
  }, [activeCompany?.id]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access restricted to admins.</p>
      </div>
    );
  }

  const handleSave = async (provider: LLMProvider) => {
    if (!activeCompany) return;
    const val = keys[provider].value.trim();
    if (!val) return;

    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], loading: true } }));
    const ok = await api.setCompanySetting(activeCompany.id, `ai_key_${provider}`, val);
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], loading: false, saved: ok } }));

    if (ok) toast({ title: "API key saved", description: `${LLM_PROVIDERS.find(p => p.provider === provider)!.label} key saved for ${activeCompany.name}` });
    else toast({ variant: "destructive", title: "Failed to save key" });
  };

  const handleDelete = async (provider: LLMProvider) => {
    if (!activeCompany) return;
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], loading: true } }));
    await api.deleteCompanySetting(activeCompany.id, `ai_key_${provider}`);
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], value: "", saved: false, loading: false } }));
    toast({ title: "API key removed" });
  };

  const toggleShow = (provider: LLMProvider) => {
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], show: !prev[provider].show } }));
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings2 className="h-8 w-8" />
          AI Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Configure LLM API keys to power the AI Executive Advisor. Keys are stored securely per company.
        </p>
      </div>

      {/* Company selector */}
      {!activeCompany ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-700 text-sm">No company selected</p>
            <p className="text-orange-600 text-xs">Select a company to manage its AI keys.</p>
          </div>
          {companies.length > 0 && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setActiveCompany(companies[0])}>
              Select {companies[0].name}
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 mb-6">
          <Building2 className="h-4 w-4 text-gray-500" />
          <p className="text-sm text-gray-600">
            Managing keys for: <strong>{activeCompany.name}</strong>
          </p>
          <Badge variant="outline" className="ml-auto text-xs">Active Company</Badge>
        </div>
      )}

      {/* Provider cards */}
      <div className="space-y-4">
        {LLM_PROVIDERS.map(({ provider, label, placeholder, docsUrl }) => {
          const keyState = keys[provider];
          return (
            <Card key={provider} className={`border-2 transition-all ${keyState.saved ? "border-green-200" : "border-transparent"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    {label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {keyState.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : keyState.saved ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">Not set</Badge>
                    )}
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                      Get key <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={keyState.show ? "text" : "password"}
                      value={keyState.value}
                      onChange={(e) =>
                        setKeys((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], value: e.target.value, saved: false },
                        }))
                      }
                      placeholder={keyState.saved ? "••••••••••••••••••••••" : placeholder}
                      className="pr-10 font-mono text-sm"
                      disabled={!activeCompany}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(provider)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {keyState.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(provider)}
                    disabled={!keyState.value.trim() || !activeCompany || keyState.loading}
                    className="bg-black text-white hover:bg-gray-800"
                    size="sm"
                  >
                    {keyState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                  {keyState.saved && (
                    <Button
                      onClick={() => handleDelete(provider)}
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700 border-red-200"
                      disabled={keyState.loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <p className="font-medium mb-1">🔒 About API Key Security</p>
        <p className="text-xs text-blue-600">
          API keys are stored in your Supabase database under your company settings, accessible only to admin accounts.
          Keys are never sent to any third party except the respective AI provider when you send a message.
          Each company has its own isolated keys — switching companies uses that company's configured keys.
        </p>
      </div>
    </div>
  );
}
