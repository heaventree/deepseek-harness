# phase1-local

English | [中文](README.zh.md)

This opt-in composition assembles the local Git intake provider, filesystem-backed distilled project memory, and read-only project planning consumer. It also registers an LM Studio OpenAI-compatible route through `@deepseek-ai/dsh-llm-pi-ai`, but the example does not dispatch a model.

## Run it

Start an LM Studio local server, then supply an API-key placeholder because the OpenAI-compatible adapter always sends a credential. The runner does not contact the server in this Phase 1 composition.

```powershell
$env:LM_STUDIO_API_KEY = 'lm-studio'
$env:LM_STUDIO_MODEL = 'your-loaded-model' # optional; default: local-model
$env:LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234/v1' # optional
pnpm exec tsx examples/phase1-local/start.ts --root . --task 'Inspect this repository and propose a narrow change.'
```

`DSH_PHASE1_MEMORY_PATH` optionally replaces the default `.dsh/phase1-project-memory.json` location. Project memory stores only distilled records; this example reads it but does not create or update it.

## Approval boundary

The runner prints a `ProjectPlanningResult` whose `implementationApproval` is always `{ status: 'awaiting-human-approval', operation: 'implementation-write' }`. No agent loop, model-facing write tool, implementation-write consumer, or external-service client is composed. A later implementation workflow must obtain human approval and compose its own write consumer; it cannot infer that authority from this planning result.
