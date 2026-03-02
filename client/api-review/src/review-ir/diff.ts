import type { ReviewFieldNode, ReviewRoute, ReviewSpec } from './types'

export type DiffState = 'unchanged' | 'modified' | 'added' | 'removed'

export interface FieldDiffEntry {
	fieldName: string
	state: DiffState
}

export interface RouteDiffResult {
	/** Whether the route path changed between v3 and v4. */
	pathChanged: boolean
	/** Whether this is a new route (exists in v4 but not v3). */
	isNewRoute: boolean
	/** Diff state for parameters, keyed by field name. */
	parameters: Map<string, DiffState>
	/** Diff state for request body children, keyed by field name. */
	requestBody: Map<string, DiffState>
	/** Diff state for response children, keyed by statusCode → fieldName → DiffState. */
	responses: Map<string, Map<string, DiffState>>
}

/**
 * Compute diff between a v3 route and v4 route (matched by operationId).
 * If v3Route is null, all v4 fields are 'added' (new route).
 */
export function computeRouteDiff(
	v3Route: ReviewRoute | null,
	v4Route: ReviewRoute
): RouteDiffResult {
	if (!v3Route) {
		return {
			pathChanged: false,
			isNewRoute: true,
			parameters: mapAllAs(v4Route.parameters, 'added'),
			requestBody: mapAllAs(v4Route.requestBody?.schema.children ?? [], 'added'),
			responses: mapResponsesAs(v4Route, 'added'),
		}
	}

	return {
		pathChanged: v3Route.path !== v4Route.path,
		isNewRoute: false,
		parameters: computeFieldListDiff(v3Route.parameters, v4Route.parameters),
		requestBody: computeFieldListDiff(
			v3Route.requestBody?.schema.children ?? [],
			v4Route.requestBody?.schema.children ?? []
		),
		responses: computeResponsesDiff(v3Route, v4Route),
	}
}

/**
 * Look up the diff state for a specific field in a route card.
 * Handles both v3 and v4 sides.
 */
export function getFieldDiffState(
	diff: RouteDiffResult,
	fieldName: string,
	section: 'parameters' | 'requestBody' | string
): DiffState {
	if (section === 'parameters') {
		return diff.parameters.get(fieldName) ?? 'unchanged'
	}
	if (section === 'requestBody') {
		return diff.requestBody.get(fieldName) ?? 'unchanged'
	}
	const respDiff = diff.responses.get(section)
	if (respDiff) {
		return respDiff.get(fieldName) ?? 'unchanged'
	}
	return 'unchanged'
}

/**
 * Find the matching v3 route for a v4 route by operationId.
 */
export function findMatchingRoute(
	spec: ReviewSpec | null,
	operationId: string
): ReviewRoute | null {
	if (!spec) return null
	return spec.routes.find((r) => r.operationId === operationId) ?? null
}

/**
 * Get the CSS background color for a diff state.
 */
export function diffStateColor(state: DiffState): string | undefined {
	switch (state) {
		case 'modified':
			return '#fefce8'
		case 'added':
			return '#f0fdf4'
		case 'removed':
			return '#fef2f2'
		default:
			return undefined
	}
}

/**
 * Get the CSS background color for a route header based on diff.
 */
export function routeHeaderColor(diff: RouteDiffResult): string | undefined {
	if (diff.isNewRoute) return '#f0fdf4'
	if (diff.pathChanged) return '#fefce8'
	return undefined
}

// ---- Internal helpers ----

function computeFieldListDiff(
	v3Fields: ReviewFieldNode[],
	v4Fields: ReviewFieldNode[]
): Map<string, DiffState> {
	const result = new Map<string, DiffState>()
	const v3Map = new Map(v3Fields.map((f) => [f.name, f]))
	const v4Map = new Map(v4Fields.map((f) => [f.name, f]))

	for (const [name, v3Field] of v3Map) {
		const v4Field = v4Map.get(name)
		if (!v4Field) {
			result.set(name, 'removed')
		} else if (fieldsModified(v3Field, v4Field)) {
			result.set(name, 'modified')
		} else {
			result.set(name, 'unchanged')
		}
	}

	for (const [name] of v4Map) {
		if (!v3Map.has(name)) {
			result.set(name, 'added')
		}
	}

	return result
}

function computeResponsesDiff(
	v3Route: ReviewRoute,
	v4Route: ReviewRoute
): Map<string, Map<string, DiffState>> {
	const result = new Map<string, Map<string, DiffState>>()

	const v3Responses = new Map(v3Route.responses.map((r) => [r.statusCode, r]))
	const v4Responses = new Map(v4Route.responses.map((r) => [r.statusCode, r]))

	for (const [statusCode, v4Resp] of v4Responses) {
		const v3Resp = v3Responses.get(statusCode)
		if (!v3Resp) {
			result.set(statusCode, mapAllAs(v4Resp.schema?.children ?? [], 'added'))
		} else {
			result.set(
				statusCode,
				computeFieldListDiff(
					v3Resp.schema?.children ?? [],
					v4Resp.schema?.children ?? []
				)
			)
		}
	}

	for (const [statusCode, v3Resp] of v3Responses) {
		if (!v4Responses.has(statusCode)) {
			result.set(statusCode, mapAllAs(v3Resp.schema?.children ?? [], 'removed'))
		}
	}

	return result
}

/**
 * Deep comparison of two field nodes. Returns true if any property differs,
 * including recursive comparison of children/items/variants.
 */
function fieldsModified(v3: ReviewFieldNode, v4: ReviewFieldNode): boolean {
	if (v3.displayName !== v4.displayName) return true
	if (v3.typeSummary !== v4.typeSummary) return true
	if (v3.required !== v4.required) return true
	if (v3.nullable !== v4.nullable) return true
	if (v3.typeKind !== v4.typeKind) return true

	if (!enumArraysEqual(v3.enumValues, v4.enumValues)) return true

	if (v3.children || v4.children) {
		if (childrenModified(v3.children ?? [], v4.children ?? [])) return true
	}

	if (v3.items || v4.items) {
		if (!v3.items || !v4.items) return true
		if (fieldsModified(v3.items, v4.items)) return true
	}

	if (v3.variants || v4.variants) {
		const v3v = v3.variants ?? []
		const v4v = v4.variants ?? []
		if (v3v.length !== v4v.length) return true
		for (let i = 0; i < v3v.length; i++) {
			if (fieldsModified(v3v[i], v4v[i])) return true
		}
	}

	return false
}

function childrenModified(v3Children: ReviewFieldNode[], v4Children: ReviewFieldNode[]): boolean {
	const v3Map = new Map(v3Children.map((f) => [f.name, f]))
	const v4Map = new Map(v4Children.map((f) => [f.name, f]))

	for (const [name, v3Field] of v3Map) {
		const v4Field = v4Map.get(name)
		if (!v4Field) return true
		if (fieldsModified(v3Field, v4Field)) return true
	}

	for (const [name] of v4Map) {
		if (!v3Map.has(name)) return true
	}

	return false
}

function enumArraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
	if (!a && !b) return true
	if (!a || !b) return false
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

function mapAllAs(fields: ReviewFieldNode[], state: DiffState): Map<string, DiffState> {
	return new Map(fields.map((f) => [f.name, state]))
}

function mapResponsesAs(
	route: ReviewRoute,
	state: DiffState
): Map<string, Map<string, DiffState>> {
	const result = new Map<string, Map<string, DiffState>>()
	for (const resp of route.responses) {
		result.set(resp.statusCode, mapAllAs(resp.schema?.children ?? [], state))
	}
	return result
}
