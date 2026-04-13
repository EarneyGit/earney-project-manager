export interface Company {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanySetting {
  id: string;
  companyId: string;
  settingKey: string;
  settingValue: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LLMProvider = "openai" | "gemini" | "claude" | "mistral";

export interface LLMConfig {
  provider: LLMProvider;
  label: string;
  model: string;
  placeholder: string;
  docsUrl: string;
}

export const LLM_PROVIDERS: LLMConfig[] = [
  {
    provider: "openai",
    label: "OpenAI GPT-4o",
    model: "gpt-4o",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    provider: "gemini",
    label: "Google Gemini 2.0 Flash",
    model: "gemini-2.0-flash",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    provider: "claude",
    label: "Anthropic Claude 3.5",
    model: "claude-3-5-sonnet-20241022",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    provider: "mistral",
    label: "Mistral Large",
    model: "mistral-large-latest",
    placeholder: "...",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
];
