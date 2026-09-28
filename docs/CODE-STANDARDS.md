# Lectern — Code Standards

## Code standards

| Standard | Rule |
|----------|------|
| Full descriptive names | Write words out in full — no abbreviations in variable names, function names, parameters, or comments. Loop and lambda parameters use full names (`taskItem`, `user`, `error`), not single letters. |
| Typed errors | Return typed errors, never throw for control flow and never return `null` for a missing result. Every handler returns success-with-value or a named error type. |
| Enums over magic strings | Use enums for fixed value sets — compile-time safety beats runtime typos. Strings are acceptable only for genuinely open-ended sets (external API roles, config section names). |
| Constants for repeated semantic strings | Repeated semantic strings (role identifiers, shared error messages, keyed service identifiers, config section names) live as named constants near the type they describe. Cross-layer constants belong in the Domain. Never inline a literal that carries meaning. |
| Guard partial updates | When a command updates multiple optional fields, only update the ones that were sent. Treat absent/`null` as "not sent" (preserve existing value); use an empty collection as the sentinel for "clear this field". Do not wipe fields the caller did not mention. |
| Block comment headers | Group related members under a short block comment header so the file reads top-to-bottom as sections, not a flat wall. |

## Documentation

| Rule | Detail |
|------|--------|
| Heading hierarchy | `#` title → `##` major sections → `###` subsections. Do not skip levels. |
| Tables for quick reference | Use tables for commands, options, error types, and priority lists. |
| Second-person imperative | Write instructions as "Run the tests", not "You should run the tests". |
| `dot` digraphs, not ASCII art | Express process and dependency flow as `dot` digraph fenced code blocks. |
| Index, not monolith | A root `AGENTS.md` is a lean index that routes to `docs/`; detail lives in the docs and is loaded on demand. |

## Git & commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short imperative subject>

- bullet points for each meaningful change
- omit if the subject line is sufficient
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

**Rules:**

- Subject: lowercase, imperative mood, no period, ≤72 characters.
- Body: one bullet per logical change, not a file-by-file changelog.
- One commit per logical unit of work.
- Never commit secrets, `.env` files, or any credential material.
- Never commit unless explicitly asked. Do not proactively create commits.

## Language-specific standards

### TypeScript

Language-specific deltas only. The language-agnostic rules are the sections above.

#### Tooling

- Use ES modules throughout — `import`/`export`, never `require`.
- Enable `strict: true` in `tsconfig.json`.

#### File Naming

- Lowercase with hyphens for filenames (`user-service.ts`, `parse-config.ts`).

#### Idioms

- Use the `function` keyword for declarations; reserve arrow functions for inline callbacks.
- Annotate explicit return types on all exported and top-level functions.
- No nested ternaries — use `if`/`else if`/`else` chains or `switch` for multiple conditions.
- Handle errors gracefully: catch and fall back rather than letting exceptions surface to the user.
- Module-level caches use `Map<K, V>`; clear them at appropriate lifecycle points.
