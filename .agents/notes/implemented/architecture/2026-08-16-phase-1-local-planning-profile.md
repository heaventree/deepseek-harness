# Agent Note: Opt-in local-first planning composition keeps model routing separate from write authority

Status: implemented

English | [中文](2026-08-16-phase-1-local-planning-profile.zh.md)

## Problem

The Phase 1 project services can be tested independently without proving that their actual Cordis composition activates together or that a local model route does not accidentally authorize edits. A profile that extends a shipped agent composition would also make an experimental workflow available by default and inherit model-facing write capabilities unrelated to planning.

## Decision

`examples/phase1-local/cordis.yml` is an opt-in Loader composition. It mounts `dsh-project-git-local` over the local shell provider, `dsh-project-memory-local` over the local filesystem provider, and `dsh-project-planning` as the only workflow consumer. It registers an LM Studio OpenAI-compatible route with `dsh-llm-pi-ai`; that route is configuration only because the composition mounts no agent loop or model consumer.

The example runner calls `projectPlanning.plan()` and verifies the returned `implementationApproval` remains `awaiting-human-approval` for `implementation-write`. It never mounts a tool or workflow that writes implementation files. The assembled Loader test pins the registered LM Studio route and every required local planning service.

## Alternatives considered

- **Extend `headless` or `web`** — those shipped profiles intentionally own an agent loop and model-facing tools, so a planning-only demonstration would broaden the installed default capability set.
- **Let the planning consumer dispatch the configured LM Studio route** — planning needs to select evidence and expose a later model route, not own request logging, model execution, or implementation authority.
- **Use an inline API key** — credentials remain environment-owned and are never committed in a composition file; the documented placeholder satisfies local OpenAI-compatible endpoints that demand an authorization header.

## Consequences

Operators can inspect a local repository with the same providers the Phase 1 path uses, while the source tree has no implementation-write consumer to invoke. LM Studio configuration remains reusable by a later session-aware planning-board consumer, which must add model-visible logging and its own verification. The example's memory document is a configurable local file and is only read in the demonstrated request.
