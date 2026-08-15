/** Read-only planning orchestration over project evidence. @module @deepseek-ai/dsh-project-planning */

import { Context, Service } from '@deepseek-ai/cordis'
import { buildContextPack, governTokens } from '@deepseek-ai/dsh-project-foundations'
import type {
  ContextCandidate,
  ContextPack,
  HtAiBrainAdapter,
  KnowledgeSource,
  NiimoAdapter,
  ProjectIntake,
  ProjectMemoryRecord,
  RepoHiveAdapter,
  SuperRouterAdapter,
  TaskRisk,
  TokenGovernorDecision,
} from '@deepseek-ai/dsh-project-foundations'

declare module '@deepseek-ai/cordis' {
  interface Context {
    projectPlanning: ProjectPlanning
  }
}

/** Cordis plugin name used by loader diagnostics. */
export const name = 'project-planning'

/** The intake and memory Service Definitions supply all local project evidence. */
export const inject = ['projectIntake', 'projectMemory']

/** Per-item caller-supplied token estimates for planning evidence created from Service results. */
export interface PlanningEvidenceTokenEstimates {
  /** Estimate for the generated Git-intake candidate. */
  intake: number
  /** Estimate for each generated local project-memory candidate. */
  projectMemory: number
  /** Estimate for each generated HT AI Brain candidate. */
  htAiBrain: number
  /** Estimate for the generated Niimo skills candidate. */
  niimoSkills: number
}

/** Optional typed external adapters owned and configured outside this package. */
export interface PlanningAdapters {
  /** Optional RepoHive retrieval adapter. */
  repoHive?: RepoHiveAdapter
  /** Optional HT AI Brain retrieval adapter. */
  htAiBrain?: HtAiBrainAdapter
  /** Optional Niimo skills-catalogue adapter. */
  niimo?: NiimoAdapter
  /** Optional super-router route resolver; this service never dispatches a model. */
  superRouter?: SuperRouterAdapter
}

/** Inputs accepted by one read-only planning request. */
export interface ProjectPlanningRequest {
  /** Stable identifier for the planning task. */
  taskId: string
  /** Plain-language objective used for memory and external retrieval. */
  task: string
  /** Absolute local worktree directory inspected through `projectIntake`. */
  root: string
  /** Caller-estimated tokens for the required task candidate. */
  taskTokenEstimate: number
  /** Inclusive token budget for the selected context pack. */
  contextBudgetTokens: number
  /** Additional caller-owned instruction or local-analysis candidates. */
  candidates?: readonly ContextCandidate[]
  /** Estimates for candidates generated from Service and adapter results. */
  evidenceTokenEstimates: PlanningEvidenceTokenEstimates
  /** Sources permitted for the token-governor decision. */
  availableKnowledge: readonly KnowledgeSource[]
  /** Known risk level for model-tier selection. */
  risk: TaskRisk
  /** Whether the deployment permits remote model routes. */
  allowRemote: boolean
  /** Maximum model context size when the decision requires a model. */
  maxContextTokens: number
  /** Maximum model response size when the decision requires a model. */
  maxOutputTokens: number
  /** Optional external-system adapters whose evidence remains provider-owned. */
  adapters?: PlanningAdapters
  /** Cancels intake, retrieval, and route resolution together. */
  signal?: AbortSignal
}

/** One deterministic concern exposed before any implementation work can begin. */
export interface PlanningRisk {
  /** Stable category for user interfaces and later policy. */
  kind: 'uncommitted-changes' | 'detached-or-unresolved-head' | 'omitted-context' | 'model-route'
  /** Concise description of the observed planning concern. */
  summary: string
}

/** One observable condition for accepting a later implementation proposal. */
export interface PlanningAcceptanceCriterion {
  /** Stable criterion identifier. */
  id: 'human-approval-before-writes' | 'bounded-context' | 'read-only-planning'
  /** Condition a caller or user can verify. */
  summary: string
}

/** Deterministic planning outputs that require no model execution or implementation write. */
export interface PlanningOutputs {
  /** The requested objective. */
  objective: string
  /** Selected evidence identifiers, in model-pack order. */
  evidenceIds: readonly string[]
  /** The source the token governor selected for a later planning model call. */
  knowledgeSource: KnowledgeSource
  /** A provider-owned route for a later model caller, when resolution was requested. */
  route?: string
}

/** The fixed status of every result returned by this read-only consumer. */
export interface ImplementationApprovalRequirement {
  /** Planning never authorizes implementation writes. */
  status: 'awaiting-human-approval'
  /** The restricted operation requiring separate human approval. */
  operation: 'implementation-write'
}

/** Complete detached output from one project-planning request. */
export interface ProjectPlanningResult {
  /** Detached local project intake. */
  intake: ProjectIntake
  /** Detached local project-memory matches. */
  projectMemory: readonly ProjectMemoryRecord[]
  /** Detached optional external evidence retained for caller inspection. */
  externalEvidence: {
    /** RepoHive candidates returned by an optional adapter. */
    repoHive: readonly ContextCandidate[]
    /** HT AI Brain records returned by an optional adapter. */
    htAiBrain: readonly ProjectMemoryRecord[]
    /** Niimo skill identifiers returned by an optional adapter. */
    niimoSkills: readonly string[]
  }
  /** Bounded model-visible evidence selected by the context broker. */
  context: ContextPack
  /** Deterministic pre-dispatch model-tier decision. */
  governor: TokenGovernorDecision
  /** Objective, selected evidence, and optional later route. */
  outputs: PlanningOutputs
  /** Observed concerns requiring a caller's attention. */
  risks: readonly PlanningRisk[]
  /** Conditions that pin read-only planning and the later approval boundary. */
  acceptanceCriteria: readonly PlanningAcceptanceCriterion[]
  /** Explicitly denies implementation-write authority. */
  implementationApproval: ImplementationApprovalRequirement
}

/** Copy one record so adapter and Service Provider state cannot escape through a planning result. */
function copyRecord(record: ProjectMemoryRecord): ProjectMemoryRecord {
  return { ...record, evidence: [...record.evidence] }
}

/** Copy one candidate so selected planning context cannot expose adapter-owned state. */
function copyCandidate(candidate: ContextCandidate): ContextCandidate {
  return { ...candidate }
}

/** Render Git evidence as a compact deterministic context item. */
function intakeCandidate(intake: ProjectIntake, tokenEstimate: number): ContextCandidate {
  return {
    id: 'project-intake',
    kind: 'project-summary',
    relevance: Number.MAX_SAFE_INTEGER,
    tokenEstimate,
    content: JSON.stringify(intake),
  }
}

/** Render one distilled record as a context candidate without retaining raw provider data. */
function memoryCandidate(prefix: string, record: ProjectMemoryRecord, tokenEstimate: number): ContextCandidate {
  return {
    id: `${prefix}:${record.id}`,
    kind: record.kind === 'decision' ? 'decision' : 'memory',
    relevance: 1,
    tokenEstimate,
    content: JSON.stringify(copyRecord(record)),
  }
}

/** Render optional skills as one context item only when an adapter finds at least one. */
function skillsCandidate(skills: readonly string[], tokenEstimate: number): ContextCandidate | undefined {
  if (skills.length === 0) return undefined
  return {
    id: 'niimo-skills',
    kind: 'external-evidence',
    relevance: 1,
    tokenEstimate,
    content: JSON.stringify([...skills]),
  }
}

/** Return observed constraints in deterministic user-review order. */
function risksFor(intake: ProjectIntake, context: ContextPack, governor: TokenGovernorDecision): readonly PlanningRisk[] {
  const risks: PlanningRisk[] = []
  if (intake.git.changedPaths.length > 0) risks.push({ kind: 'uncommitted-changes', summary: 'The inspected worktree has uncommitted paths.' })
  if (intake.git.branch === undefined || intake.git.head === undefined) risks.push({ kind: 'detached-or-unresolved-head', summary: 'The inspected worktree lacks an attached branch or observed commit for a later checkpoint.' })
  if (context.omitted.length > 0) risks.push({ kind: 'omitted-context', summary: 'Relevant evidence was omitted to preserve the configured context budget.' })
  if (governor.requiresModel) risks.push({ kind: 'model-route', summary: 'A later planning model call requires the selected bounded route and budgets.' })
  return risks
}

const acceptanceCriteria: readonly PlanningAcceptanceCriterion[] = [
  { id: 'human-approval-before-writes', summary: 'A separate human approval is required before an implementation-write consumer is composed.' },
  { id: 'bounded-context', summary: 'Selected context does not exceed the caller-provided token budget.' },
  { id: 'read-only-planning', summary: 'Planning reads project evidence and adapters but does not invoke an implementation write.' },
]

/**
 * Read-only planning Consumer for the project-intake and project-memory Service
 * Definitions. It uses typed adapter interfaces only; external clients, model
 * dispatch, session injection, and implementation-write composition remain outside it.
 */
export class ProjectPlanning extends Service {
  static inject = inject

  constructor(ctx: Context) {
    super(ctx, 'projectPlanning')
  }

  /**
   * Collect bounded evidence and return an implementation-denying planning result.
   * @param request - Task, local root, budgets, source permissions, and optional adapters.
   * @returns A detached result that remains awaiting human approval for implementation writes.
   */
  async plan(request: ProjectPlanningRequest): Promise<ProjectPlanningResult> {
    if (request.taskId.trim() === '') throw new Error('project-planning: taskId must not be empty')
    if (request.task.trim() === '') throw new Error('project-planning: task must not be empty')
    if (request.root.trim() === '') throw new Error('project-planning: root must not be empty')
    const adapters = request.adapters
    const [intake, projectMemory, htAiBrain, niimoSkills] = await Promise.all([
      this.ctx.projectIntake.inspect({ root: request.root, ...request.signal === undefined ? {} : { signal: request.signal } }),
      this.ctx.projectMemory.search(request.task, request.signal),
      adapters?.htAiBrain === undefined ? Promise.resolve([] as readonly ProjectMemoryRecord[]) : adapters.htAiBrain.search(request.task, request.signal),
      adapters?.niimo === undefined ? Promise.resolve([] as readonly string[]) : adapters.niimo.findSkills(request.task, request.signal),
    ])
    const repoHive = adapters?.repoHive === undefined
      ? [] as readonly ContextCandidate[]
      : await adapters.repoHive.search(intake, request.task, request.signal)
    const copiedIntake = { ...intake, git: { ...intake.git, remotes: intake.git.remotes.map(remote => ({ ...remote })), changedPaths: [...intake.git.changedPaths], branches: [...intake.git.branches] } }
    const copiedMemory = projectMemory.map(copyRecord)
    const copiedRepoHive = repoHive.map(copyCandidate)
    const copiedHtAiBrain = htAiBrain.map(copyRecord)
    const copiedNiimoSkills = [...niimoSkills]
    const candidates = [
      { id: request.taskId, kind: 'task' as const, relevance: Number.MAX_SAFE_INTEGER, tokenEstimate: request.taskTokenEstimate, content: request.task },
      ...(request.candidates ?? []).map(copyCandidate),
      intakeCandidate(copiedIntake, request.evidenceTokenEstimates.intake),
      ...copiedMemory.map(record => memoryCandidate('project-memory', record, request.evidenceTokenEstimates.projectMemory)),
      ...copiedRepoHive,
      ...copiedHtAiBrain.map(record => memoryCandidate('ht-ai-brain', record, request.evidenceTokenEstimates.htAiBrain)),
    ]
    const skills = skillsCandidate(copiedNiimoSkills, request.evidenceTokenEstimates.niimoSkills)
    if (skills !== undefined) candidates.push(skills)
    const context = buildContextPack(request.taskId, request.contextBudgetTokens, candidates)
    const governor = governTokens({
      available: request.availableKnowledge,
      risk: request.risk,
      allowRemote: request.allowRemote,
      maxContextTokens: request.maxContextTokens,
      maxOutputTokens: request.maxOutputTokens,
    })
    const route = governor.requiresModel && adapters?.superRouter !== undefined
      ? await adapters.superRouter.resolveRoute(governor.source === 'local-llm' ? 'local' : governor.source === 'tier-b-remote' ? 'tier-b' : 'tier-a', request.signal)
      : undefined
    return {
      intake: copiedIntake,
      projectMemory: copiedMemory,
      externalEvidence: { repoHive: copiedRepoHive, htAiBrain: copiedHtAiBrain, niimoSkills: copiedNiimoSkills },
      context,
      governor,
      outputs: { objective: request.task, evidenceIds: context.selected.map(candidate => candidate.id), knowledgeSource: governor.source, ...route === undefined ? {} : { route } },
      risks: risksFor(copiedIntake, context, governor),
      acceptanceCriteria,
      implementationApproval: { status: 'awaiting-human-approval', operation: 'implementation-write' },
    }
  }
}

export default ProjectPlanning
