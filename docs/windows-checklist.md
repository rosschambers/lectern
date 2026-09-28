# Windows verification checklist

Run on the Windows PC with stock VS Code, after installing the release `.vsix`.
Record each result as pass or fail with a note.

## v0.0.1 spike

1. Open a folder containing `spike.md` (download it from the repo's `test/fixtures/`). Double-click it in the Explorer. It opens in a **Lectern** tab, not the text editor.
2. Both diagrams show as pictures, not error text.
3. Run **Developer: Open Webview Developer Tools**. The Console shows **no** "Content Security Policy" errors.
4. The pencil button in the title bar swaps the tab to the text editor. **Lectern: Open in Lectern** (book button) swaps back. There is only ever one tab for the file.
5. Edit a git-tracked `.md` file, save it, and click it in the **Source Control** view. Note exactly what opens: a text diff (fine), or two Lectern panes (record it; this decides the priority fallback).
6. Ctrl+P, type a `.md` name, press Enter. It opens in Lectern.
7. Right-click a `.md` file, choose **Open With...** Both "Lectern" and "Text Editor" are listed.
