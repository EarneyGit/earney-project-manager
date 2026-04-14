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

export type LLMProvider =
  | "openai"
  | "gemini"
  | "claude"
  | "mistral"
  | "groq"
  | "together"
  | "deepseek"
  | "cohere"
  | "openrouter"
  | "xai"
  | "custom";

export interface ModelOption {
  id: string;
  label: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  label: string;
  logo: string;           // emoji or text
  color: string;          // tailwind bg color class for the badge
  defaultModel: string;
  models: ModelOption[];
  placeholder: string;
  docsUrl: string;
  apiBase?: string;       // for display purposes
}

export const LLM_PROVIDERS: LLMConfig[] = [
  {
    provider: "gemini",
    label: "Google Gemini",
    logo: "✦",
    color: "bg-blue-500",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
      { id: "gemini-2.5-pro-preview-03-25", label: "Gemini 2.5 Pro Preview" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
    ],
    placeholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    provider: "openai",
    label: "OpenAI",
    logo: "⬡",
    color: "bg-emerald-600",
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { id: "gpt-4", label: "GPT-4" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      { id: "o1", label: "o1" },
      { id: "o1-mini", label: "o1-mini" },
      { id: "o3-mini", label: "o3-mini" },
    ],
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    provider: "claude",
    label: "Anthropic Claude",
    logo: "◈",
    color: "bg-orange-500",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { id: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    provider: "groq",
    label: "Groq",
    logo: "⚡",
    color: "bg-violet-600",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B Versatile" },
      { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
      { id: "llama3-70b-8192", label: "LLaMA 3 70B" },
    ],
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    logo: "🔮",
    color: "bg-indigo-600",
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek V3" },
      { id: "deepseek-reasoner", label: "DeepSeek R1 (Reasoner)" },
    ],
    placeholder: "sk-...",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    provider: "mistral",
    label: "Mistral AI",
    logo: "🌊",
    color: "bg-cyan-600",
    defaultModel: "mistral-large-latest",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "codestral-latest", label: "Codestral" },
      { id: "mistral-nemo", label: "Mistral Nemo" },
      { id: "open-mixtral-8x22b", label: "Mixtral 8x22B" },
    ],
    placeholder: "...",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  {
    provider: "together",
    label: "Together AI",
    logo: "🤝",
    color: "bg-pink-600",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
    models: [
      { id: "meta-llama/Llama-3-70b-chat-hf", label: "Llama 3 70B" },
      { id: "meta-llama/Llama-3-8b-chat-hf", label: "Llama 3 8B" },
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", label: "Mixtral 8x22B" },
      { id: "google/gemma-2-27b-it", label: "Gemma 2 27B" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen 2.5 72B" },
    ],
    placeholder: "...",
    docsUrl: "https://api.together.xyz/settings/api-keys",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    logo: "🔀",
    color: "bg-rose-600",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: [
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OR)" },
      { id: "openai/gpt-4o", label: "GPT-4o (via OR)" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (via OR)" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "LLaMA 3.3 70B (via OR)" },
      { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (via OR)" },
      { id: "mistralai/mistral-large", label: "Mistral Large (via OR)" },
    ],
    placeholder: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
  },
  {
    provider: "xai",
    label: "xAI Grok",
    logo: "𝕏",
    color: "bg-gray-900",
    defaultModel: "grok-2-latest",
    models: [
      { id: "grok-2-latest", label: "Grok 2" },
      { id: "grok-2-vision-latest", label: "Grok 2 Vision" },
      { id: "grok-beta", label: "Grok Beta" },
    ],
    placeholder: "xai-...",
    docsUrl: "https://console.x.ai/",
  },
  {
    provider: "cohere",
    label: "Cohere",
    logo: "◉",
    color: "bg-teal-600",
    defaultModel: "command-r-plus",
    models: [
      { id: "command-r-plus", label: "Command R+" },
      { id: "command-r", label: "Command R" },
      { id: "command", label: "Command" },
    ],
    placeholder: "...",
    docsUrl: "https://dashboard.cohere.com/api-keys",
  },
  {
    provider: "custom",
    label: "Custom / OpenAI-Compatible",
    logo: "⚙",
    color: "bg-gray-600",
    defaultModel: "",
    models: [],
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    apiBase: "https://your-api.example.com/v1",
  },
];
