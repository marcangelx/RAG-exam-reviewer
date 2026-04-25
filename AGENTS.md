# AGENTS.md

## Core Behavior
- Build MVP-first. Prefer the simplest working solution over scalable perfection.
- Avoid speculative features unless explicitly requested.
- For non-trivial changes, create a short plan before editing.
- For small, obvious changes, edit directly.
- Ask only when ambiguity blocks implementation or risks data loss/security issues.
- Otherwise make a reasonable assumption, state it briefly, and proceed.

## Context Budget
- Inspect only files relevant to the current task.
- Prefer `rg`, file names, symbols, and targeted reads before opening large files.
- Do not scan entire directories unless necessary.
- Do not read generated, vendor, build, cache, dependency, or log directories unless explicitly needed.
- For large files, read only relevant sections/ranges.
- Do not paste long command outputs; summarize and keep only important errors.
- Use `/context` when the session feels bloated.
- Use `/compact` after major milestones, focused on changed files, decisions, and remaining tasks.

## Workflow
- Understand the request, identify impacted files, then implement.
- Validate changes using the smallest relevant check: unit test, lint, typecheck, logs, or sample response.
- If a fix fails twice, stop and rethink before trying again.
- Before finishing, summarize:
  - changed files
  - validation performed
  - remaining risks or follow-ups

## Code Quality
- Keep functions small and readable.
- Avoid premature abstraction.
- Handle edge cases: empty input, invalid input, API failure, timeout, duplicate request.
- Fail gracefully with useful errors.
- Log important backend/Lambda steps, but avoid noisy logs.
- Never trust raw AI output; validate and sanitize before returning or storing.

## AI / Prompt Rules
- Use deterministic, structured prompts.
- Include expected output format.
- Validate model responses before using them.
- Treat AI output as untrusted external input.

## Architecture Principles
- Prefer serverless-first: AWS SAM / CloudFormation, Lambda, SQS, EventBridge.
- Prefer managed services over custom infrastructure.
- Keep services loosely coupled.
- Prefer async processing for long-running or retryable work.
- Minimize heavy database queries and unnecessary writes.
- Avoid overengineering until usage or requirements justify it.

## Do Not Do
- Do not rewrite unrelated files.
- Do not make broad formatting-only changes.
- Do not add dependencies without explaining why.
- Do not create new infrastructure unless required by the task.
- Do not load large logs or datasets unless explicitly needed.


## Build Commands (Low-Noise Mode)

### Angular Build
- Use production + minimal output:
  npm run build -- --configuration=production --progress=false --verbose=false

- If using Angular CLI directly:
  ng build --configuration=production --progress=false --verbose=false

### SAM Build
- Disable debug logs:
  sam build --template-file infra/template.yaml --debug false

- If logs are still verbose:
  sam build 2>&1 | findstr /R /C:"ERROR" /C:"Error" /C:"Failed"

### Generic Node Build
- Suppress warnings:
  NODE_OPTIONS="--no-warnings" npm run build

- Silent npm:
  npm run build --silent

### Filter Logs (Universal)
- Only show errors:
  <command> 2>&1 | grep -i "error\|failed"

- Windows (PowerShell):
  <command> 2>&1 | Select-String -Pattern "error","failed"

### Strict Output Rule
- Never display full logs
- Only return:
  - errors
  - warnings (if critical)
  - final status

