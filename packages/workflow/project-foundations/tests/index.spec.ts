import { describe, expect, it } from 'vitest'
import { buildContextPack, createProjectCheckpoint, createProjectIntake, governTokens, planVerification } from '../src/index.ts'

describe('project foundations', () => {
  it('copies Git evidence without retaining caller-owned arrays', () => {
    const remotes = [{ name: 'origin', url: 'https://example.test/repo.git' }]
    const intake = createProjectIntake({ source: 'local-repository', root: '/repo', git: { remotes, changedPaths: ['a.ts'], branches: ['main'] } })
    remotes[0].url = 'https://example.test/changed.git'
    expect(intake.git.remotes[0]).toEqual({ name: 'origin', url: 'https://example.test/repo.git' })
  })

  it('selects compact relevant context and reports over-budget items', () => {
    const pack = buildContextPack('task-1', 10, [
      { id: 'large', kind: 'file', relevance: 9, tokenEstimate: 11, content: 'large' },
      { id: 'task', kind: 'task', relevance: 1, tokenEstimate: 3, content: 'task' },
      { id: 'decision', kind: 'decision', relevance: 8, tokenEstimate: 7, content: 'decision' },
    ])
    expect(pack.usedTokens).toBe(10)
    expect(pack.selected.map((candidate) => candidate.id)).toEqual(['task', 'decision'])
    expect(pack.selected[0].reason).toBe('required')
    expect(pack.omitted).toEqual(['large'])
  })

  it('uses deterministic evidence before a model and escalates high-risk remote work', () => {
    expect(governTokens({ available: ['local-search', 'tier-a-remote'], risk: 'high', allowRemote: true, maxContextTokens: 100, maxOutputTokens: 10 })).toEqual({ source: 'local-search', requiresModel: false })
    expect(governTokens({ available: ['tier-b-remote', 'tier-a-remote'], risk: 'high', allowRemote: true, maxContextTokens: 100, maxOutputTokens: 10 }).source).toBe('tier-a-remote')
  })

  it('refuses checkpoints without an observed safe branch and commit', () => {
    expect(() => createProjectCheckpoint('cp-1', { remotes: [], changedPaths: [], branches: [] }, '2026-08-15T00:00:00.000Z')).toThrow('requires an observed branch')
    expect(createProjectCheckpoint('cp-1', { branch: 'agent/task', head: 'abc123', remotes: [], changedPaths: [], branches: [] }, '2026-08-15T00:00:00.000Z')).toMatchObject({ startingCommit: 'abc123', branch: 'agent/task' })
  })

  it('triggers specialists only for changed-path risks', () => {
    expect(planVerification(['src/auth/token.ts', 'db/migrations/001.sql', 'apps/web/Button.tsx', 'package.json'])).toMatchObject({ specialists: ['accessibility', 'database', 'dependency', 'security'] })
    expect(planVerification(['src/index.ts']).specialists).toEqual([])
  })
})
