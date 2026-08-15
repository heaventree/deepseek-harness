import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import LocalProjectMemory from '../src/index.ts'

async function withMemory<T>(
  path: string,
  operation: (memory: LocalProjectMemory, fs: LocalFileSystem) => Promise<T>,
  maxBytes = 4_096,
): Promise<T> {
  const ctx = new Context()
  await ctx.plugin(LocalFileSystem, { cwd: tmpdir() })
  await ctx.plugin(LocalProjectMemory, { path, maxBytes })
  try {
    return await operation(ctx.projectMemory as LocalProjectMemory, ctx.fs as LocalFileSystem)
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

  it('orders equivalent project-memory instants by time rather than timestamp spelling, then by id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory) => {
        await memory.put({
          id: 'z-same-instant',
          kind: 'decision',
          summary: 'ranking evidence',
          evidence: [],
          recordedAt: '2026-08-15T00:00:00.000Z',
        })
        await memory.put({
          id: 'a-same-instant',
          kind: 'decision',
          summary: 'ranking evidence',
          evidence: [],
          recordedAt: '2026-08-15T01:00:00.000+01:00',
        })
        await memory.put({
          id: 'newer-instant',
          kind: 'decision',
          summary: 'ranking evidence',
          evidence: [],
          recordedAt: '2026-08-15T00:30:00.000Z',
        })
        await expect(memory.search('ranking')).resolves.toMatchObject([
          { id: 'newer-instant' },
          { id: 'a-same-instant' },
          { id: 'z-same-instant' },
        ])
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

  it.each([
    ['invalid JSON', '{', 'must contain valid JSON'],
    ['a document without records', JSON.stringify({}), 'document.records must be an array'],
    ['a non-object record', JSON.stringify({ records: [null] }), 'records[0] must be an object'],
    ['a record without an identifier', JSON.stringify({ records: [{ id: '', kind: 'decision', summary: 'summary', evidence: [], recordedAt: '2026-08-15T00:00:00.000Z' }] }), 'records[0].id must be a non-empty string'],
    ['a record with an unsupported kind', JSON.stringify({ records: [{ id: 'record', kind: 'raw-transcript', summary: 'summary', evidence: [], recordedAt: '2026-08-15T00:00:00.000Z' }] }), 'records[0].kind is not supported'],
    ['a record without a distilled summary', JSON.stringify({ records: [{ id: 'record', kind: 'decision', summary: ' ', evidence: [], recordedAt: '2026-08-15T00:00:00.000Z' }] }), 'records[0].summary must be a non-empty string'],
    ['a record with non-text evidence', JSON.stringify({ records: [{ id: 'record', kind: 'decision', summary: 'summary', evidence: [42], recordedAt: '2026-08-15T00:00:00.000Z' }] }), 'records[0].evidence must be an array of strings'],
    ['a record with an invalid timestamp', JSON.stringify({ records: [{ id: 'record', kind: 'decision', summary: 'summary', evidence: [], recordedAt: 'not-a-time' }] }), 'records[0].recordedAt must be an ISO-8601 timestamp'],
  ])('rejects %s at the durable JSON boundary', async (_name, document, expected) => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await writeFile(path, `${document}\n`)
      await withMemory(path, async (memory) => {
        await expect(memory.search('record')).rejects.toThrow(expected)
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects invalid UTF-8 durable data before JSON parsing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await writeFile(path, Buffer.from([0xff]))
      await withMemory(path, async (memory) => {
        await expect(memory.search('anything')).rejects.toThrow('must be valid UTF-8 text')
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects a durable document with duplicate record ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    const record = {
      id: 'duplicate',
      kind: 'decision',
      summary: 'duplicate evidence',
      evidence: [],
      recordedAt: '2026-08-15T00:00:00.000Z',
    }
    try {
      await writeFile(path, `${JSON.stringify({ records: [record, record] })}\n`)
      await withMemory(path, async (memory) => {
        await expect(memory.search('duplicate')).rejects.toThrow('duplicate record id')
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('refuses to publish a document that exceeds its configured byte cap', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory) => {
        await expect(memory.put({
          id: 'oversized',
          kind: 'decision',
          summary: 'evidence '.repeat(30),
          evidence: [],
          recordedAt: '2026-08-15T00:00:00.000Z',
        })).rejects.toThrow('exceeds configured 100-byte limit')
      }, 100)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('refuses to read a durable document that exceeds its configured byte cap', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await writeFile(path, `${JSON.stringify({ records: [], padding: 'x'.repeat(128) })}\n`)
      await withMemory(path, async (memory) => {
        await expect(memory.search('anything')).rejects.toMatchObject({ code: 'FS_TOO_LARGE' })
      }, 100)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('replaces an existing record rather than retaining two versions of its id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory) => {
        await memory.put({ id: 'replace', kind: 'decision', summary: 'memory before replacement', evidence: [], recordedAt: '2026-08-15T00:00:00.000Z' })
        await memory.put({ id: 'replace', kind: 'decision', summary: 'memory after replacement', evidence: [], recordedAt: '2026-08-15T00:01:00.000Z' })
        await expect(memory.search('memory')).resolves.toEqual([{
          id: 'replace',
          kind: 'decision',
          summary: 'memory after replacement',
          evidence: [],
          recordedAt: '2026-08-15T00:01:00.000Z',
        }])
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects a write when another writer changes the document after this provider reads it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory, fs) => {
        await memory.put({ id: 'first', kind: 'decision', summary: 'race evidence', evidence: [], recordedAt: '2026-08-15T00:00:00.000Z' })
        const originalWrite = fs.writeText.bind(fs)
        fs.writeText = async (...args: Parameters<LocalFileSystem['writeText']>) => {
          await writeFile(path, `${JSON.stringify({ records: [] })}\n`)
          return originalWrite(...args)
        }
        await expect(memory.put({ id: 'second', kind: 'decision', summary: 'race evidence', evidence: [], recordedAt: '2026-08-15T00:01:00.000Z' }))
          .rejects.toMatchObject({ code: 'FS_STALE_VERSION' })
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('propagates an already-cancelled filesystem request', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    const controller = new AbortController()
    controller.abort()
    try {
      await withMemory(path, async (memory) => {
        await expect(memory.search('anything', controller.signal)).rejects.toMatchObject({ code: 'FS_ABORTED' })
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects blank planning queries after reading the configured project memory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    try {
      await withMemory(path, async (memory) => {
        await expect(memory.search(' \t ')).rejects.toThrow('query must include at least one non-whitespace term')
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('propagates cancellation before a project-memory write begins', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
    const path = join(root, 'memory.json')
    const controller = new AbortController()
    controller.abort()
    try {
      await withMemory(path, async (memory) => {
        await expect(memory.put({
          id: 'cancelled',
          kind: 'decision',
          summary: 'cancelled write',
          evidence: [],
          recordedAt: '2026-08-15T00:00:00.000Z',
        }, controller.signal)).rejects.toMatchObject({ code: 'FS_ABORTED' })
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects blank paths and non-integer document limits at construction', () => {
    expect(() => new LocalProjectMemory(new Context(), { path: ' ', maxBytes: 4_096 }))
      .toThrow('path must not be empty')
    expect(() => new LocalProjectMemory(new Context(), { path: 'memory.json', maxBytes: 1.5 }))
      .toThrow('maxBytes must be a positive safe integer')
    expect(() => new LocalProjectMemory(new Context(), { path: 'memory.json', maxBytes: 0 }))
      .toThrow('maxBytes must be a positive safe integer')
  })
})
