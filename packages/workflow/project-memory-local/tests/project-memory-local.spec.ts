import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import LocalProjectMemory from '../src/index.ts'

async function withMemory<T>(path: string, operation: (memory: LocalProjectMemory) => Promise<T>): Promise<T> {
  const ctx = new Context()
  await ctx.plugin(LocalFileSystem, { cwd: tmpdir() })
  await ctx.plugin(LocalProjectMemory, { path, maxBytes: 4_096 })
  try {
    return await operation(ctx.projectMemory as LocalProjectMemory)
  } finally {
    await ctx.fiber.dispose()
  }
}

describe('LocalProjectMemory', () => {
  it('persists a detached distilled record and restores it through a fresh filesystem-backed service', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    const record = {
      id: 'decision-local-first',
      kind: 'decision' as const,
      summary: 'Use the local evidence path before remote routing.',
      evidence: ['docs/architecture.md', 'ADR-001'],
      recordedAt: '2026-08-15T10:00:00.000Z',
    }
    try {
      await withMemory(path, async (memory) => {
        await memory.put(record)
        record.summary = 'mutated after persistence'
      })
      await withMemory(path, async (memory) => {
        await expect(memory.search('local evidence')).resolves.toEqual([{
          id: 'decision-local-first',
          kind: 'decision',
          summary: 'Use the local evidence path before remote routing.',
          evidence: ['docs/architecture.md', 'ADR-001'],
          recordedAt: '2026-08-15T10:00:00.000Z',
        }])
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('retrieves relevant decisions without admitting unrelated project records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory) => {
        await memory.put({
          id: 'decision-token-budget',
          kind: 'decision',
          summary: 'Keep local model context below the configured token budget.',
          evidence: ['packages/workflow/project-foundations/src/index.ts'],
          recordedAt: '2026-08-15T10:00:00.000Z',
        })
        await memory.put({
          id: 'convention-docs',
          kind: 'convention',
          summary: 'Maintain English and Chinese package documentation together.',
          evidence: ['docs/i18n/README.md'],
          recordedAt: '2026-08-15T10:01:00.000Z',
        })
        await expect(memory.search('token budget')).resolves.toEqual([{
          id: 'decision-token-budget',
          kind: 'decision',
          summary: 'Keep local model context below the configured token budget.',
          evidence: ['packages/workflow/project-foundations/src/index.ts'],
          recordedAt: '2026-08-15T10:00:00.000Z',
        }])
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects malformed durable data instead of treating it as an empty project memory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await writeFile(path, '[]\n')
      await withMemory(path, async (memory) => {
        await expect(memory.search('anything')).rejects.toThrow('must be an object')
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
