/**
 * Local Git Service Provider for project intake. Every Git observation travels
 * through `ctx.shell`; this package never spawns a process or opens a worktree
 * directly. Checkpoints are retained in memory as immutable rollback anchors,
 * not Git refs or worktree mutations.
 * @module @deepseek-ai/dsh-project-git-local
 */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { createProjectIntake, ProjectIntakeService } from '@deepseek-ai/dsh-project-foundations'
import type { GitEvidence, ProjectCheckpoint, ProjectIntake, ProjectIntakeRequest } from '@deepseek-ai/dsh-project-foundations'
import type { ShellRunResult } from '@deepseek-ai/dsh-shell'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'project-git-local'

/** The shell executor owns all process execution for this provider. */
export const inject = ['shell']

/** Plugin configuration for bounded read-only Git observations. */
export interface Config {
  /** Maximum duration allowed for one Git command. */
  timeoutMs?: number
  /** Maximum bytes retained from each Git command's standard output. */
  stdoutMaxBytes?: number
}

/** Schemas and defaults for {@link Config}. */
export const Config: z<Config> = z.object({
  timeoutMs: z.number().default(15_000),
  stdoutMaxBytes: z.number().default(256_000),
})

type ResolvedConfig = Required<Config>

/** Reject an unusable numeric command limit at the provider's configuration boundary. */
function assertPositiveSafeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`project-git-local: ${name} must be a positive safe integer`)
  }
}

/** Copy a checkpoint without leaking store-owned arrays or object references. */
function copyCheckpoint(checkpoint: ProjectCheckpoint): ProjectCheckpoint {
  return { ...checkpoint }
}

/** Normalize one line-oriented Git command result, rejecting incomplete observations. */
function outputOf(command: string, result: ShellRunResult): string {
  if (result.stdout.truncated || result.stderr.truncated) {
    throw new Error(`project-git-local: ${command} exceeded its configured output limit`)
  }
  if (result.exitCode !== 0 || result.signal !== null || result.timedOut || result.aborted) {
    const detail = result.stderr.text.trim() || result.stdout.text.trim() || 'no diagnostic output'
    throw new Error(`project-git-local: ${command} failed: ${detail}`)
  }
  return result.stdout.text
}

/** Remove HTTP URL userinfo before it can become planning evidence. */
function redactRemoteUrl(url: string): string {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1')
}

/**
 * Parse `git remote -v`, deduplicating fetch/push rows for one remote URL.
 * @param output - Complete standard output from `git remote -v`.
 * @returns Sorted, redacted remote evidence.
 */
export function parseRemotes(output: string): GitEvidence['remotes'] {
  const remotes = new Map<string, { name: string, url: string }>()
  for (const line of output.split(/\r?\n/)) {
    if (line === '') continue
    const match = /^(\S+)\s+(.+)\s+\((?:fetch|push)\)$/.exec(line)
    if (match === null) throw new Error(`project-git-local: unparseable git remote output: ${JSON.stringify(line)}`)
    const name = match[1]!
    const url = redactRemoteUrl(match[2]!)
    remotes.set(`${name}\u0000${url}`, { name, url })
  }
  return [...remotes.values()].sort((left, right) => left.name.localeCompare(right.name) || left.url.localeCompare(right.url))
}

/**
 * Parse NUL-delimited porcelain v1 paths, preserving renamed destinations only.
 * @param output - Complete standard output from `git status --porcelain=v1 -z`.
 * @returns Sorted changed paths without rename or copy source duplicates.
 */
export function parseChangedPaths(output: string): readonly string[] {
  const records = output.split('\0')
  const paths = new Set<string>()
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!
    if (record === '') continue
    if (record.length < 4 || record[2] !== ' ') {
      throw new Error(`project-git-local: unparseable git status output: ${JSON.stringify(record)}`)
    }
    const status = record.slice(0, 2)
    const path = record.slice(3)
    if (path === '') throw new Error('project-git-local: git status reported an empty path')
    paths.add(path)
    if (status.includes('R') || status.includes('C')) {
      index += 1
      if (records[index] === undefined || records[index] === '') {
        throw new Error('project-git-local: git status omitted the original renamed or copied path')
      }
    }
  }
  return [...paths].sort((left, right) => left.localeCompare(right))
}

/** Parse non-empty line-delimited Git ref names into deterministic order. */
function parseBranches(output: string): readonly string[] {
  return [...new Set(output.split(/\r?\n/).filter(branch => branch !== ''))]
    .sort((left, right) => left.localeCompare(right))
}

/**
 * Local Git project-intake Service Provider. It performs only fixed read-only
 * Git commands through the configured shell executor. A checkpoint is an
 * in-memory copy of a caller-created Git anchor, so this provider never writes
 * refs, commits, branches, or a worktree.
 */
export class LocalGitProjectIntake extends ProjectIntakeService {
  static inject = ['shell']
  static Config = Config

  private readonly config: ResolvedConfig
  private readonly checkpoints = new Map<string, ProjectCheckpoint>()

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.config = config as ResolvedConfig
    assertPositiveSafeInteger('timeoutMs', this.config.timeoutMs)
    assertPositiveSafeInteger('stdoutMaxBytes', this.config.stdoutMaxBytes)
  }

  /**
   * Collect a consistent Git intake from `request.root` through `ctx.shell`.
   * @param request - The local worktree root and optional cancellation signal.
   * @returns A detached local-repository intake record.
   */
  async inspect(request: ProjectIntakeRequest): Promise<ProjectIntake> {
    if (request.root.trim() === '') throw new Error('project-git-local: root must not be empty')
    const [root, firstHead] = await Promise.all([
      this.git(request, 'git rev-parse --show-toplevel'),
      this.git(request, 'git rev-parse HEAD'),
    ])
    const [branch, remotes, branches, status] = await Promise.all([
      this.git(request, 'git branch --show-current'),
      this.git(request, 'git remote -v'),
      this.git(request, 'git branch --format="%(refname:short)"'),
      this.git(request, 'git status --porcelain=v1 -z'),
    ])
    const lastHead = (await this.git(request, 'git rev-parse HEAD')).trim()
    const observedRoot = root.trim()
    if (observedRoot === '' || firstHead.trim() === '' || firstHead.trim() !== lastHead) {
      throw new Error('project-git-local: repository changed while collecting intake')
    }
    const observedBranch = branch.trim()
    return createProjectIntake({
      source: 'local-repository',
      root: observedRoot,
      git: {
        ...observedBranch === '' ? {} : { branch: observedBranch },
        head: firstHead.trim(),
        remotes: parseRemotes(remotes),
        changedPaths: parseChangedPaths(status),
        branches: parseBranches(branches),
      },
    })
  }

  /**
   * Retain a detached checkpoint without creating a Git ref or modifying a worktree.
   * @param checkpoint - The caller-created checkpoint to retain.
   * @returns A promise that resolves after the retained copy replaces any prior id.
   */
  async save(checkpoint: ProjectCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, copyCheckpoint(checkpoint))
  }

  /**
   * Read a detached checkpoint retained by {@link save}.
   * @param id - The checkpoint identifier.
   * @returns A detached checkpoint or `undefined` when no checkpoint is retained.
   */
  async get(id: string): Promise<ProjectCheckpoint | undefined> {
    const checkpoint = this.checkpoints.get(id)
    return checkpoint === undefined ? undefined : copyCheckpoint(checkpoint)
  }

  /** Run one fixed, read-only Git command through the shell Service Definition. */
  private async git(request: ProjectIntakeRequest, command: string): Promise<string> {
    const spec = this.ctx.shell.resolve({
      command,
      workdir: request.root,
      timeoutMs: this.config.timeoutMs,
      stdoutMaxBytes: this.config.stdoutMaxBytes,
      ...request.signal === undefined ? {} : { signal: request.signal },
    })
    return outputOf(command, await this.ctx.shell.run(spec))
  }
}

export default LocalGitProjectIntake
