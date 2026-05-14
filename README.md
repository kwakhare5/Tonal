<!-- ╔══════════════════════════════════════════════════════════════════╗
     ║          Tonal — README                                             ║
     ║          Precision Tone Translation for Gmail, Slack, & LinkedIn    ║
     ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

  <img src="https://raw.githubusercontent.com/kwakhare5/Tonal/main/icons/icon128.png" alt="Tonal Logo" width="128"/>
  <br/>

  # Tonal

  ### *The two-way tone translator for elite professional communication.*

  <br/>

  ![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
  ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
  ![Last Commit](https://img.shields.io/github/last-commit/kwakhare5/Tonal?style=for-the-badge&color=orange)
  ![Stars](https://img.shields.io/github/stars/kwakhare5/Tonal?style=for-the-badge&color=yellow)
  ![Language](https://img.shields.io/badge/Language-Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

  <br/>

  <a href="#-about-the-project">About</a> &nbsp;·&nbsp;
  <a href="#-demo">Demo</a> &nbsp;·&nbsp;
  <a href="#-features">Features</a> &nbsp;·&nbsp;
  <a href="#-tech-stack">Tech Stack</a> &nbsp;·&nbsp;
  <a href="#-quickstart">Quickstart</a> &nbsp;·&nbsp;
  <a href="#-contributing">Contributing</a> &nbsp;·&nbsp;
  <a href="#-author">Author</a>

</div>

---

## 🎬 Demo

<div align="center">
  <img src="media/demo.gif" alt="Tonal Demo" width="800"/>
</div>

<br/>

---

## 📌 About the Project

**Tonal** is a **zero-dependency Chrome extension** built with **Vanilla JavaScript (Manifest V3)**.

Tonal solves the friction of switching between casual drafts and professional execution. Powered by Groq Llama 3.3 70B, it provides high-fidelity, preamble-free rephrasing inside Gmail, Slack, and LinkedIn.

> **Why this project?**
> Most professional friction comes from tone mismatch. Tonal bridges that gap instantly.

<br/>

---

## ✨ Features

| Status | Feature | Description |
|:---:|---|---|
| ✅ | **Precision Sending** | Convert casual drafts to Formal Professional or Work Chat instantly. |
| ✅ | **Blunt Decoding** | Highlight jargon and get a plain English explanation in a magnetic viewport card. |
| ✅ | **1.5s Watchdog** | A heartbeat loop ensures the UI persists through complex React/Lexical re-renders. |
| ✅ | **Identity Lock** | AI engine preserves names, dates, emails, and numbers as immutable constants. |
| ✅ | **Platform Adapters** | Custom DOM synchronization for Gmail, Slack, and LinkedIn to prevent cursor drift. |

<br/>

---

## 🛠️ Tech Stack

<div align="center">

### Core
![JS](https://skillicons.dev/icons?i=js)
![HTML](https://skillicons.dev/icons?i=html)
![CSS](https://skillicons.dev/icons?i=css)

### Infrastructure
![Cloudflare](https://skillicons.dev/icons?i=cloudflare)
![GitHub Actions](https://skillicons.dev/icons?i=githubactions)

</div>

<br/>

| Layer | Technology | Purpose |
|---|---|---|
| **Language** | Vanilla JS | Zero-dependency, lightweight runtime |
| **Framework** | Manifest V3 | Chrome Extension architecture |
| **Styling** | Shadow DOM CSS | Zero leakage to/from host pages |
| **API / Engine** | Groq Llama 3.3 | 70B parameter high-fidelity rephrasing |
| **Deployment** | Cloudflare Workers | Secure, serverless API routing |

<br/>

---

## 🏗️ Architecture

```mermaid
flowchart LR
    A[Host DOM] <--> B[Platform Adapter]
    B <--> C[Content Orchestrator]
    C <--> D[Shadow Root UI]
    C <--> E[Background Service Worker]
    E <--> F[Cloudflare Proxy]
    F <--> G[Groq Llama 3.3]
```

<br/>

---

## 📁 Project Structure

```
Tonal/
│
├── manifest.json                # Extension configuration (MV3)
├── src/
│   ├── core/
│   │   └── tonal.js             # Design System tokens & classes
│   └── extension/
│       ├── adapters/            # Platform-specific (Gmail/Slack/LinkedIn)
│       ├── background.js        # Service worker (Proxy handler)
│       └── content.js           # Injection & Watchdog engine
│
├── icons/                       # Branding & UI assets
└── README.md
```

<br/>

---

## 🚀 Quickstart

### Prerequisites

- **Google Chrome** — Or any Chromium-based browser
- **Developer Mode** — Enabled in chrome://extensions/

<br/>

### Step 1 — Clone

```bash
git clone https://github.com/kwakhare5/Tonal.git
cd Tonal
```

### Step 2 — Load Unpacked

Open chrome://extensions/, toggle Developer mode, and click Load unpacked selecting the Tonal folder.

```bash
chrome://extensions/
```

### Step 3 — Configure Preferences

Click the Tonal Icon, select your default tone level, and settings will sync instantly.

```bash
# UI Interaction
```

<br/>

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/your-feature`)
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m "feat: add your feature"`)
4. **Push** (`git push origin feature/your-feature`)
5. **Open a Pull Request**

<br/>

---

## 🛡️ Privacy & Security

> Tonal is a stateless utility. No message data is ever stored on our servers. Requests are processed in real-time by Groq Llama 3.3 and discarded immediately.

<br/>

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for the full text.

<br/>

---

## 👨‍💻 Author

<div align="center">

### Karan Wakhare
*Full Stack Engineer*

<br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-karanwakhare-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/karanwakhare)
[![Twitter](https://img.shields.io/badge/Twitter-kwakhare5-1DA1F2?style=for-the-badge&logo=x&logoColor=white)](https://x.com/kwakhare5)
[![Gmail](https://img.shields.io/badge/Gmail-kwakhare5%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:kwakhare5@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-kwakhare5-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kwakhare5)

<br/>

![GitHub Streak](https://streak-stats.demolab.com/?user=kwakhare5&theme=tokyonight&hide_border=true)

<br/>

![Profile Views](https://komarev.com/ghpvc/?username=kwakhare5&label=Profile+Views&color=0e75b6&style=for-the-badge)

</div>

<br/>

---

<div align="center">

  Made with ❤️ by [Karan Wakhare](https://github.com/kwakhare5)

  <br/>

  *"First, solve the problem. Then, write the code."*

  <br/>

  ![Wave](https://raw.githubusercontent.com/mayhemantt/mayhemantt/Update/svg/Bottom.svg)

</div>
