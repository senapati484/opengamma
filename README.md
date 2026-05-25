# Open Gamma — the open-source Gamma.app alternative

<p align="center">
  <a href="https://github.com/senapati484/opengamma/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/senapati484/opengamma?style=for-the-badge&labelColor=0d1117&color=ffd700&logo=github&logoColor=white&v=2" /></a>
  <a href="https://github.com/senapati484/opengamma/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/senapati484/opengamma?style=for-the-badge&labelColor=0d1117&color=2ecc71&logo=github&logoColor=white&v=2" /></a>
  <a href="https://github.com/senapati484/opengamma/issues"><img alt="Issues" src="https://img.shields.io/github/issues/senapati484/opengamma?style=for-the-badge&labelColor=0d1117&color=ff6b6b&logo=github&logoColor=white&v=2" /></a>
  <a href="https://github.com/senapati484/opengamma/pulls"><img alt="Pull Requests" src="https://img.shields.io/github/issues-pr/senapati484/opengamma?style=for-the-badge&labelColor=0d1117&color=9b59b6&logo=github&logoColor=white&v=2" /></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="#core-features"><img alt="Features" src="https://img.shields.io/badge/features-interactive%20editor%20%2B%20exporter-orange?style=flat-square" /></a>
  <a href="#keyboard-shortcuts"><img alt="Shortcuts" src="https://img.shields.io/badge/shortcuts-global%20hotkeys-teal?style=flat-square" /></a>
</p>

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/9abbe7ff-c729-4980-b52e-2cb050122753" width="49%" alt="Open Gamma Dashboard" />
  <img src="https://github.com/user-attachments/assets/cd1ed6e1-6dad-42a2-a426-3e901f243e4d" width="49%" alt="Open Gamma Slide Editor" />
</p>

<p align="center">
  <a href="https://sourceforge.net/projects/open-gamma/files/latest/download"><img alt="Download Open Gamma" src="https://a.fsdn.com/con/app/sf-download-button" /></a>
</p>

<p align="center">
  <a href="https://sourceforge.net/projects/open-gamma/files/latest/download"><img alt="Download Stats" src="https://img.shields.io/sourceforge/dt/open-gamma.svg" /></a>
  &nbsp;&nbsp;
  <a href="https://sourceforge.net/p/open-gamma/"><img alt="SourceForge" src="https://sourceforge.net/sflogo.php?type=17&amp;group_id=4098199" width="120" /></a>
</p>

> **Open Gamma is the premium, open-source, local-first alternative to [Gamma.app](https://gamma.app/).** Built on a modern Electron, React, and TypeScript desktop architecture, it empowers you to draft, design, refine, and export high-fidelity slides and booklets with local offline security and BYOK model flexibility.

> [!IMPORTANT]
>
> ### 🚀 Local AI Slide Generation & Complete Privacy
>
> All draft presentations, generated assets, slide history, and system settings are securely stored locally inside a lightweight, fast, local SQLite database. No cloud lock-in, no recurring subscription fees.

---

## 📥 Download v1.0.0

| Platform | Installer File | Size | Link |
| :--- | :--- | :--- | :--- |
| **Windows** | `Open Gamma 1.0.0.exe` | 312.2 MB | [Download](https://sourceforge.net/projects/open-gamma/files/v1.0.0/Open%20Gamma%201.0.0.exe/download) |
| **macOS (Apple Silicon)** | `Open Gamma-1.0.0-arm64.dmg` | 356.6 MB | [Download](https://sourceforge.net/projects/open-gamma/files/v1.0.0/Open%20Gamma-1.0.0-arm64.dmg/download) |
| **Linux (AppImage)** | `Open Gamma-1.0.0-arm64.AppImage` | 351.1 MB | [Download](https://sourceforge.net/projects/open-gamma/files/v1.0.0/Open%20Gamma-1.0.0-arm64.AppImage/download) |

<details>
<summary><b>🖥️ Installation Instructions</b></summary>

### Windows
1. Download the `.exe` installer.
2. Double-click to run and follow the wizard.

### macOS (Apple Silicon / ARM64)
1. Download the `.dmg` file.
2. Open the DMG file and drag **Open Gamma** to your **Applications** folder.

### Linux
1. Download the `.AppImage` file.
2. Make it executable: `chmod +x Open\ Gamma-1.0.0-arm64.AppImage`.
3. Run it: `./Open\ Gamma-1.0.0-arm64.AppImage`.
</details>

---

## 💡 Why this exists

Gamma.app showed how powerful AI-driven slide compilation and content scaffolding can be. However, it remains a closed-source, cloud-locked platform with paid tiers and potential privacy concerns for sensitive business proposals, pitches, or educational material.

**Open Gamma is the open-source alternative.** Built to run locally on your laptop, it provides an artifact-first visual editor, offline SQLite database storage, dynamic theme switching, and robust PDF/PPTX/HTML exporters. You bring your own API keys (BYOK) for local or cloud AI models, keeping complete ownership of your data and creations.

---

## ⚡ At a Glance

| Feature                    | Description                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Outline Scaffolding** | Paste prompts or outlines to auto-generate styled slide booklets in real-time.                                                                     |
| **High-Fidelity Exporter** | Export to premium PDF booklets, editable native PowerPoint (`.pptx`), static images (`.png`), or interactive standalone web pages (`.html`).       |
| **Theme Engine**           | Instantly switch between modern, high-contrast, tech, neon-accented, or geometric style systems with dynamic HSL mapping.                          |
| **Visual Booklet Editor**  | Rearrange layouts (`Title`, `Content`, `Split Grid`, `Data Metrics`, `CTA`), control typography, override slide colors, and edit content in-place. |
| **Privacy First**          | 100% offline-compatible database (SQLite) for draft preservation and history tracking.                                                             |

---

## 🚀 The Local-First Slide Architecture

Open Gamma acts as a compiler that takes structured text outlines and transforms them into interactive slides.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User Creative Vision                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            Generative Engine (Local CLI / Secure AI Outline)            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Interactive HTML & CSS Presentation Compiler             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐              ┌──────────────┐
│ SQLite Store │             │ Reveal.js UI │              │ Export Suite │
└──────────────┘             └──────────────┘              └──────────────┘
```

---

## ⌨️ Keyboard Shortcuts

Press the **Help & Shortcuts** `(?)` button in the app or use these shortcuts to speed up your design iterations:

| Shortcut                               | Action                                 | Scope                      |
| -------------------------------------- | -------------------------------------- | -------------------------- |
| <kbd>⌘ / Ctrl</kbd> + <kbd>Enter</kbd> | Generate slides / submit draft outline | Main Form / Editor         |
| <kbd>⌘ / Ctrl</kbd> + <kbd>E</kbd>     | Open the Export Studio                 | Global                     |
| <kbd>⌘ / Ctrl</kbd> + <kbd>S</kbd>     | Save current slide editing changes     | Slide Edit Modal           |
| <kbd>⌘ / Ctrl</kbd> + <kbd>,</kbd>     | Open Settings & Configurations         | Global                     |
| <kbd>Escape</kbd>                      | Close active modal / cancel generation | Global                     |
| <kbd>←</kbd> / <kbd>→</kbd>            | Navigate slide history                 | Canvas (Focus independent) |
| <kbd>⌘ / Ctrl</kbd> + <kbd>Z</kbd>     | Undo last slide modification           | Canvas (Focus independent) |

---

## 🛠️ Project Setup & Installation

Follow these commands to install, run, and package Open Gamma on your local system:

### 1. Installation

Clone the repository and install developer dependencies:

```bash
git clone https://github.com/senapati484/opengamma.git
cd opengamma
npm install
```

### 2. Running in Development

Start the hot-reloading dev server for both the Electron main process and React renderer:

```bash
npm run dev
```

### 3. Compiling & Packaging

Build production bundles and package native desktop installers:

```bash
# General Production Build
npm run build

# Package for macOS (Intel & Apple Silicon)
npm run build:mac

# Package for Windows
npm run build:win

# Package for Linux
npm run build:linux
```

All packed applications and installers will be output to the `out/` directory.

---

## 📁 Repository Directory Structure

```
opengamma/
├── docs/                      # Research and system design documentation
├── resources/                 # Application icons and native platform wrappers
├── src/
│   ├── main/                  # Electron Main Process (IPC Handlers, SQLite, IO)
│   │   ├── cliRunner.ts       # Runs command line generative AI scripts
│   │   ├── cliScanner.ts      # Scans system path for local generative CLIs
│   │   ├── db.ts              # SQLite database schema setup & connections
│   │   ├── exporter.ts        # Exporter controller (PDF/HTML/PPTX compiling)
│   │   ├── generator.ts       # AI draft outline orchestrator
│   │   ├── htmlToPptx.ts      # Slide layout to native PPTX compiler
│   │   ├── ipc.ts             # IPC listeners bridging main and renderer
│   │   └── slideParser.ts     # Parses markdown content to presentation objects
│   ├── preload/               # Electron Preload Scripts (Secure Context Bridge)
│   └── renderer/              # React Renderer Process (UI, Presentation Preview)
│       └── src/
│           ├── components/    # Reusable UI controls, modals, and canvas layers
│           ├── context/       # AppContext & State Provider
│           ├── lib/           # Slide compiler, themes, custom hooks, layoutStyles
│           └── styles/        # Global layout styling and Tailwind inputs
├── electron-builder.yml       # Desktop packing & application distribution config
├── electron.vite.config.ts    # Custom configuration for vite electron compiler
└── tsconfig.json              # TypeScript workspace settings
```

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md) to get started.

---

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
