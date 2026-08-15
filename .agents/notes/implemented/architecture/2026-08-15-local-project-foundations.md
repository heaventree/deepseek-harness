# Agent Note: Local project foundations remain deterministic and external-system-neutral

Status: implemented

English | [中文](2026-08-15-local-project-foundations.zh.md)

## Problem

Phase 1 needs Git-aware project intake, bounded context selection, model-tier decisions, project memory, external intelligence, and verification checkpoints. Directly adding them to the agent loop would couple acquisition to one executor, merge external Heaventree systems into Harness, and make deterministic preparation indistinguishable from model dispatch.

## Decision

`@deepseek-ai/dsh-project-foundations` owns side-effect-free vocabulary and deterministic decisions. It retains caller-collected Git evidence, creates checkpoints only from an observed branch and commit, selects bounded context, applies the Phase 1 source priority order, and maps changed paths to verification and specialist triggers.

Project-memory storage and RepoHive, HT AI Brain, Niimo, and super-router integrations are interfaces. Their providers own credentials, HTTP, retries, persistence, and deployment policy. LM Studio remains a configured route of the existing pi-ai adapter rather than receiving a parallel provider.

## Alternatives considered

- **Add behavior to `agent-loop`** — rejected because repository acquisition and planning are optional capabilities, and the architecture requires plugins rather than loop changes.
- **Embed external clients** — rejected because every system has an ownership boundary and deployment-specific credentials.
- **Create an LM Studio adapter** — rejected because the existing pi-ai adapter supports hand-declared OpenAI-compatible endpoints.

## Consequences

Later providers can execute Git through the shell seam and persist memory through a local store without changing planning decisions. A later Cordis consumer must log model-visible context through session events and provide assembled composition coverage before becoming a shipped capability.
