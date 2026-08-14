# Phase 1 Local MVP

## Goal

Build DeepSeek Harness into a local-first coding workstation that minimises token burn without sacrificing implementation quality.

The core rule is:

> Spend tokens where judgement and code quality matter. Use deterministic local tooling, cached intelligence, retrieval, and local models everywhere else.

Phase 1 is intentionally local-only. Cloud execution, multi-tenant RBAC, billing, and large autonomous agent fleets are out of scope.

## Project lifecycle

```text
NEW PROJECT
    ↓
SOURCE ACQUISITION
    ├─ Open local repository
    ├─ Clone GitHub repository
    ├─ Connect existing Git remote
    ├─ Inspect public repository
    └─ Select/create working branch
    ↓
LOCAL REPOSITORY SCAN
    ├─ File tree
    ├─ Languages/frameworks
    ├─ Dependencies
    ├─ LSP/symbol map
    ├─ Tests/build commands
    ├─ Git history
    ├─ Branches/tags
    ├─ Open issues/PR context where relevant
    └─ Security/config surface
    ↓
REPOHIVE INTELLIGENCE
    ├─ Search pre-graded repository catalogue
    ├─ Retrieve comparable implementations
    ├─ Retrieve known patterns and prior analysis
    └─ Return only relevant evidence
    ↓
EXISTING KNOWLEDGE RETRIEVAL
    ├─ Project memory
    ├─ HT AI Brain
    ├─ Previous decisions
    ├─ Niimo skills catalogue
    └─ Cached repository intelligence
    ↓
SHARED EVIDENCE PACK
    ↓
PLANNING BOARD
    ├─ Product / requirements agent
    ├─ Architecture agent
    ├─ Repository / research agent
    └─ Security agent when warranted
    ↓
SYNTHESIS
    ↓
PRD + ARCHITECTURE + EXECUTION PLAN + RISKS + ACCEPTANCE CRITERIA
    ↓
HUMAN APPROVAL
    ↓
SAFE WORKING STATE
    ├─ Create branch
    ├─ Record starting commit
    └─ Create checkpoint
    ↓
IMPLEMENTATION — TIER A
    ↓
VERIFICATION
    ├─ LSP diagnostics
    ├─ Typecheck
    ├─ Lint
    ├─ Tests
    ├─ Build
    ├─ Diff review
    └─ Risk-triggered specialist review
    ↓
GIT REVIEW
    ├─ Changed files
    ├─ Diff
    ├─ Restore/revert
    ├─ Commit
    ├─ Push
    └─ Create PR when wanted
    ↓
PROJECT MEMORY
    ↓
KNOWLEDGE DISTILLATION
    ↓
HT AI BRAIN
```

## Model tiers

### Tier A — implementation quality

Use strongest available model for:

- implementation
- difficult debugging
- architecture-critical decisions
- migrations
- security-sensitive changes
- complex refactors
- final review where risk warrants it

Tier A receives the smallest high-value context pack required to do the work correctly.

### Tier B — planning and research

Use capable lower-cost models for:

- planning board roles
- repository analysis
- research
- RAG
- dependency analysis
- test planning
- documentation
- first-pass reviews

Planning-board agents share one evidence pack. They must not independently rescan the repository or repeat the same external research unless explicitly required.

### Tier C — local models

Use LM Studio and other local OpenAI-compatible endpoints for:

- classification
- summarisation
- chunk scoring
- query expansion
- file relevance
- log reduction
- duplicate detection
- extraction
- memory compression
- commit summarisation
- RAG preprocessing
- context selection

Local models are preferred when quality is adequate and failure is low-risk.

## Token governor

Every model call should be evaluated before dispatch.

Priority order:

1. deterministic local tool
2. cached repository intelligence
3. LSP / symbol data
4. local search
5. project memory / project RAG
6. HT AI Brain
7. RepoHive
8. local LLM
9. Tier B remote model
10. Tier A remote model

The governor decides:

- whether a model call is needed
- whether cached knowledge is still valid
- whether local inference is sufficient
- which tier is justified
- maximum context and response budget
- whether a specialist subagent is warranted

## Context broker

Context must be earned rather than dumped wholesale into the model.

A task context pack should contain only:

- concise project summary
- current task
- relevant architecture decisions
- relevant files/symbols
- related tests
- recent relevant changes
- applicable project instructions

Large files and repository-wide context are loaded only when relevance cannot be established more cheaply.

## Repository intelligence cache

Repository analysis is content-addressed.

For each file, persist data keyed to its content hash, including:

- purpose
- exports / symbols
- imports and dependencies
- relationships
- security relevance
- related tests
- summary
- optional embedding

If a file hash is unchanged, reuse prior intelligence. If it changed, prefer diff-based re-analysis.

## Memory model

### Working memory

Short-lived task state: objective, attempts, failures, next actions.

### Project memory

Persistent project knowledge: architecture, PRD, decisions, dependencies, conventions, known issues, important files, commands, deployment, technical debt and task history.

### Organisational memory

Only distilled, useful knowledge is promoted to HT AI Brain. Do not dump raw coding conversations.

Use lightweight decision records for durable architectural choices.

## Agent policy

Planning agents are read-only.

Implementation write access begins only after human approval.

Subagents are event-driven rather than continuously active. Examples:

- auth/security-sensitive files changed → security reviewer
- database migration detected → database reviewer
- frontend UI changed → accessibility/UI reviewer
- test failure → debugger
- major dependency change → dependency researcher
- large architectural diff → architecture reviewer

If no trigger exists, do not spawn the specialist agent.

## External system boundaries

DeepSeek Harness remains the coding runtime. Existing systems are integrated through thin adapters rather than merged into the repository.

- **Niimo**: skills, sanitisation and controlled credential execution
- **super-router**: provider/model routing and optimisation
- **RepoHive**: graded repository intelligence and reusable implementation research
- **HT AI Brain**: organisational knowledge store
- **LM Studio**: local OpenAI-compatible inference

Reference repositories such as OpenCode, agenticSeek and niimoclip are code/pattern donors, not runtime dependencies.

## Phase 1 first-class Git requirements

Phase 1 must support:

- open local repository
- clone GitHub repository
- connect existing remote
- public repository inspection
- status / diff / history
- branches and checkpoints
- stage / commit / push / pull
- GitHub authentication
- issue / PR / checks context
- PR creation
- simple user-facing rollback of agent work

Research repositories must remain isolated from the repository being modified.

## Verification loop

```text
TASK
  ↓
Retrieve memory
  ↓
Build context pack
  ↓
Tier A implementation
  ↓
LSP / typecheck / lint / tests / build
  ↓
Inspect diff
  ↓
Risk classification
  ↓
Optional specialist review
  ↓
Fix findings
  ↓
Final verification
```

The implementation stage is deliberately not optimised to the lowest possible token count. Correct code is cheaper than repeated repair cycles.

## MVP acceptance test

Given a reasonably complex existing repository and a request such as:

> Audit this application, produce a plan for adding X, then implement it.

Harness should be able to:

1. inspect the repository locally before using expensive models
2. acquire relevant Git/GitHub context
3. retrieve RepoHive and existing project knowledge
4. build one compact shared evidence pack
5. run a bounded Tier B planning board
6. produce PRD, architecture, execution plan, risks and acceptance criteria
7. wait for human approval before writes
8. create a safe branch/checkpoint
9. hand implementation to Tier A
10. compile/typecheck/test throughout
11. invoke specialists only when risk triggers them
12. present a clean final diff and rollback controls
13. record model/token/cost telemetry
14. persist useful project memory
15. distil reusable knowledge to HT AI Brain
16. commit/push/create PR through first-class Git/GitHub workflows

## Explicitly out of scope for Phase 1

- cloud workers
- multi-user collaboration
- organisation RBAC
- billing
- marketplace
- complex visual workflow builder
- mobile app
- autonomous always-on agent fleets
- full HT AI Brain UI inside Harness
