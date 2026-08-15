# @deepseek-ai/dsh-project-foundations

English | [中文](README.zh.md)

This package provides deterministic, side-effect-free foundations for the Phase 1 local-first planning path. Callers collect repository facts and external evidence; the package does not execute Git, write a worktree, make network requests, or dispatch a model.

## Responsibilities

- Preserve Git-aware project-intake evidence and create rollback checkpoints only from an observed branch and commit.
- Select a bounded context pack from caller-estimated candidates.
- Choose the lowest-cost permitted knowledge source before a model request.
- Describe project-memory storage and thin RepoHive, HT AI Brain, Niimo, and super-router adapters without importing those systems.
- Select baseline verification and risk-triggered specialist review from changed paths.

## LM Studio

LM Studio already works through `@deepseek-ai/dsh-llm-pi-ai` as a hand-declared `openai-completions` route. Configure its local endpoint and model catalogue in the existing adapter; this package classifies the route as `local-llm` and never owns transport configuration.

```yaml
providers:
  lm-studio:
    displayName: LM Studio
    api: openai-completions
    baseURL: http://127.0.0.1:1234/v1
    models:
      - id: local-model
        contextWindow: 32768
```

## Known Limitations and Deferred Work

- No Cordis plugin or default composition is mounted yet. A later consumer owns Git execution through the shell seam, persistence through a project-memory provider, and model-visible session events.
- The adapter interfaces omit credentials, retry policy, and transport details. Each external-system provider owns those concerns.
- Context token estimates are supplied by callers; exact provider accounting remains owned by `@deepseek-ai/dsh-token-meter`.
