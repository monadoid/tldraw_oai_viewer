import { createShapeId, type Editor } from 'tldraw'
import type { ReviewRoute, ReviewSchema, ReviewSpec } from '../review-ir/types'
import { REVIEW_STATE_TYPE } from '../shapes/review-state-types'

const REVIEW_STATE_SHAPE_ID = createShapeId('review-state')
function getLocalStorageKey() {
	const roomId = new URLSearchParams(window.location.search).get('room') ?? 'api-review'
	return `api-review:v4-spec:${roomId}`
}

type PersistedV4Spec = {
	updatedAt: number
	title: string
	version: string
	side: 'v4'
	routes: ReviewRoute[]
	schemas: Array<[string, ReviewSchema]>
}

function toPlainJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T
}

export function getPersistedV4Spec(editor: Editor): ReviewSpec | null {
	const persistedShape = editor.getShape(REVIEW_STATE_SHAPE_ID)
	let shapeRaw: unknown = null
	let localRaw: unknown = null

	if (
		persistedShape &&
		persistedShape.type === REVIEW_STATE_TYPE &&
		typeof persistedShape.props.data === 'string' &&
		persistedShape.props.data.length > 0
	) {
		try {
			shapeRaw = JSON.parse(persistedShape.props.data)
		} catch {
			shapeRaw = null
		}
	}

	try {
		const stored = localStorage.getItem(getLocalStorageKey())
		if (stored) localRaw = JSON.parse(stored)
	} catch {
		localRaw = null
	}

	const parsedShape = parsePersistedSpec(shapeRaw)
	const parsedLocal = parsePersistedSpec(localRaw)
	const parsed =
		parsedShape && parsedLocal
			? parsedShape.updatedAt >= parsedLocal.updatedAt
				? parsedShape
				: parsedLocal
			: parsedShape ?? parsedLocal
	if (!parsed) return null

	return {
		title: parsed.title,
		version: parsed.version,
		side: 'v4',
		routes: parsed.routes,
		schemas: new Map(parsed.schemas),
	}
}

function parsePersistedSpec(raw: unknown): PersistedV4Spec | null {
	if (!raw || typeof raw !== 'object') return null
	const parsed = raw as Partial<PersistedV4Spec>
	if (
		typeof parsed.updatedAt !== 'number' ||
		typeof parsed.title !== 'string' ||
		typeof parsed.version !== 'string' ||
		parsed.side !== 'v4' ||
		!Array.isArray(parsed.routes) ||
		!Array.isArray(parsed.schemas)
	) {
		return null
	}
	return parsed as PersistedV4Spec
}

export function persistV4Spec(editor: Editor, spec: ReviewSpec) {
	const serialized = JSON.stringify(
		toPlainJson<PersistedV4Spec>({
			updatedAt: Date.now(),
			title: spec.title,
			version: spec.version,
			side: 'v4',
			routes: spec.routes,
			schemas: Array.from(spec.schemas.entries()),
		})
	)
	localStorage.setItem(getLocalStorageKey(), serialized)

	const persistedShape = editor.getShape(REVIEW_STATE_SHAPE_ID)
	if (!persistedShape || persistedShape.type !== REVIEW_STATE_TYPE) {
		editor.createShape({
			id: REVIEW_STATE_SHAPE_ID,
			type: REVIEW_STATE_TYPE,
			x: -1_000_000,
			y: -1_000_000,
			props: {
				w: 1,
				h: 1,
				data: serialized,
			},
		})
	} else {
		editor.updateShape({
			id: REVIEW_STATE_SHAPE_ID,
			type: REVIEW_STATE_TYPE,
			props: {
				...persistedShape.props,
				data: serialized,
			},
		})
	}
	const afterShape = editor.getShape(REVIEW_STATE_SHAPE_ID)

	console.log('[review-event] persist-v4-spec', {
		routeCount: spec.routes.length,
		schemaCount: spec.schemas.size,
		hasProbeToken: serialized.includes('persist_probe_'),
		wroteProbeToShape: String(afterShape?.type === REVIEW_STATE_TYPE ? afterShape.props.data : '').includes(
			'persist_probe_'
		),
	})
}
