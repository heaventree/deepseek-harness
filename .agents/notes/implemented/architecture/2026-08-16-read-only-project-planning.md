# Agent Note: Read-only project planning preserves the approval boundary

Status: implemented

English | [中文](2026-08-16-read-only-project-planning.zh.md)

## Problem

Phase 1 needs a single planning operation that retrieves Git intake, distilled project memory, and optional external evidence without giving its caller a path to implementation writes or embedding Heaventree services in Harness.

## Decision

`@deepseek-ai/dsh-project-planning` is a read-only Consumer of the project-intake and project-memory Service Definitions. It reads one intake, retrieves matching local memory, accepts caller-provided local candidates, and invokes optional RepoHive, HT AI Brain, Niimo, and super-router adapters only through their typed interfaces. The package has no transport, credential, filesystem, shell, model, session, tool, or agent-loop dependency.

The consumer builds its compact context through `buildContextPack()` and chooses a later model source through `governTokens()`. Token estimates and remote-use permission remain caller inputs. It resolves a super-router route only after a model source is selected and never dispatches that route.

Every result declares `implementationApproval` as awaiting human approval for an implementation write. The package neither accepts an approval assertion nor composes an implementation consumer, so the later write path must establish its own human approval and enforcement through the Harness approval and sandbox capabilities.

## Alternatives considered

- **Add planning logic to `agent-loop`** — rejected because project planning is optional and the loop is not the owner of Git intake, memory retrieval, or deployment-specific evidence providers.
- **Connect RepoHive, HT AI Brain, Niimo, and super-router directly** — rejected because their credentials, transport, retries, and service availability belong to their providers.
- **Accept a Boolean approval flag** — rejected because a caller-controlled value cannot establish a human approval boundary for a later implementation write.

## Consequences

Planning results identify selected evidence, omitted evidence, observed worktree and model-route risks, and acceptance conditions without producing a model request or mutable repository state. The package has focused service tests and an explained empty invariant because it owns no published event stream or durable mutable relation. A later session-aware planning-board consumer must log model-visible context, assemble a real profile, and add snapshot coverage before it can present generated PRD or implementation content.
