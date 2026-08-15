/** Local JSON Service Provider for durable, distilled project memory through `ctx.fs`. @module @deepseek-ai/dsh-project-memory-local */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ProjectMemoryService } from '@deepseek-ai/dsh-project-foundations'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type { ProjectMemoryRecord } from '@deepseek-ai/dsh-project-foundations'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'project-memory-local'

/** The configured filesystem provider owns durable reads and atomic publication. */
export const inject = ['fs']

/** Configuration for one local project-memory document. */
export interface Config {
  /** JSON document path; the filesystem provider resolves it in its execution world. */
  path: string
  /** Inclusive byte cap for the complete durable document. */
  maxBytes: number
}

/** Runtime schema for {@link Config}. */
export const Config: z<Config> = z.object({
  path: z.string().required(),
  maxBytes: z.number().required(),
})

/** Durable JSON document persisted by this provider. */
interface ProjectMemoryDocument {
  records: ProjectMemoryRecord[]
}

type ResolvedConfig = Config

const RECORD_KINDS = new Set<ProjectMemoryRecord['kind']>([
  'decision',
  'convention',
  'dependency',
  'known-issue',
  'important-file',
  'verification',
  'task-summary',
])

/** Clone one record so callers never mutate retained or returned provider state. */
function copyRecord(record: ProjectMemoryRecord): ProjectMemoryRecord {
  return { ...record, evidence: [...record.evidence] }
}

/** Reject a configured document bound that cannot cap a whole durable file. */
function assertMaxBytes(maxBytes: number): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('project-memory-local: maxBytes must be a positive safe integer')
  }
}

/** Return a record after validating every field obtained from the durable JSON boundary. */
function parseRecord(value: unknown, index: number): ProjectMemoryRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`project-memory-local: records[${index}] must be an object`)
  }
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    throw new TypeError(`project-memory-local: records[${index}].id must be a non-empty string`)
  }
  if (typeof record.kind !== 'string' || !RECORD_KINDS.has(record.kind as ProjectMemoryRecord['kind'])) {
    throw new TypeError(`project-memory-local: records[${index}].kind is not supported`)
  }
  if (typeof record.summary !== 'string' || record.summary.trim() === '') {
    throw new TypeError(`project-memory-local: records[${index}].summary must be a non-empty string`)
  }
  if (!Array.isArray(record.evidence) || !record.evidence.every(item => typeof item === 'string')) {
    throw new TypeError(`project-memory-local: records[${index}].evidence must be an array of strings`)
  }
  if (typeof record.recordedAt !== 'string' || Number.isNaN(Date.parse(record.recordedAt))) {
    throw new TypeError(`project-memory-local: records[${index}].recordedAt must be an ISO-8601 timestamp`)
  }
  return {
    id: record.id,
    kind: record.kind as ProjectMemoryRecord['kind'],
    summary: record.summary,
    evidence: [...record.evidence],
    recordedAt: record.recordedAt,
  }
}

/** Parse and validate the complete durable document; malformed memory is never silently discarded. */
function parseDocument(text: string): ProjectMemoryDocument {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new TypeError('project-memory-local: document must contain valid JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('project-memory-local: document must be an object')
  }
  const document = value as Record<string, unknown>
  if (!Array.isArray(document.records)) {
    throw new TypeError('project-memory-local: document.records must be an array')
  }
  const records = document.records.map((record, index) => parseRecord(record, index))
  const ids = new Set<string>()
  for (const record of records) {
    if (ids.has(record.id)) throw new TypeError(`project-memory-local: document contains duplicate record id ${JSON.stringify(record.id)}`)
    ids.add(record.id)
  }
  return { records }
}

/** Deterministically render records for a human-inspectable local document. */
function renderDocument(document: ProjectMemoryDocument): string {
  return `${JSON.stringify({ records: document.records.map(copyRecord) }, null, 2)}\n`
}

/** Normalize a caller query into concrete case-insensitive retrieval terms. */
function queryTerms(query: string): readonly string[] {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(term => term !== '')
  if (terms.length === 0) throw new Error('project-memory-local: query must include at least one non-whitespace term')
  return terms
}

/** Whether every query term occurs in this record's retained planning evidence. */
function matches(record: ProjectMemoryRecord, terms: readonly string[]): boolean {
  const haystack = [record.id, record.kind, record.summary, ...record.evidence].join('\n').toLocaleLowerCase()
  return terms.every(term => haystack.includes(term))
}

/** Sort returned records newest first, with id as a deterministic tie-breaker. */
function compareRecords(left: ProjectMemoryRecord, right: ProjectMemoryRecord): number {
  return right.recordedAt.localeCompare(left.recordedAt) || left.id.localeCompare(right.id)
}

/**
 * Filesystem-backed project-memory Service Provider. It persists only distilled
 * JSON records through `ctx.fs`; model transcripts, RepoHive results, and
 * external-service credentials remain outside this provider.
 */
export class LocalProjectMemory extends ProjectMemoryService {
  static inject = ['fs']
  static Config = Config

  private readonly config: ResolvedConfig

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.config = config
    if (this.config.path.trim() === '') throw new Error('project-memory-local: path must not be empty')
    assertMaxBytes(this.config.maxBytes)
  }

  /**
   * Return detached records whose id, kind, summary, or evidence contains all query terms.
   * @param query - One or more case-insensitive planning terms.
   * @param signal - Cancels the bounded filesystem read.
   * @returns Matching records ordered by newest timestamp then identifier.
   */
  async search(query: string, signal?: AbortSignal): Promise<readonly ProjectMemoryRecord[]> {
    const document = await this.read(signal)
    const terms = queryTerms(query)
    return document.records.filter(record => matches(record, terms)).sort(compareRecords).map(copyRecord)
  }

  /**
   * Atomically insert or replace one record by identifier.
   * @param record - An already-distilled project fact supplied by a typed caller.
   * @param signal - Cancels before the guarded filesystem write publishes.
   * @returns A promise that resolves after the full document is atomically published.
   */
  async put(record: ProjectMemoryRecord, signal?: AbortSignal): Promise<void> {
    const target = await this.ctx.fs.resolve(this.config.path, signal === undefined ? {} : { signal })
    const existing = await this.ctx.fs.stat(target, signal)
    const document = existing === undefined ? { records: [] } : await this.readResolved(target, signal)
    const next = copyRecord(record)
    const index = document.records.findIndex(candidate => candidate.id === next.id)
    if (index === -1) document.records.push(next)
    else document.records[index] = next
    const content = renderDocument(document)
    if (Buffer.byteLength(content, 'utf8') > this.config.maxBytes) {
      throw new RangeError(`project-memory-local: document exceeds configured ${this.config.maxBytes}-byte limit`)
    }
    await this.ctx.fs.writeText(
      target,
      content,
      existing === undefined ? { kind: 'createIfAbsent' } : { kind: 'replaceIfVersion', version: existing.version },
      signal,
    )
  }

  /** Read an absent document as empty or validate the complete bounded durable document. */
  private async read(signal?: AbortSignal): Promise<ProjectMemoryDocument> {
    const target = await this.ctx.fs.resolve(this.config.path, signal === undefined ? {} : { signal })
    if (await this.ctx.fs.stat(target, signal) === undefined) return { records: [] }
    return this.readResolved(target, signal)
  }

  /** Decode bytes through the filesystem seam before parsing durable JSON. */
  private async readResolved(target: FsTarget, signal?: AbortSignal): Promise<ProjectMemoryDocument> {
    const bytes = await this.ctx.fs.readBytes(target, signal, this.config.maxBytes)
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new TypeError('project-memory-local: document must be valid UTF-8 text')
    }
    return parseDocument(text)
  }
}

export default LocalProjectMemory
