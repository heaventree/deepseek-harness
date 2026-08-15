# @deepseek-ai/dsh-project-git-local

English | [中文](README.zh.md)

This package is the local Git Service Provider for `@deepseek-ai/dsh-project-foundations`. It acquires read-only project evidence through the configured `ctx.shell` executor and retains caller-created checkpoints in memory.

## Behavior

- `inspect()` runs fixed, read-only Git commands through `ctx.shell.resolve()` and `ctx.shell.run()` with the requested worktree as `workdir`.
- Intake records the current commit, checked-out branch when attached, configured remotes, local branches, and porcelain-status paths. It rejects a Git result with truncated output, a nonzero exit, cancellation, or a commit that changes during collection.
- HTTP remote URL userinfo is removed before it becomes planning evidence. The provider never starts background processes.
- `save()` and `get()` retain and return detached in-memory checkpoint copies. They do not create refs, commits, branches, tags, or files.

## Config

| Key | Default | Meaning |
| --- | ---: | --- |
| `timeoutMs` | `15000` | Per-command deadline passed to the shell executor. |
| `stdoutMaxBytes` | `256000` | Per-command standard-output limit; a truncated result is rejected. |

## Model Experience

### Project evidence

#### What the model sees

Nothing directly. A later approval-gated planning consumer decides whether to include the returned intake facts in a logged context pack.

#### Token effect

Zero until a consumer serializes selected Git facts into model-visible context.

#### KV Cache effect

None from this Service Provider. A consumer adds any selected facts after its reusable request prefix.

## Known Limitations and Deferred Work

- Checkpoints are process-local anchors, not durable Git refs or a rollback executor.
- This package supplies the Service Provider role only. The Phase 1 planning consumer owns approval gating, session logging, and any implementation write.
