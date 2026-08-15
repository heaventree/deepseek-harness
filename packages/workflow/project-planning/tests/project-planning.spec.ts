import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import ProjectPlanning from '../src/index.ts'
import type { ProjectIntake, ProjectMemoryRecord } from '@deepseek-ai/dsh-project-foundations'

const intake: ProjectIntake = {
  source: 'local-repository',
  root: '/repo',
  git: {
    branch: 'agent/plan',
    head: 'abc123',
    remotes: [{ name: 'origin', url: 'https://example.test/repo.git' }],
    changedPaths: ['src/auth.ts'],
    branches: ['agent/plan', 'main'],
  },
}

const memory: ProjectMemoryRecord = {
  id: 'local-first',
  kind: 'decision',
  summary: 'Use local evidence before remote routing.',
  evidence: ['docs/phase-1-local-mvp.md'],
  recordedAt: '2026-08-16T00:00:00.000Z',
}

function planner(): { planner: ProjectPlanning, inspect: ReturnType<typeof vi.fn>, search: ReturnType<typeof vi.fn> } {
  const ctx = new Context()
  const inspect = vi.fn(async () => intake)
  const search = vi.fn(async () => [memory])
  ctx.provide('projectIntake', { inspect } as never)
  ctx.provide('projectMemory', { search } as never)
  return { planner: new ProjectPlanning(ctx), inspect, search }
}

function request(): Parameters<ProjectPlanning['plan']>[0] {
  return {
    taskId: 'task-local-plan',
    task: 'Plan a local-first project intake.',
    root: '/repo',
    taskTokenEstimate: 4,
    contextBudgetTokens: 24,
    evidenceTokenEstimates: { intake: 5, projectMemory: 5, htAiBrain: 5, niimoSkills: 5 },
    availableKnowledge: ['project-memory'],
    risk: 'moderate',
    allowRemote: false,
    maxContextTokens: 16,
    maxOutputTokens: 8,
  }
}

describe('ProjectPlanning', () => {
  it('combines one intake, local memory, and optional thin-adapter evidence into bounded read-only planning output', async () => {
    const { planner: service, inspect, search } = planner()
    const repoHive = vi.fn(async () => [{ id: 'repohive-pattern', kind: 'external-evidence' as const, relevance: 9, tokenEstimate: 4, content: 'Comparable implementation.' }])
    const htAiBrain = vi.fn(async () => [{ ...memory, id: 'organisation-policy' }])
    const niimo = vi.fn(async () => ['sanitise-diff'])

    const result = await service.plan({
      ...request(),
      adapters: {
        repoHive: { search: repoHive },
        htAiBrain: { search: htAiBrain, promote: vi.fn() },
        niimo: { findSkills: niimo },
      },
    })

    expect(inspect).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('Plan a local-first project intake.', undefined)
    expect(repoHive).toHaveBeenCalledWith(intake, 'Plan a local-first project intake.', undefined)
    expect(htAiBrain).toHaveBeenCalledTimes(1)
    expect(niimo).toHaveBeenCalledTimes(1)
    expect(result.context.usedTokens).toBeLessThanOrEqual(24)
    expect(result.externalEvidence.repoHive.map(candidate => candidate.id)).toEqual(['repohive-pattern'])
    expect(result.outputs.evidenceIds).toContain('task-local-plan')
    expect(result.risks).toContainEqual({ kind: 'uncommitted-changes', summary: 'The inspected worktree has uncommitted paths.' })
    expect(result.implementationApproval).toEqual({ status: 'awaiting-human-approval', operation: 'implementation-write' })
  })

  it('resolves an optional route only for a later model decision and never dispatches the model', async () => {
    const { planner: service } = planner()
    const route = vi.fn(async () => 'lm-studio')

    const result = await service.plan({
      ...request(),
      availableKnowledge: ['local-llm'],
      adapters: { superRouter: { resolveRoute: route } },
    })

    expect(route).toHaveBeenCalledWith('local', undefined)
    expect(result.governor).toMatchObject({ source: 'local-llm', requiresModel: true, maxContextTokens: 16, maxOutputTokens: 8 })
    expect(result.outputs.route).toBe('lm-studio')
    expect(result.risks).toContainEqual({ kind: 'model-route', summary: 'A later planning model call requires the selected bounded route and budgets.' })
  })

  it('does not call absent external adapters and fails before an over-budget required task can become a planning result', async () => {
    const { planner: service } = planner()

    await expect(service.plan({ ...request(), taskTokenEstimate: 25 })).rejects.toThrow('required candidate task-local-plan exceeds the context budget')
  })
})
