import { createShapeId, type Editor } from 'tldraw'
import type { ReviewSpec, RouteCardPair } from '../review-ir/types'
import { ROUTE_CARD_TYPE } from './route-card-types'
import { SCHEMA_NODE_TYPE } from './schema-node-types'
import {
	CARD_GAP_X,
	CARD_GAP_Y,
	CARD_HEIGHT,
	CARD_WIDTH,
	GROUP_GAP_Y,
	PAIR_START_X,
	START_Y,
} from './layout-constants'
import { buildSchemaLayoutForRoute } from './schema-layout'

export interface LayoutResult {
	shapeCount: number
}

export function layoutRouteCards(
	editor: Editor,
	pairs: RouteCardPair[],
	v3Spec: ReviewSpec,
	v4Spec: ReviewSpec
): LayoutResult {
	const grouped = groupByPrefix(pairs)
	const sortedPrefixes = [...grouped.keys()].sort()

	const shapes: Array<{
		id: ReturnType<typeof createShapeId>
		type: typeof ROUTE_CARD_TYPE
		x: number
		y: number
		props: {
			w: number
			h: number
			specSide: 'v3' | 'v4'
			operationId: string
			method: string
		}
	}> = []
	const extraShapes: Array<{
		id: ReturnType<typeof createShapeId>
		type: typeof SCHEMA_NODE_TYPE | 'arrow'
		x: number
		y: number
		props: Record<string, any>
	}> = []
	const bindings: Array<{
		fromId: ReturnType<typeof createShapeId>
		toId: ReturnType<typeof createShapeId>
		type: 'arrow'
		props: {
			terminal: 'start' | 'end'
			normalizedAnchor: { x: number; y: number }
			isExact: boolean
			isPrecise: boolean
		}
	}> = []

	let currentY = START_Y

	for (const prefix of sortedPrefixes) {
		const groupPairs = grouped.get(prefix)!

		for (const pair of groupPairs) {
			const rowY = currentY

			const v3Id = createShapeId(`v3-${pair.v3.operationId}`)
			const v3Metrics = {
				id: v3Id,
				x: PAIR_START_X,
				y: rowY,
				w: CARD_WIDTH,
				h: CARD_HEIGHT,
			}
			if (!editor.getShape(v3Id)) {
				shapes.push({
					id: v3Id,
					type: ROUTE_CARD_TYPE,
					x: v3Metrics.x,
					y: v3Metrics.y,
					props: {
						w: CARD_WIDTH,
						h: CARD_HEIGHT,
						specSide: 'v3',
						operationId: pair.v3.operationId,
						method: pair.v3.method,
					},
				})
			}

			const v4Id = createShapeId(`v4-${pair.v4.operationId}`)
			const v4Metrics = {
				id: v4Id,
				x: PAIR_START_X + CARD_WIDTH + CARD_GAP_X,
				y: rowY,
				w: CARD_WIDTH,
				h: CARD_HEIGHT,
			}
			if (!editor.getShape(v4Id)) {
				shapes.push({
					id: v4Id,
					type: ROUTE_CARD_TYPE,
					x: v4Metrics.x,
					y: v4Metrics.y,
					props: {
						w: CARD_WIDTH,
						h: CARD_HEIGHT,
						specSide: 'v4',
						operationId: pair.v4.operationId,
						method: pair.v4.method,
					},
				})
			}

			const v3Schema = buildSchemaLayoutForRoute(v3Spec, 'v3', pair.v3, v3Metrics, -1)
			const v4Schema = buildSchemaLayoutForRoute(v4Spec, 'v4', pair.v4, v4Metrics, 1)

			extraShapes.push(...v3Schema.shapes, ...v4Schema.shapes)
			bindings.push(...v3Schema.bindings, ...v4Schema.bindings)

			const rowHeight = Math.max(
				CARD_HEIGHT,
				v3Schema.maxY - rowY,
				v4Schema.maxY - rowY
			)
			currentY += rowHeight + CARD_GAP_Y
		}

		currentY += GROUP_GAP_Y
	}

	if (shapes.length > 0 || extraShapes.length > 0) {
		editor.createShapes([...shapes, ...extraShapes])
		if (bindings.length > 0) {
			editor.createBindings(bindings)
		}
	}

	return { shapeCount: shapes.length + extraShapes.length }
}

function groupByPrefix(pairs: RouteCardPair[]): Map<string, RouteCardPair[]> {
	const groups = new Map<string, RouteCardPair[]>()
	for (const pair of pairs) {
		const existing = groups.get(pair.pathPrefix) ?? []
		existing.push(pair)
		groups.set(pair.pathPrefix, existing)
	}
	return groups
}
