/** Keep in sync with siteScope.ts BUILTIN_PRESET_HOSTS */
const BUILTIN_PRESET_HOSTS = [
  "chatgpt.com",
  "openai.com",
  "gemini.google.com",
  "ogs.google.com",
  "bard.google.com",
  "notebooklm.google.com",
  "aistudio.google.com",
  "claude.ai",
  "anthropic.com",
  "copilot.microsoft.com",
  "perplexity.ai",
  "deepseek.com",
  "chat.deepseek.com",
  "x.com",
  "twitter.com",
  "x.ai",
  "grok.com",
  "grok.x.com",
  "chat.qwen.ai",
  "qwenlm.ai",
  "meta.ai",
];

export function presetHostMatchPatterns() {
  const patterns = new Set();
  for (const host of BUILTIN_PRESET_HOSTS) {
    patterns.add(`*://${host}/*`);
    patterns.add(`*://*.${host}/*`);
  }
  return [...patterns];
}
