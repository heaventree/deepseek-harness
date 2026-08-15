/** Deterministic planning primitives for local-first project work. @module @deepseek-ai/dsh-project-foundations */

/** One source from which a project can be acquired without mixing working trees. */
export type ProjectSourceKind = 'local-repository' | 'remote-clone' | 'remote-connection' | 'public-inspection'

/** Read-only Git facts collected by a caller using the configured execution provider. */
export interface GitEvidence {
  /** Checked-out branch name, when a worktree exists. */
  branch?: string
  /** Commit at which the evidence was collected. */
  head?: string
  /** Remote names and URLs visible to the repository. */
  remotes: readonly { name: string, url: string }[]
  /** Paths changed from the current index or worktree. */
  changedPaths: readonly string[]
  /** Local and remote branch names. */
  branches: readonly string[]
}

/** A stable project identity and its collected local evidence. */
export interface ProjectIntake {
  /** User-selected source category. */
  source: ProjectSourceKind
  /** Absolute local path for a worktree, if one is available. */
  root?: string
  /** Public remote URL, if one is available. */
  remoteUrl?: string
  /** Read-only Git facts captured during intake. */
  git: GitEvidence
}

/** One candidate item from local analysis, cached intelligence, or durable memory. */
export interface ContextCandidate {
  /** Stable caller-owned identifier. */
  id: string
  /** Candidate category shown in selection evidence. */
  kind: 'instruction' | 'project-summary' | 'task' | 'decision' | 'file' | 'symbol' | 'test' | 'change' | 'memory' | 'external-evidence'
  /** Higher scores are selected before lower scores. */
  relevance: number
  /** Deterministic token estimate supplied by the caller. */
  tokenEstimate: number
  /** Exact content that will be included when the item is selected. */
  content: string
}

/** An admitted context item and its deterministic selection reason. */
export interface SelectedContext extends ContextCandidate {
  /** Reason the item earned space in the pack. */
  reason: 'required' | 'relevant'
}

/** A compact context pack that never includes candidates beyond its budget. */
export interface ContextPack {
  /** Task identifier supplied by the planning caller. */
  taskId: string
  /** Maximum estimated tokens permitted by the caller. */
  budgetTokens: number
  /** Sum of selected token estimates. */
  usedTokens: number
  /** Candidates admitted to the model-visible pack. */
  selected: readonly SelectedContext[]
  /** Relevant candidates excluded because they would exceed the budget. */
  omitted: readonly string[]
}

/** A source that can satisfy a planning need before any model call. */
export type KnowledgeSource = 'deterministic-tool' | 'repository-cache' | 'symbol-data' | 'local-search' | 'project-memory' | 'ht-ai-brain' | 'repohive' | 'local-llm' | 'tier-b-remote' | 'tier-a-remote'

/** The risk level assigned by the planning caller. */
export type TaskRisk = 'low' | 'moderate' | 'high'

/** Inputs to deterministic model-tier selection. */
export interface TokenGovernorRequest {
  /** Sources that can answer the current need, in any order. */
  available: readonly KnowledgeSource[]
  /** The task's known risk level. */
  risk: TaskRisk
  /** Whether the current deployment permits remote model use. */
  allowRemote: boolean
  /** Budget cap for any selected model request. */
  maxContextTokens: number
  /** Budget cap for any selected model response. */
  maxOutputTokens: number
}

/** A deterministic token-governor decision made before model dispatch. */
export interface TokenGovernorDecision {
  /** Selected source in the Phase 1 priority order. */
  source: KnowledgeSource
  /** Whether the selected source requires a model request. */
  requiresModel: boolean
  /** Maximum context budget passed to a model caller, when applicable. */
  maxContextTokens?: number
  /** Maximum output budget passed to a model caller, when applicable. */
  maxOutputTokens?: number
}

/** Durable, distilled project knowledge. Raw model transcripts are deliberately absent. */
export interface ProjectMemoryRecord {
  /** Stable caller-owned record identifier. */
  id: string
  /** Record class used by retrieval and promotion policy. */
  kind: 'decision' | 'convention' | 'dependency' | 'known-issue' | 'important-file' | 'verification' | 'task-summary'
  /** Human-readable distilled fact. */
  summary: string
  /** Evidence identifiers or repository paths supporting the fact. */
  evidence: readonly string[]
  /** ISO-8601 timestamp supplied by the persistence provider. */
  recordedAt: string
}

/** Storage boundary for project memory. Implementations own local files, databases, or remote stores. */
export interface ProjectMemoryStore {
  /** Returns only records relevant to a query. */
  search(query: string, signal?: AbortSignal): Promise<readonly ProjectMemoryRecord[]>
  /** Persists one distilled record. */
  put(record: ProjectMemoryRecord, signal?: AbortSignal): Promise<void>
}

/** Minimal RepoHive request and response vocabulary. */
export interface RepoHiveAdapter {
  /** Retrieves relevant graded repository evidence for an intake and task. */
  search(intake: ProjectIntake, task: string, signal?: AbortSignal): Promise<readonly ContextCandidate[]>
}

/** Minimal HT AI Brain request and response vocabulary. */
export interface HtAiBrainAdapter {
  /** Retrieves distilled organisational knowledge. */
  search(query: string, signal?: AbortSignal): Promise<readonly ProjectMemoryRecord[]>
  /** Promotes an already distilled record. */
  promote(record: ProjectMemoryRecord, signal?: AbortSignal): Promise<void>
}

/** Minimal Niimo skills-catalogue vocabulary. */
export interface NiimoAdapter {
  /** Returns skill identifiers relevant to the declared task. */
  findSkills(task: string, signal?: AbortSignal): Promise<readonly string[]>
}

/** Minimal super-router vocabulary; provider routing remains outside the Harness core. */
export interface SuperRouterAdapter {
  /** Selects an externally managed route for a requested task tier. */
  resolveRoute(tier: 'local' | 'tier-b' | 'tier-a', signal?: AbortSignal): Promise<string | undefined>
}

/** A durable Git checkpoint that permits later comparison or rollback by a Git consumer. */
export interface ProjectCheckpoint {
  /** Stable caller-owned checkpoint identifier. */
  id: string
  /** Commit that must be restored before applying rollback instructions. */
  startingCommit: string
  /** Branch associated with the checkpoint. */
  branch: string
  /** ISO-8601 creation time supplied by the caller. */
  createdAt: string
}

/** Verification work required for a scoped change. */
export interface VerificationPlan {
  /** Always-present deterministic review stages. */
  checks: readonly ('lsp' | 'typecheck' | 'lint' | 'tests' | 'build' | 'diff-review')[]
  /** Specialist reviews earned by changed path risk triggers. */
  specialists: readonly ('security' | 'database' | 'accessibility' | 'dependency' | 'architecture')[]
}

const sourcePriority: readonly KnowledgeSource[] = ['deterministic-tool', 'repository-cache', 'symbol-data', 'local-search', 'project-memory', 'ht-ai-brain', 'repohive', 'local-llm', 'tier-b-remote', 'tier-a-remote']

/**
 * Builds a deterministic intake record from caller-collected evidence.
 * @param intake - The source identity and Git evidence to retain.
 * @returns A detached intake record.
 */
export function createProjectIntake(intake: ProjectIntake): ProjectIntake {
  return { ...intake, git: { ...intake.git, remotes: intake.git.remotes.map((remote) => ({ ...remote })), changedPaths: [...intake.git.changedPaths], branches: [...intake.git.branches] } }
}

/**
 * Selects context by required status, relevance, estimated cost, then identifier.
 * @param taskId - Stable task identifier.
 * @param budgetTokens - Maximum allowed estimated tokens.
 * @param candidates - Candidate context items.
 * @returns A compact evidence pack.
 */
export function buildContextPack(taskId: string, budgetTokens: number, candidates: readonly ContextCandidate[]): ContextPack {
  if (!Number.isSafeInteger(budgetTokens) || budgetTokens < 0) throw new RangeError('budgetTokens must be a non-negative safe integer')
  const isRequired = (candidate: ContextCandidate): boolean => candidate.kind === 'instruction' || candidate.kind === 'task'
  const ordered = [...candidates].sort((left, right) => Number(isRequired(right)) - Number(isRequired(left)) || right.relevance - left.relevance || left.tokenEstimate - right.tokenEstimate || left.id.localeCompare(right.id))
  const selected: SelectedContext[] = []
  const omitted: string[] = []
  let usedTokens = 0
  for (const candidate of ordered) {
    if (!Number.isSafeInteger(candidate.tokenEstimate) || candidate.tokenEstimate < 0) throw new RangeError(`candidate ${candidate.id} has an invalid tokenEstimate`)
    if (usedTokens + candidate.tokenEstimate > budgetTokens) {
      if (isRequired(candidate)) throw new RangeError(`required candidate ${candidate.id} exceeds the context budget`)
      omitted.push(candidate.id)
      continue
    }
    selected.push({ ...candidate, reason: isRequired(candidate) ? 'required' : 'relevant' })
    usedTokens += candidate.tokenEstimate
  }
  return { taskId, budgetTokens, usedTokens, selected, omitted }
}

/**
 * Selects the cheapest acceptable Phase 1 evidence source before dispatch.
 * @param request - Available sources, risk, permission, and budgets.
 * @returns The justified source and any model budgets.
 */
export function governTokens(request: TokenGovernorRequest): TokenGovernorDecision {
  if (!Number.isSafeInteger(request.maxContextTokens) || request.maxContextTokens < 0) throw new RangeError('maxContextTokens must be a non-negative safe integer')
  if (!Number.isSafeInteger(request.maxOutputTokens) || request.maxOutputTokens < 0) throw new RangeError('maxOutputTokens must be a non-negative safe integer')
  const available = new Set(request.available)
  const source = sourcePriority.find((candidate) => available.has(candidate) && (request.allowRemote || candidate !== 'tier-b-remote' && candidate !== 'tier-a-remote'))
  if (source === undefined) throw new Error('No permitted knowledge source is available')
  if (source === 'tier-b-remote' && request.risk === 'high' && available.has('tier-a-remote') && request.allowRemote) return { source: 'tier-a-remote', requiresModel: true, maxContextTokens: request.maxContextTokens, maxOutputTokens: request.maxOutputTokens }
  const requiresModel = source === 'local-llm' || source === 'tier-b-remote' || source === 'tier-a-remote'
  return requiresModel ? { source, requiresModel, maxContextTokens: request.maxContextTokens, maxOutputTokens: request.maxOutputTokens } : { source, requiresModel }
}

/**
 * Creates a checkpoint only when a branch and starting commit were observed.
 * @param id - Stable checkpoint identifier.
 * @param git - Intake Git evidence before writes.
 * @param createdAt - ISO-8601 creation time.
 * @returns A rollback anchor.
 */
export function createProjectCheckpoint(id: string, git: GitEvidence, createdAt: string): ProjectCheckpoint {
  if (git.branch === undefined || git.head === undefined) throw new Error('A project checkpoint requires an observed branch and starting commit')
  return { id, startingCommit: git.head, branch: git.branch, createdAt }
}

/**
 * Plans baseline verification and specialist review only for concrete risk triggers.
 * @param changedPaths - Repository-relative changed paths.
 * @returns Required checks and triggered reviews.
 */
export function planVerification(changedPaths: readonly string[]): VerificationPlan {
  const specialists = new Set<VerificationPlan['specialists'][number]>()
  for (const path of changedPaths) {
    if (/(^|\/)(auth|security|credentials?)(\/|$)|\.(pem|key)$/i.test(path)) specialists.add('security')
    if (/(^|\/)(migrations?|schema|database|db)(\/|$)|\.sql$/i.test(path)) specialists.add('database')
    if (/(^|\/)(ui|web|frontend|components?)(\/|$)|\.(css|html|tsx|jsx)$/i.test(path)) specialists.add('accessibility')
    if (/(^|\/)(package\.json|pnpm-lock\.yaml|requirements\.txt|pyproject\.toml)$/i.test(path)) specialists.add('dependency')
  }
  if (changedPaths.length >= 20) specialists.add('architecture')
  return { checks: ['lsp', 'typecheck', 'lint', 'tests', 'build', 'diff-review'], specialists: [...specialists].sort() }
}
