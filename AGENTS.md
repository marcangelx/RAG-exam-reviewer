# AGENTS.md

## Operating Rules
- Build MVP-first. Prefer simple, working changes over speculative architecture.
- Inspect only files relevant to the task. Do not load generated, dependency, cache, build, or log directories unless required.
- For non-trivial changes, make a short plan before editing.
- Validate with the smallest useful check. Use `tests/test.sh` for full repo validation.
- Stop and rethink if the same fix fails twice.

## Project Guardrails
- Use AWS SAM and managed serverless services. Do not add infrastructure without an explicit cost callout.
- Keep AI prompts deterministic and structured. Validate AI output before storing or showing it.
- Keep UI logic separated from auth, API transport, data access, and review-session state.
- Do not rewrite unrelated files or make broad formatting-only changes.

## Focused Guidance
- Angular frontend guidance: [docs/agents/angular.md](docs/agents/angular.md)
- Build and validation commands: [docs/agents/commands.md](docs/agents/commands.md)
- Product and architecture context: [README.md](README.md), [docs/architecture.md](docs/architecture.md), [docs/operations.md](docs/operations.md)
