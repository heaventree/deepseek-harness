import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ShellExecutor } from '@deepseek-ai/dsh-shell'
import type { ShellExecRequest, ShellExecSpec, ShellProcess, ShellRunResult } from '@deepseek-ai/dsh-shell'
import LocalGitProjectIntake, { parseChangedPaths, parseRemotes } from '@deepseek-ai/dsh-project-git-local'

function result(stdout: string, overrides: Partial<ShellRunResult> = {}): ShellRunResult {
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    aborted: false,
    timeoutMs: 15_000,
    stdout: { text: stdout, truncated: false },
    stderr: { text: '', truncated: false },
    ...overrides,
  }
}

/** Scriptable shell seam fake; the provider must use its resolved foreground path only. */
class FakeShell extends ShellExecutor {
  readonly specs: ShellExecSpec[] = []
  readonly responses = new Map<string, ShellRunResult>()

  resolve(request: ShellExecRequest): ShellExecSpec {
    return {
      command: request.command,
      workdir: request.workdir ?? '/default',
      timeoutMs: request.timeoutMs ?? 15_000,
      stdoutMaxBytes: request.stdoutMaxBytes ?? 256_000,
      ...request.signal === undefined ? {} : { signal: request.signal },
      sandboxPolicy: request.sandboxPolicy,
    }
  }

  async run(spec: ShellExecSpec): Promise<ShellRunResult> {
    this.specs.push(spec)
    return this.responses.get(spec.command) ?? result('')
  }

  start(): ShellProcess {
    throw new Error('project-git-local must not start a background process')
  }
}

async function setup(): Promise<{ intake: LocalGitProjectIntake; shell: FakeShell }> {
  const ctx = new Context()
  await ctx.plugin(FakeShell)
  await ctx.plugin(LocalGitProjectIntake, { timeoutMs: 500, stdoutMaxBytes: 4096 })
  return { intake: ctx.projectIntake as LocalGitProjectIntake, shell: ctx.shell as FakeShell }
}

describe('project-git-local parsing', () => {
  it('deduplicates fetch and push remotes and removes HTTP userinfo', () => {
    expect(parseRemotes(
      'origin\thttps://token@example.test/acme/repo.git (fetch)\n'
      + 'origin\thttps://token@example.test/acme/repo.git (push)\n'
      + 'upstream\tgit@example.test:platform/repo.git (fetch)\n',
    )).toEqual([
      { name: 'origin', url: 'https://example.test/acme/repo.git' },
      { name: 'upstream', url: 'git@example.test:platform/repo.git' },
    ])
  })

  it('retains the destination but not the extra source record for a rename', () => {
    expect(parseChangedPaths(' M src/a.ts\0R  src/new.ts\0src/old.ts\0?? untracked.txt\0'))
      .toEqual(['src/a.ts', 'src/new.ts', 'untracked.txt'])
  })
})

describe('LocalGitProjectIntake', () => {
  it('collects local Git evidence through bounded read-only shell commands', async () => {
    const { intake, shell } = await setup()
    shell.responses.set('git rev-parse --show-toplevel', result('/repo\n'))
    shell.responses.set('git rev-parse HEAD', result('abc123\n'))
    shell.responses.set('git branch --show-current', result('agent/phase-1\n'))
    shell.responses.set('git remote -v', result('origin\thttps://example.test/repo.git (fetch)\norigin\thttps://example.test/repo.git (push)\n'))
    shell.responses.set('git branch --all --format="%(refname:short)"', result('main\nagent/phase-1\norigin/main\norigin/phase-1\n'))
    shell.responses.set('git status --porcelain=v1 -z', result(' M src/a.ts\0?? notes.md\0'))

    await expect(intake.inspect({ root: '/repo/packages/leaf' })).resolves.toEqual({
      source: 'local-repository',
      root: '/repo',
      git: {
        branch: 'agent/phase-1',
        head: 'abc123',
        remotes: [{ name: 'origin', url: 'https://example.test/repo.git' }],
        branches: ['agent/phase-1', 'main', 'origin/main', 'origin/phase-1'],
        changedPaths: ['notes.md', 'src/a.ts'],
      },
    })
    expect(shell.specs).toHaveLength(7)
    for (const spec of shell.specs) {
      expect(spec.workdir).toBe('/repo/packages/leaf')
      expect(spec.timeoutMs).toBe(500)
      expect(spec.stdoutMaxBytes).toBe(4096)
      expect(spec.command).toMatch(/^git (rev-parse --show-toplevel|rev-parse HEAD|branch --show-current|remote -v|branch --all --format="%\(refname:short\)"|status --porcelain=v1 -z)$/)
    }
  })

  it('refuses output that cannot be trusted as complete Git evidence', async () => {
    const { intake, shell } = await setup()
    shell.responses.set('git rev-parse --show-toplevel', result('/repo\n'))
    shell.responses.set('git rev-parse HEAD', result('abc123\n', { stdout: { text: 'abc123\n', truncated: true } }))
    await expect(intake.inspect({ root: '/repo' })).rejects.toThrow('exceeded its configured output limit')
  })

  it('retains immutable local checkpoint copies without changing Git state', async () => {
    const { intake, shell } = await setup()
    const checkpoint = { id: 'before-plan', startingCommit: 'abc123', branch: 'main', createdAt: '2026-08-15T00:00:00.000Z' }
    await intake.save(checkpoint)
    checkpoint.branch = 'mutated'
    const recovered = await intake.get('before-plan')
    expect(recovered).toEqual({ ...checkpoint, branch: 'main' })
    if (recovered === undefined) throw new Error('missing retained checkpoint')
    recovered.branch = 'changed-copy'
    await expect(intake.get('before-plan')).resolves.toMatchObject({ branch: 'main' })
    expect(shell.specs).toHaveLength(0)
  })
})
