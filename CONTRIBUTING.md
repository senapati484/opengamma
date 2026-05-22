# Contributing to Open Gamma 🎨

Thank you for your interest in contributing to **Open Gamma**! We love open-source contributions, whether it's fixing bugs, improving documentation, designing new themes, or writing new features.

---

## 🚀 Getting Started

1. **Fork the Repository**: Create your own copy of this repository on GitHub.
2. **Clone Locally**:
   ```bash
   git clone https://github.com/your-username/opengamma.git
   cd opengamma
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

---

## 🛠️ Development Workflow

- **Run in Development**: Start the hot-reloading development environment for both the Electron main process and React renderer:
  ```bash
  npm run dev
  ```
- **Type Checking**: Before making a commit, ensure that your TypeScript compiles correctly without errors:
  ```bash
  npm run typecheck
  ```
- **Code Style**: We use Prettier and ESLint. Make sure your changes follow the coding standards and file structure.
- **Build & Package**: Build and verify the distribution packages:
  ```bash
  npm run build
  ```

---

## 📝 Commit Guidelines

We recommend using semantic commit messages to keep our history clean and readable:

- `feat:` for new features (e.g., `feat: add custom slide animation selector`)
- `fix:` for bug fixes (e.g., `fix: resolve PPTX export rendering bug`)
- `docs:` for documentation updates (e.g., `docs: update troubleshooting guide`)
- `style:` for changes that do not affect the meaning of the code (whitespace, formatting)
- `refactor:` for code restructuring without behavior changes
- `chore:` for updating build tasks, package dependencies, etc.

---

## 📬 Submitting a Pull Request

1. Push your branch to your forked repository:
   ```bash
   git push origin feature/amazing-feature
   ```
2. Open a Pull Request (PR) against our `main` branch.
3. Provide a clear description of the changes in the PR template, including the motivation and a summary of what you tested.
4. Once your PR is reviewed and approved, it will be merged into the project!

---

## 📄 License

By contributing to Open Gamma, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
