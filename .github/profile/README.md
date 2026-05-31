<div align="center">

<!-- Animated gradient banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d9488,50:0891b2,100:6366f1&height=200&section=header&text=BIDI%20%E2%80%A2%20Forge&fontSize=52&fontColor=ffffff&animation=twinkling&fontAlignY=40&desc=Intelligent%20bidirectional%20text%20for%20RTL%20%2B%20LTR%20worlds&descAlignY=62&descAlign=50" width="100%" alt="BIDI · Forge banner" />

<br />

<!-- Logo ring -->
<svg width="96" height="96" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bf-ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6">
        <animate attributeName="stop-color" values="#14b8a6;#6366f1;#14b8a6" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#6366f1">
        <animate attributeName="stop-color" values="#6366f1;#14b8a6;#6366f1" dur="4s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="84" height="84" rx="22" fill="#0f172a" stroke="url(#bf-ring)" stroke-width="3">
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="14s" repeatCount="indefinite"/>
  </rect>
  <text x="60" y="72" text-anchor="middle" font-family="ui-monospace,monospace" font-size="32" font-weight="700" fill="url(#bf-ring)">BF</text>
</svg>

<br /><br />

<!-- Single-line typing — avoids multiline overlap on GitHub -->
<img
  src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3000&pause=1000&color=14B8A6&center=true&vCenter=true&width=640&height=36&lines=Fix+mixed+Persian+%E2%80%A2+Arabic+%E2%80%A2+English+in+AI+chats"
  alt="Fix mixed Persian, Arabic and English in AI chats"
/>

<br />

<img
  src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=16&duration=3200&pause=1200&color=94A3B8&center=true&vCenter=true&width=640&height=28&lines=Claude-first+%E2%80%A2+Unicode+BiDi+%E2%80%A2+Local+only+%E2%80%A2+MIT+open+source"
  alt="Claude-first, Unicode BiDi, local only, MIT"
/>

<br /><br /><br />

[![License: MIT](https://img.shields.io/badge/License-MIT-14b8a6?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-BIDI%20-%20Forge-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc)
[![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)

<br />

[![GitHub Org](https://img.shields.io/badge/Org-BIDI--Forge-6366f1?style=flat-square&logo=github)](https://github.com/BIDI-Forge)
[![Repo](https://img.shields.io/badge/Repo-bidi--forge-0d9488?style=flat-square&logo=github)](https://github.com/BIDI-Forge/bidi-forge)
[![Stars](https://img.shields.io/github/stars/BIDI-Forge/bidi-forge?style=flat-square&logo=github&label=stars&color=14b8a6)](https://github.com/BIDI-Forge/bidi-forge/stargazers)

</div>

---

## ✦ The problem we solve

When **RTL** scripts (Persian, Arabic) meet **LTR** text (English, URLs, code) in the same line, renderers often scramble word order — especially in **AI chat composers** and streaming replies.

**BIDI · Forge** inserts invisible Unicode BiDi markers so mixed text reads naturally:

```diff
- Input:  سلام hello دنیا
+ Output: سلام ‎hello‎ دنیا
```

> Local-only · No telemetry · Works in the browser & editor · Built for real bilingual workflows

---

## ✦ Products

<table>
<tr>
<td width="50%" valign="top">

### 🌐 Chrome Extension
**BIDI - Forge** · MV3

- Claude-first AI chat presets
- ChatGPT · Gemini · Grok · Qwen
- CSS-only composers where needed
- Lightweight scope · sync settings

<br />

[![Chrome](https://img.shields.io/badge/Get%20Extension-Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc)

</td>
<td width="50%" valign="top">

### 💻 VS Code
**RTL Text Fixer**

- Fix selection or clipboard
- BiDi-safe notifications & settings UI
- Status bar · scoped RTL workbench CSS
- Powered by shared core engine

<br />

[![VS Code](https://img.shields.io/badge/Install-VSIX-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://github.com/BIDI-Forge/bidi-forge/tree/main/packages/vscode-extension)

</td>
</tr>
</table>

---

## ✦ Supported AI surfaces

<div align="center">

<!-- Active platforms -->
<table>
<tr>
<td align="center" width="20%">
<br/>
<img src="https://img.shields.io/badge/Claude.ai-Primary%20Focus-D97757?style=for-the-badge&labelColor=1a1a2e" alt="Claude"/>
<br/><br/>
<sub><b>🟢 Live</b><br/>ProseMirror composer<br/>+ streaming replies</sub>
<br/><br/>
</td>
<td align="center" width="20%">
<br/>
<img src="https://img.shields.io/badge/ChatGPT-Active-10A37F?style=for-the-badge&labelColor=1a1a2e" alt="ChatGPT"/>
<br/><br/>
<sub><b>🟢 Live</b><br/>Composer +<br/>assistant bubbles</sub>
<br/><br/>
</td>
<td align="center" width="20%">
<br/>
<img src="https://img.shields.io/badge/Gemini-Active-4285F4?style=for-the-badge&labelColor=1a1a2e" alt="Gemini"/>
<br/><br/>
<sub><b>🟢 Live</b><br/>CSS-only Quill<br/>composer path</sub>
<br/><br/>
</td>
<td align="center" width="20%">
<br/>
<img src="https://img.shields.io/badge/Grok-Active-1DA1F2?style=for-the-badge&labelColor=1a1a2e" alt="Grok"/>
<br/><br/>
<sub><b>🟢 Live</b><br/>grok.com &amp; X<br/>ProseMirror CSS</sub>
<br/><br/>
</td>
<td align="center" width="20%">
<br/>
<img src="https://img.shields.io/badge/Qwen-Active-615EFF?style=for-the-badge&labelColor=1a1a2e" alt="Qwen"/>
<br/><br/>
<sub><b>🟢 Live</b><br/>chat.qwen.ai<br/>presets</sub>
<br/><br/>
</td>
</tr>
</table>

<br />

<!-- Coming soon -->
<table>
<tr>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/Copilot-Coming%20Soon-0078D4?style=for-the-badge&labelColor=1a1a2e&logo=microsoftcopilot&logoColor=white" alt="Copilot"/>
<br/><br/>
<sub><b>🟡 Planned</b><br/>Microsoft Copilot<br/>composer &amp; replies</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/Perplexity-Coming%20Soon-20B8CD?style=for-the-badge&labelColor=1a1a2e" alt="Perplexity"/>
<br/><br/>
<sub><b>🟡 Planned</b><br/>Search-style<br/>answers &amp; follow-ups</sub>
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/DeepSeek-Coming%20Soon-4D6BFE?style=for-the-badge&labelColor=1a1a2e" alt="DeepSeek"/>
<br/><br/>
<sub><b>🟡 Planned</b><br/>Chat composer<br/>+ message surfaces</sub>
<br/><br/>
</td>
</tr>
</table>

<br />

<img src="https://img.shields.io/badge/Legend-🟢%20Live%20%20%7C%20%20🟡%20Coming%20Soon-334155?style=flat-square&labelColor=0f172a" alt="Legend"/>

</div>

---

## ✦ Architecture

```mermaid
flowchart TB
  subgraph Core["@bidi-forge/core"]
    N[normalizeText]
    T[tokenize + detect direction]
    M[apply BiDi markers LRM/RLM/LRI/PDI]
    N --> T --> M
  end

  subgraph Products
    CH[Chrome MV3<br/>content scripts]
    VS[VS Code Extension<br/>commands + webview]
  end

  Core --> CH
  Core --> VS

  style Core fill:#0f766e22,stroke:#14b8a6,stroke-width:2px
  style Products fill:#6366f122,stroke:#6366f1,stroke-width:2px
```

```
packages/
├── core/              Pure TS BiDi engine
├── shared/            Shared types
├── chrome-extension/  BIDI - Forge (MV3)
└── vscode-extension/  RTL Text Fixer
```

---

## ✦ Quick start

```bash
git clone https://github.com/BIDI-Forge/bidi-forge.git
cd bidi-forge
pnpm install
pnpm build
pnpm test
```

| Target | Command |
|:---|:---|
| **Chrome Web Store** | [Install BIDI - Forge](https://chromewebstore.google.com/detail/ffngaifiipbklkbobombbgaeokinepdc) |
| Chrome (unpacked) | `pnpm -C packages/chrome-extension build` → load `dist/` |
| Chrome (store zip) | `pnpm -C packages/chrome-extension pack:store` |
| VS Code `.vsix` | `pnpm -C packages/vscode-extension package` |

---

## ✦ Tech stack

<div align="center">

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/-pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)
![esbuild](https://img.shields.io/badge/-esbuild-FFCF00?style=flat-square&logo=esbuild&logoColor=black)
![Vitest](https://img.shields.io/badge/-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Unicode](https://img.shields.io/badge/-Unicode%20BiDi-14b8a6?style=flat-square)

</div>

---

## ✦ Powered by

<div align="center">

[![Amir Mohamad Kazemi](https://img.shields.io/badge/Amir%20Mohamad%20Kazemi-6366f1?style=for-the-badge&logo=github&logoColor=white)](https://github.com/amirmkazemi)
[![Azim Hatami](https://img.shields.io/badge/Azim%20Hatami-0d9488?style=for-the-badge&logo=github&logoColor=white)](https://github.com/azimhatami)

<br />

**Maintained by [BIDI-Forge](https://github.com/BIDI-Forge) · [@GSMGPT](https://github.com/GSMGPT)**

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,50:0891b2,100:0d9488&height=120&section=footer&fontSize=14&fontColor=ffffff&animation=twinkling&text=Forge%20clarity%20in%20every%20mixed%20sentence." width="100%" alt="Footer wave" />

<br />

**If BIDI · Forge helps your workflow, ⭐ star [bidi-forge](https://github.com/BIDI-Forge/bidi-forge) — it fuels the next AI surface.**

<br />

<sub>MIT © BIDI-Forge · Built with care for Persian, Arabic & English speakers worldwide</sub>

</div>
