# 🎨 OpenGamma

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Framework-Electron-47848F.svg)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Build%20Tool-Vite-646CFF.svg)](https://vite.dev/)

> **OpenGamma** is the premier, open-source, local-first alternative to Gamma.app. Built on a modern Electron, React, and TypeScript desktop architecture, it empowers you to draft, design, refine, and export high-fidelity slides and booklets with local offline security.

---

## 🚀 The Local-First Slide Architecture

Unlike cloud-locked web SaaS platforms, OpenGamma keeps your creative data and presentation outlines where they belong: **on your hard drive**.

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

## ✨ Core Features

### ⚡ AI-Powered Presentation Drafting
Outline your slides by writing a short description or pasting a complete text prompt. The generative system drafts structured slides, layouts, and slide-by-slide summaries in real-time.

### 🎨 Premium HSL-Tailored Design Systems
OpenGamma comes packed with professional CSS-in-JS themes. Select from beautiful modern, high-contrast, tech, neon-accented, or geometric style sets. Every component respects global typography and color variables dynamically mapped in CSS.

### 📖 The Visual Booklet Editor
* **Layout Scaffolding**: Effortlessly toggle layouts between `Title`, `Content`, `Split Grid`, `Data Metrics`, and `Call to Action (CTA)`.
* **Dynamic Sizing**: Fine-tune individual headings, body font sizes, and layout parameters.
* **Premium Typography**: Select heading and body fonts from a hand-picked Google Font catalog featuring **Inter**, **Outfit**, **Space Grotesk**, **Playfair Display**, **Syne**, and **Sora**.
* **Color Customization**: Easily override theme colors or background styling per slide.

### 📦 Robust Multi-Format Export Studio
* **High-Fidelity PDF Exporter**: Generate beautifully formatted booklet reports with pixel-perfect pagination, print-media queries, and customized aspect-ratio controls.
* **Editable PowerPoint (`.pptx`)**: Direct conversion of slide text, bullets, and geometric grids into native editable PowerPoint presentations.
* **Static Images (`.png`)**: Single-click rendering of full presentations into static image packs.
* **Self-Contained Web Pages (`.html`)**: Share your interactive slides online as highly compatible, responsive standalone web pages.

### 🔒 Privacy-First Offline Database
All draft presentations, generated assets, slide history, and system settings are securely stored locally inside a lightweight, fast, local SQLite database.

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

Press the **Help & Shortcuts** button `(?)` in the Left Panel footer or use these handy keyboard combinations to accelerate your creative workflow:

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>⌘ / Ctrl</kbd> + <kbd>Enter</kbd> | Generate slides / submit draft outline | Main Form / Editor |
| <kbd>⌘ / Ctrl</kbd> + <kbd>E</kbd> | Open the Export Studio | Global |
| <kbd>⌘ / Ctrl</kbd> + <kbd>S</kbd> | Save current slide editing changes | Slide Edit Modal |
| <kbd>⌘ / Ctrl</kbd> + <kbd>,</kbd> | Open Settings & Configurations | Global |
| <kbd>Escape</kbd> | Close active modal / cancel generation | Global |
| <kbd>←</kbd> / <kbd>→</kbd> | Navigate slide history | Canvas (Focus independent) |
| <kbd>⌘ / Ctrl</kbd> + <kbd>Z</kbd> | Undo last slide modification | Canvas (Focus independent) |

---

## 🛠️ Project Setup & Installation

Follow these quick commands to install, run, and package OpenGamma on your local system:

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed.

### 2. Installation
Clone the repository and install developer dependencies:
```bash
git clone https://github.com/sayansenapati/opengamma.git
cd opengamma
npm install
```

### 3. Running in Development
Start the hot-reloading dev server for both the Electron main process and React renderer:
```bash
npm run dev
```

### 4. Running TypeScript Checks
Ensure all TypeScript definitions and configurations are correct:
```bash
npm run typecheck
```

### 5. Compiling & Packaging for Production
Compile the React code and package the native desktop applications:

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
│   │   ├── cliScanner.ts      # Scans system path for local generative CLIs
│   │   ├── database.ts        # SQLite storage controller & schema migrations
│   │   ├── exporter.ts        # Exporter controller (PDF/HTML/PPTX compiling)
│   │   ├── generator.ts       # AI draft outline orchestrator
│   │   └── ipc.ts             # IPC listeners bridging main and renderer
│   ├── preload/               # Electron Preload Scripts (Secure Context Bridge)
│   └── renderer/              # React Renderer Process (UI, Presentation Preview)
│       └── src/
│           ├── components/    # Reusable UI controls, modals, and canvas layers
│           ├── context/       # AppContext & State Provider
│           ├── lib/           # Slide compiler, Reveal.js hooks, useStream
│           └── styles/        # Global layout styling and Tailwind inputs
├── electron-builder.yml       # Desktop packing & application distribution config
├── electron.vite.config.ts    # Custom configuration for vite electron compiler
└── tsconfig.json              # TypeScript workspace settings
```

---

## 🤝 Contribution Guidelines

We love open-source contributions! If you'd like to improve OpenGamma:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes with clear descriptions (`git commit -m 'Add support for view transitions'`).
4. Push your branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
