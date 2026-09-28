# Lectern

A read-only markdown reader tab for Visual Studio Code: a contents rail, themed Graphviz and
mermaid diagrams, frontmatter rendering, and gate callouts.

## Install (Windows)

Download `lectern-<version>.vsix` from the [latest release](https://github.com/rosschambers/lectern/releases/latest), then in PowerShell:

```powershell
code --install-extension "$env:USERPROFILE\Downloads\lectern-<version>.vsix"
```

Or, with the GitHub command line: `gh release download --repo rosschambers/lectern --pattern "*.vsix" --dir $env:TEMP`.
Reload VS Code afterwards. `*.md` files now open in Lectern; the pencil button opens the source.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run typecheck
```
