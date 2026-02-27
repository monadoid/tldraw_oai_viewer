import type { ReviewSpec, RouteCardPair } from './types'

/**
 * Pair v3 and v4 routes into RouteCardPairs for canvas display.
 *
 * - Matches routes by operationId
 * - Groups by path prefix
 * - Orders groups alphabetically by prefix
 */
export function buildRouteCardPairs(
	v3Spec: ReviewSpec,
	v4Spec: ReviewSpec
): RouteCardPair[] {
	const v4ByOpId = new Map(v4Spec.routes.map((r) => [r.operationId, r]))

	const pairs: RouteCardPair[] = []
	for (const v3Route of v3Spec.routes) {
		const v4Route = v4ByOpId.get(v3Route.operationId)
		if (!v4Route) continue

		pairs.push({
			pathPrefix: v3Route.pathPrefix,
			v3: v3Route,
			v4: v4Route,
		})
	}

	pairs.sort((a, b) => {
		const prefixCmp = a.pathPrefix.localeCompare(b.pathPrefix)
		if (prefixCmp !== 0) return prefixCmp
		return a.v3.path.localeCompare(b.v3.path)
	})

	return pairs
}
