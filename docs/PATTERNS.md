# Lectern — Patterns

How to work in this repository: communication, intellectual honesty, working style, tool usage,
testing, and presenting options.

## Communication style

- No AI-speak. Skip "Certainly!", "Great question!", "Absolutely!", and every other sycophantic opener. Just respond.
- Be direct. Give short answers when short answers are correct. Don't pad.
- Use plain language. If a technical term is needed, use it — don't dumb it down, don't dress it up.
- Treat "no u" / "no you" / "you" as "you do it." Stop suggesting, take the action yourself, don't ask for confirmation.
- Never abbreviate — anywhere. Write words out in full in responses, code, comments, commit messages, documentation, and file content. Standard proper-name acronyms (JSON, YAML, HTML, API, MCP) are fine — those are names, not abbreviations.

## Intellectual honesty

- Challenge assertions. If something seems wrong, say so — respectful disagreement beats false agreement.
- Trust but validate. Don't assume the user's memory of a fact, API, or behavior is correct. Check first.
- Uncertainty is fine. Say "I'm not sure" rather than guessing confidently.
- No motivated reasoning. Don't construct arguments to validate a conclusion that was already decided.

## Working style

- Break complex tasks into a todo list before starting; track progress against it.
- Brainstorm before building. Explore intent, requirements, and design before writing code.
- Verify before claiming something works. Evidence before assertions, always.
- Never commit unless explicitly asked. Do not proactively create commits.
- End your turn with a question — offer next steps, confirm direction, or surface a decision.

## Tool usage

- Run independent tool calls in parallel. If two or more calls do not depend on each other's
  output, fire them in the same message rather than serializing.
- Run dependent calls sequentially, feeding each result into the next.
- Prefer dedicated tools over shell equivalents: a file-read tool over `cat`, a search tool over
  `grep`, an edit tool over `sed`. Reserve the shell for actual system commands.

## Testing

| Practice | Rule |
|----------|------|
| Test-driven where it fits | Write the failing test first for features and bugfixes, then the implementation. |
| Dependency-injection validation | Build the real dependency graph in tests; stub **only** true external infrastructure (in-memory database, no-op storage). Never stub a service the system is supposed to register itself — that masks the exact bug the test exists to catch. |
| Verify combined state before green | After parallel work, run the full build and test suite over the combined result. Individual-task verification is advisory; the integrated run is authoritative. |

## Presenting options with trade-offs

When multiple viable approaches exist (library choice, storage shape, protocol, in-process vs
separate process), the agent researches and recommends; the user chooses.

1. Present 2–4 options with a trade-offs table and an explicit recommendation. The recommended
   option goes first, labeled "(Recommended)", with a short rationale.
2. Group related questions into one prompt instead of asking serially.
3. Surface any finding that contradicts the user's stated claim **before** any other question.
   If the user says "X is broken" and the code says X works, call it out first — do not silently
   fix something that is not broken.
4. Ask about scope up front for open-ended asks: "In scope for v1?", "Minimum viable vs complete?".
5. Offer revert paths explicitly when reversing a decision.
6. Never make destructive architectural decisions (renaming exported symbols, deleting files,
   reshaping data models) without approval. Editing the internals of a single component: just do it.
