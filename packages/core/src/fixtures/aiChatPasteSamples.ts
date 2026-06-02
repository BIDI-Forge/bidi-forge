/**
 * Representative paste payloads from AI chat UIs (markdown + mixed RTL/LTR).
 * Golden tests ensure fixMixedText stays idempotent and preserves visible text.
 */
export const AI_CHAT_PASTE_SAMPLES: { name: string; text: string }[] = [
  {
    name: "chatgpt-code-fence-rtl",
    text: "خلاصه:\n\n```ts\nconst x = 1;\n```\n\nاین کد در `main.ts` اجرا می‌شود.",
  },
  {
    name: "claude-mixed-bullet",
    text: "• نکته: use `npm install` then run **Hello** سلام",
  },
  {
    name: "copilot-url-rtl",
    text: "مستندات: https://docs.example.com/v1/api برای شروع کافی است.",
  },
  {
    name: "gemini-email-rtl",
    text: "پشتیبانی: support@example.com — تا فردا پاسخ می‌دهیم.",
  },
  {
    name: "english-first-then-persian",
    text: "Here is the plan:\n1. Deploy to prod\n2. بررسی لاگ‌ها",
  },
  {
    name: "emoji-list-persian",
    text: "😀 نتیجه:\n- سلام hello\n- دنیا world",
  },
];
