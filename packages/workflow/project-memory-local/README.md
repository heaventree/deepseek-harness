# @deepseek-ai/dsh-project-memory-local

English | [中文](README.zh.md)

This package is the local project-memory Service Provider for `@deepseek-ai/dsh-project-foundations`. It stores already-distilled `ProjectMemoryRecord` entries in one bounded JSON document through the configured `ctx.fs` provider.

## Behavior

- `put()` atomically inserts or replaces a record by its caller-owned identifier. It retains a detached copy and never stores model transcripts, external-adapter responses, credentials, or implementation-write instructions.
- `search()` matches every case-insensitive query term against a record's identifier, kind, summary, and evidence. It returns detached matches ordered by newest timestamp, then identifier; decision records use the same retrieval path.
- An absent document reads as empty. Invalid UTF-8, malformed JSON, duplicated identifiers, unsupported record kinds, and over-limit input fail loudly instead of being ignored.
- The provider reads and writes only through `ctx.fs`, including its configured byte cap and guarded atomic publication. It neither accesses host filesystem APIs nor changes a project worktree.

## Config

| Key | Meaning |
| --- | --- |
| `path` | Project-memory JSON document resolved by the selected filesystem provider. |
| `maxBytes` | Inclusive cap for the complete JSON document. |

## Model Experience

### Project memory

#### What the model sees

Nothing directly. An approval-gated planning consumer decides which returned distilled records enter a logged context pack.

#### Token effect

Zero until a consumer serializes selected records into model-visible context.

#### KV Cache effect

None from this Service Provider. A consumer adds selected records after its reusable request prefix.

## Known Limitations and Deferred Work

- The document uses optimistic guarded replacement. Concurrent writers receive the filesystem provider's stale-write error rather than silently merging records.
- This package supplies the Service Provider role only. The Phase 1 planning consumer owns retrieval policy, approval gating, session logging, external promotion, and every implementation write.
