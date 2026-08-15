/** Run the opt-in local-first Phase 1 planning composition. */

import { fileURLToPath } from 'node:url'
import type {} from '@deepseek-ai/dsh-project-planning'
import { boot } from '@deepseek-ai/dsh-app-boot'

interface Options {
  /** Absolute or relative Git worktree root to inspect. */
  root: string
  /** Plain-language objective used for bounded planning evidence. */
  task: string
}

/** Parse the small opt-in example command line without accepting write authority. */
function parseOptions(args: readonly string[]): Options {
  let root = process.cwd()
  let task: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const value = args[index + 1]
    if (arg === '--root' && value !== undefined) {
      root = value
      index += 1
      continue
    }
    if (arg === '--task' && value !== undefined) {
      task = value
      index += 1
      continue
    }
    throw new Error('phase1-local: expected --root <path> --task <objective>')
  }
  if (task === undefined || task.trim() === '') {
    throw new Error('phase1-local: --task must be a non-empty objective')
  }
  return { root, task }
}

/** Boot the assembled profile and print a read-only planning result. */
async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const configPath = fileURLToPath(new URL('./cordis.yml', import.meta.url))
  const ctx = await boot('phase1-local', configPath)
  try {
    const result = await ctx.projectPlanning.plan({
      taskId: 'phase1-local-plan',
      task: options.task,
      root: options.root,
      taskTokenEstimate: 128,
      contextBudgetTokens: 8_192,
      evidenceTokenEstimates: {
        intake: 1_024,
        projectMemory: 512,
        htAiBrain: 512,
        niimoSkills: 256,
      },
      availableKnowledge: ['local-llm'],
      risk: 'moderate',
      allowRemote: false,
      maxContextTokens: 32_768,
      maxOutputTokens: 4_096,
    })
    if (result.implementationApproval.status !== 'awaiting-human-approval') {
      throw new Error('phase1-local: planning unexpectedly granted implementation-write authority')
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } finally {
    await ctx.fiber.dispose()
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
