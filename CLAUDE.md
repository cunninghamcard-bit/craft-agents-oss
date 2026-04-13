# CLAUDE.md — craft-agents-oss

## Project State

This fork has migrated to the **VoidZero** toolchain:
- **Vite 8** (`^8.0.8`) with experimental `rolldownBundler`
- **Rolldown** (`^1.0.0-rc.15`) for Electron main/preload builds
- **Oxc** (`oxlint ^1.59.0`, `oxfmt ^0.44.0`) replacing ESLint + Prettier

ESLint, esbuild, and all custom ESLint rules have been fully removed.

---

## Log Location

Main process runtime logs (useful for debugging Rolldown bundling issues, missing exports, etc.):

```
~/.config/@craft-agent/electron/logs/main.log
```
