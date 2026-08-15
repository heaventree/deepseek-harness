import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import type {} from '@deepseek-ai/dsh-project-planning'
import { boot } from '@deepseek-ai/dsh-app-boot'
import type { Context } from '@deepseek-ai/cordis'

const configPath = fileURLToPath(new URL('../cordis.yml', import.meta.url))
const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(context => context.fiber.dispose()))
})

describe('phase1-local composition', () => {
  it('boots the real Loader tree with its opt-in local providers and LM Studio route', async () => {
    const ctx = await boot('phase1-local-example', configPath)
    contexts.push(ctx)

    expect(ctx.llm.listProviders()).toContainEqual(expect.objectContaining({ id: 'lm-studio', name: 'LM Studio' }))
    expect(ctx.get('projectIntake')).toBeDefined()
    expect(ctx.get('projectMemory')).toBeDefined()
    expect(ctx.get('projectPlanning')).toBeDefined()
  })
})
