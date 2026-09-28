# Lectern Agent Rules

Lectern is a VS Code extension: a read-only markdown reader tab (a custom text editor) with a
contents rail, themed Graphviz and mermaid diagrams, frontmatter and gate-tag rendering. It
targets stock VS Code on Windows and ships as a `.vsix` from GitHub releases.

These rules apply to every agent working in this repository. This file is loaded into every conversation, so it stays a lean index — broadly-applicable workflow only. Standards, architecture, and pattern detail live in the docs below and are loaded on demand.

## Documentation Index

| Document | What lives there |
|----------|------------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Extension host / webview / pure-module split and the dependency direction. |
| [`docs/CODE-STANDARDS.md`](docs/CODE-STANDARDS.md) | Code standards (naming, typed errors, enums, constants), documentation rules, Git & commit conventions, TypeScript appendix. |
| [`docs/PATTERNS.md`](docs/PATTERNS.md) | Communication style, intellectual honesty, working style, tool usage, testing, and how to present options with trade-offs. |
| [`docs/plans/`](docs/plans/) | Approved designs and implementation plans. Start with `2026-09-28-lectern-design.md`. |

## Architecture at a Glance

Three zones, dependencies pointing inward to pure code:

| Zone | Owns | Depends on |
|------|------|------------|
| `src/shared/` | Pure functions and message types: link classification, outline, slugs, SVG recoloring. No `vscode`, no DOM. | Nothing. |
| `src/extension/` | Custom editor provider, commands, link routing, persisted state. | `vscode` API + `shared`. |
| `src/webview/` | markdown-it renderer, diagrams, contents rail, styles. | DOM + `shared`. |

The extension and the webview never import each other; they talk only through the typed
messages in `src/shared/messages.ts`. Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Public repository

This repository is public. Never commit personal content: fixtures and examples are synthetic.
Never copy documents from other private repositories into fixtures.

---

## Workflow: Brainstorm → Plan → Execute

For any non-trivial feature (3+ files, new pattern, user-visible decision):

1. **Discover** — understand the existing landscape before proposing anything.
2. **Brainstorm** — present 2–4 options with trade-offs and an explicit recommendation.
3. **Design** — write to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Architecture, scope, non-goals, locked decisions.
4. **Plan** — produce a per-task plan with file paths, code blocks, test skeletons, commit messages.
5. **Execute** — independent tasks in parallel with a tight file-scope allowlist; sequential or small plans inline.

**Skip for:** single-file bug fixes, typos, trivial renames, doc-only updates.

See [`docs/PATTERNS.md`](docs/PATTERNS.md) for working style and option-presentation detail.
