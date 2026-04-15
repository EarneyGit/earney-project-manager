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
    defaultModel: "nvidia/llama-3.3-nemotron-super-49b-v1:free",
    models: [
      // ── FREE MODELS (no cost) ─────────────────────────────────
      // NVIDIA
      { id: "nvidia/llama-3.3-nemotron-super-49b-v1:free",   label: "⭐ NVIDIA Nemotron 3 Super 49B (FREE) ← Default" },
      { id: "nvidia/llama-3.1-nemotron-nano-8b-v1:free",     label: "⭐ NVIDIA Nemotron Nano 8B (FREE)" },
      { id: "nvidia/llama-3.1-nemotron-70b-instruct:free",   label: "⭐ NVIDIA Nemotron 70B (FREE)" },
      // Meta LLaMA
      { id: "meta-llama/llama-3.3-70b-instruct:free",        label: "⭐ LLaMA 3.3 70B Instruct (FREE)" },
      { id: "meta-llama/llama-3.1-8b-instruct:free",         label: "⭐ LLaMA 3.1 8B Instruct (FREE)" },
      { id: "meta-llama/llama-3.2-3b-instruct:free",         label: "⭐ LLaMA 3.2 3B Instruct (FREE)" },
      { id: "meta-llama/llama-3.2-1b-instruct:free",         label: "⭐ LLaMA 3.2 1B Instruct (FREE)" },
      { id: "meta-llama/llama-3.2-11b-vision-instruct:free", label: "⭐ LLaMA 3.2 11B Vision (FREE)" },
      { id: "meta-llama/llama-4-scout:free",                 label: "⭐ LLaMA 4 Scout (FREE)" },
      { id: "meta-llama/llama-4-maverick:free",              label: "⭐ LLaMA 4 Maverick (FREE)" },
      // Google
      { id: "google/gemma-3-27b-it:free",                    label: "⭐ Gemma 3 27B (FREE)" },
      { id: "google/gemma-3-12b-it:free",                    label: "⭐ Gemma 3 12B (FREE)" },
      { id: "google/gemma-3-4b-it:free",                     label: "⭐ Gemma 3 4B (FREE)" },
      { id: "google/gemma-3-1b-it:free",                     label: "⭐ Gemma 3 1B (FREE)" },
      { id: "google/gemma-2-9b-it:free",                     label: "⭐ Gemma 2 9B (FREE)" },
      { id: "google/learnlm-1.5-pro-experimental:free",      label: "⭐ Google LearnLM 1.5 Pro (FREE)" },
      { id: "google/gemini-2.0-flash-exp:free",              label: "⭐ Gemini 2.0 Flash Exp (FREE)" },
      { id: "google/gemini-2.5-pro-exp-03-25:free",          label: "⭐ Gemini 2.5 Pro Exp (FREE)" },
      // Mistral / Mixtral
      { id: "mistralai/mistral-7b-instruct:free",            label: "⭐ Mistral 7B Instruct (FREE)" },
      { id: "mistralai/mixtral-8x7b-instruct:free",          label: "⭐ Mixtral 8x7B Instruct (FREE)" },
      // Qwen (Alibaba)
      { id: "qwen/qwen2.5-vl-72b-instruct:free",             label: "⭐ Qwen 2.5 VL 72B (FREE)" },
      { id: "qwen/qwen2.5-vl-32b-instruct:free",             label: "⭐ Qwen 2.5 VL 32B (FREE)" },
      { id: "qwen/qwen2.5-72b-instruct:free",                label: "⭐ Qwen 2.5 72B (FREE)" },
      { id: "qwen/qwen2.5-7b-instruct:free",                 label: "⭐ Qwen 2.5 7B (FREE)" },
      { id: "qwen/qwq-32b:free",                             label: "⭐ Qwen QwQ 32B Reasoning (FREE)" },
      { id: "qwen/qwen3-8b:free",                            label: "⭐ Qwen 3 8B (FREE)" },
      { id: "qwen/qwen3-14b:free",                           label: "⭐ Qwen 3 14B (FREE)" },
      { id: "qwen/qwen3-32b:free",                           label: "⭐ Qwen 3 32B (FREE)" },
      // DeepSeek
      { id: "deepseek/deepseek-r1:free",                     label: "⭐ DeepSeek R1 (FREE)" },
      { id: "deepseek/deepseek-v3-base:free",                label: "⭐ DeepSeek V3 Base (FREE)" },
      { id: "deepseek/deepseek-chat:free",                   label: "⭐ DeepSeek Chat V3 (FREE)" },
      { id: "deepseek/deepseek-r1-distill-llama-70b:free",   label: "⭐ DeepSeek R1 Distill LLaMA 70B (FREE)" },
      { id: "deepseek/deepseek-r1-distill-qwen-32b:free",    label: "⭐ DeepSeek R1 Distill Qwen 32B (FREE)" },
      // Microsoft
      { id: "microsoft/phi-4-multimodal-instruct:free",      label: "⭐ Microsoft Phi-4 Multimodal (FREE)" },
      { id: "microsoft/phi-4:free",                          label: "⭐ Microsoft Phi-4 (FREE)" },
      { id: "microsoft/phi-3-medium-128k-instruct:free",     label: "⭐ Microsoft Phi-3 Medium (FREE)" },
      { id: "microsoft/phi-3-mini-128k-instruct:free",       label: "⭐ Microsoft Phi-3 Mini (FREE)" },
      // Others (free)
      { id: "thudm/glm-4-9b-chat:free",                      label: "⭐ THUDM GLM-4 9B (FREE)" },
      { id: "openchat/openchat-7b:free",                     label: "⭐ OpenChat 3.5 7B (FREE)" },
      { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "⭐ Mistral Small 3.1 24B (FREE)" },
      { id: "bytedance-research/ui-tars-72b:free",           label: "⭐ ByteDance UI-TARS 72B (FREE)" },
      { id: "featherless/qwerky-72b:free",                   label: "⭐ Qwerky 72B (FREE)" },
      { id: "moonshotai/moonlight-16a-a3b-instruct:free",    label: "⭐ Moonshot Moonlight 16A (FREE)" },
      { id: "sarvamai/sarvam-m:free",                        label: "⭐ Sarvam M (FREE)" },
      { id: "shisa-ai/shisa-v2-llama3.3-70b:free",           label: "⭐ Shisa V2 LLaMA 70B (FREE)" },
      // ── PAID MODELS (per token) ───────────────────────────────
      { id: "anthropic/claude-3.5-sonnet",          label: "Claude 3.5 Sonnet" },
      { id: "anthropic/claude-3.7-sonnet",          label: "Claude 3.7 Sonnet" },
      { id: "anthropic/claude-3-opus",              label: "Claude 3 Opus" },
      { id: "openai/gpt-4o",                        label: "GPT-4o" },
      { id: "openai/gpt-4o-mini",                   label: "GPT-4o Mini" },
      { id: "openai/o3-mini",                       label: "o3-mini" },
      { id: "openai/o4-mini",                       label: "o4-mini" },
      { id: "google/gemini-2.0-flash-001",          label: "Gemini 2.0 Flash" },
      { id: "google/gemini-2.5-pro-preview-03-25",  label: "Gemini 2.5 Pro Preview" },
      { id: "meta-llama/llama-3.3-70b-instruct",    label: "LLaMA 3.3 70B" },
      { id: "deepseek/deepseek-r1",                 label: "DeepSeek R1 (Full)" },
      { id: "mistralai/mistral-large",              label: "Mistral Large" },
      { id: "x-ai/grok-3-mini-beta",                label: "Grok 3 Mini" },
      { id: "x-ai/grok-3-beta",                     label: "Grok 3" },
      { id: "perplexity/sonar-pro",                 label: "Perplexity Sonar Pro" },
    ],
    placeholder: "sk-or-v1-...",
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
