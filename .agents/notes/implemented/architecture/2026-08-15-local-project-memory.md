# Agent Note: Local project memory stays distilled and filesystem-mediated

Status: implemented

English | [中文](2026-08-15-local-project-memory.zh.md)

## Problem

Phase 1 planning needs durable project facts and decision retrieval without mixing raw model transcripts, external-system responses, or direct host filesystem access into the Harness core.

## Decision

`ProjectMemoryService` is the project-memory Service Definition. `@deepseek-ai/dsh-project-memory-local` provides it with one local JSON document through `ctx.fs`. It accepts and returns detached `ProjectMemoryRecord` values only; records contain a caller-owned identifier, classified distilled summary, supporting evidence, and timestamp. Search requires concrete terms, matches them across retained planning evidence, and orders results by newest timestamp then identifier.

The local provider reads the complete document through the configured byte limit, validates UTF-8 and every durable record, and uses guarded atomic replacement on writes. Invalid durable data and writer races fail loudly. There is no session event, model injection, tool registration, external-service call, Git operation, or implementation write in the provider.

## Consequences

Project memory is available to the approval-gated planning path without coupling it to a database, a cloud service, or a particular host filesystem API. The provider can be swapped for RepoHive, HT AI Brain, or another store because consumers use the Service Definition. Raw transcripts remain outside durable project memory, and a concurrent local writer must retry from a fresh read rather than silently overwriting another record.

## Alternatives considered

- **Direct `node:fs` persistence** — bypasses the Harness filesystem execution world and prevents sandboxed or remote filesystem providers from owning project-memory I/O.
- **Session-log storage** — would make every retained project fact model-visible durability and tie cross-task memory to one session's lifecycle before a consumer needs that coupling.
- **Immediate RepoHive or HT AI Brain integration** — would make Phase 1 local planning depend on external availability and duplicate those systems' transport and credentials responsibilities.
