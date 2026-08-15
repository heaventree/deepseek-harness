/** Package-owned invariant companion for `@deepseek-ai/dsh-project-planning`. @module @deepseek-ai/dsh-project-planning/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-project-planning'

/** Cordis companion plugin name. */
export const name = 'project-planning-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: planning returns one caller-owned value and publishes no event or durable mutable state. */
const install: InvariantInstaller = () => {}

/**
 * Registers this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns The installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
