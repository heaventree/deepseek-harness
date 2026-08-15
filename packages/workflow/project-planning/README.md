# @deepseek-ai/dsh-project-planning

English | [中文](README.zh.md)

This package is the read-only planning consumer for the Phase 1 project path. It combines `ctx.projectIntake`, `ctx.projectMemory`, caller-provided local candidates, and optional thin adapter results into one bounded context pack. It does not compose an implementation-write consumer, dispatch a model, inject session context, or call an external client directly.

## Behavior

- `plan()` reads one local intake and relevant project-memory records. It copies returned evidence before it leaves the service.
- RepoHive, HT AI Brain, Niimo, and super-router are optional typed adapters supplied by the caller. Missing adapters contribute no evidence; configured adapters retain ownership of credentials, transport, retry policy, and availability failures.
- Callers supply all generated-evidence token estimates and the governor inputs. The context broker rejects an over-budget required task and omits lower-priority evidence that cannot fit.
- The result always exposes `implementationApproval: { status: 'awaiting-human-approval', operation: 'implementation-write' }`. A separate human-approved consumer owns every implementation write.
- A super-router adapter may resolve a later route after the token governor selects a model source. This package does not invoke that route or any model.

## Model Experience

### Planning evidence

#### What the model sees

Nothing directly. A later session-aware consumer must log selected `context` entries before serializing them into a model request.

#### Token effect

`context.usedTokens` is bounded by the caller-provided `contextBudgetTokens`; omitted evidence is listed in `context.omitted`.

#### KV Cache effect

None from this package. A later model consumer decides the request position for the logged context pack.

## Known Limitations and Deferred Work

- The returned outputs describe the selected evidence and model-source decision; a planning-board model consumer still owns PRD, architecture, and execution-plan generation.
- The approval requirement is an explicit result boundary, not a replacement for the Harness sandbox or approval-policy services that enforce writes.
- This package has no session events, assembled profile, tool, or model dispatch. A future model-visible consumer must add them with real-composition and snapshot coverage.
