import { createShapeId, type TLShapeId } from 'tldraw'
import type { ReviewFieldNode, ReviewRoute, ReviewSpec, SpecSide } from '../review-ir/types'
import {
	CARD_HEADER_HEIGHT,
	FIELD_ROW_HEIGHT,
	SCHEMA_GAP_X,
	SCHEMA_GAP_Y,
	SCHEMA_HEADER_HEIGHT,
	SCHEMA_MIN_HEIGHT,
	SCHEMA_WIDTH,
	SECTION_HEADER_HEIGHT,
} from './layout-constants'
import { SCHEMA_NODE_TYPE } from './schema-node-types'

interface RowLayout {
	field: ReviewFieldNode
	yOffset: number
}

interface ShapeMetrics {
	id: TLShapeId
	x: number
	y: number
	w: number
	h: number
}


interface SchemaTarget {
	node: ReviewFieldNode
	title: string
	subtitle?: string
	schemaName?: string
	key: string
}

interface QueueItem {
	sourceShape: ShapeMetrics
	sourceRowOffset: number
	depth: number
	target: SchemaTarget
	ancestry: Set<string>
}

export interface SchemaLayoutOutput {
	shapes: Array<{
		id: TLShapeId
		type: typeof SCHEMA_NODE_TYPE | 'arrow'
		x: number
		y: number
		props: Record<string, any>
	}>
	bindings: Array<{
		fromId: TLShapeId
		toId: TLShapeId
		type: 'arrow'
		props: {
			terminal: 'start' | 'end'
			normalizedAnchor: { x: number; y: number }
			isExact: boolean
			isPrecise: boolean
		}
	}>
	maxY: number
}

export function buildSchemaLayoutForRoute(
	spec: ReviewSpec,
	specSide: SpecSide,
	route: ReviewRoute,
	routeShape: ShapeMetrics,
	direction: 1 | -1
): SchemaLayoutOutput {
	const shapes: SchemaLayoutOutput['shapes'] = []
	const bindings: SchemaLayoutOutput['bindings'] = []

	const routeRows = buildRouteRowLayout(route)
	const queue: QueueItem[] = []
	for (const row of routeRows) {
		const targets = collectSchemaTargets(row.field, spec)
		for (const target of targets) {
			const ancestry = new Set<string>()
			const key = target.key
			ancestry.add(key)
			queue.push({
				sourceShape: routeShape,
				sourceRowOffset: row.yOffset,
				depth: 1,
				target,
				ancestry,
			})
		}
	}

	const columnNextY = new Map<number, number>()
	let maxY = routeShape.y + routeShape.h

	let nodeIndex = 0
	while (queue.length > 0) {
		const item = queue.shift()!
		const depth = item.depth
		const columnY = columnNextY.get(depth) ?? routeShape.y

		const nodeLayout = buildSchemaNodeLayout(item.target.node, spec)
		const nodeHeight = Math.max(SCHEMA_MIN_HEIGHT, nodeLayout.height)

		const idealY = item.sourceShape.y + item.sourceRowOffset - nodeHeight / 2
		const y = Math.max(idealY, columnY)
		const x = getSchemaNodeX(routeShape, direction, depth)

		const nodeId = createShapeId(
			`schema-${specSide}-${route.operationId}-${depth}-${nodeIndex}-${sanitizeId(
				item.target.key
			)}`
		)
		nodeIndex += 1

		shapes.push({
			id: nodeId,
			type: SCHEMA_NODE_TYPE,
			x,
			y,
			props: {
				w: SCHEMA_WIDTH,
				h: nodeHeight,
				specSide,
				title: item.target.title,
				subtitle: item.target.subtitle,
				schemaName: item.target.schemaName,
				fieldId: item.target.schemaName ? undefined : item.target.node.id,
			},
		})

		const nodeMetrics: ShapeMetrics = { id: nodeId, x, y, w: SCHEMA_WIDTH, h: nodeHeight }
		columnNextY.set(depth, y + nodeHeight + SCHEMA_GAP_Y)
		maxY = Math.max(maxY, y + nodeHeight)

		const sourceAnchor = {
			x: direction === 1 ? 1 : 0,
			y: clamp(item.sourceRowOffset / item.sourceShape.h),
		}
		const targetAnchor = {
			x: direction === 1 ? 0 : 1,
			y: clamp((item.sourceShape.y + item.sourceRowOffset - y) / nodeHeight),
		}

		const sourcePoint = anchorPoint(item.sourceShape, sourceAnchor)
		const targetPoint = anchorPoint(nodeMetrics, targetAnchor)

		const arrowId = createShapeId(
			`arrow-${specSide}-${route.operationId}-${nodeId.toString()}`
		)
		const arrowX = Math.min(sourcePoint.x, targetPoint.x)
		const arrowY = Math.min(sourcePoint.y, targetPoint.y)

		shapes.push({
			id: arrowId,
			type: 'arrow',
			x: arrowX,
			y: arrowY,
			props: {
				start: { x: sourcePoint.x - arrowX, y: sourcePoint.y - arrowY },
				end: { x: targetPoint.x - arrowX, y: targetPoint.y - arrowY },
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
			},
		})

		bindings.push(
			{
				fromId: arrowId,
				toId: item.sourceShape.id,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: sourceAnchor,
					isExact: false,
					isPrecise: true,
				},
			},
			{
				fromId: arrowId,
				toId: nodeMetrics.id,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: targetAnchor,
					isExact: false,
					isPrecise: true,
				},
			}
		)

		for (const row of nodeLayout.rows) {
			const targets = collectSchemaTargets(row.field, spec)
			for (const target of targets) {
				if (item.ancestry.has(target.key)) continue
				const nextAncestry = new Set(item.ancestry)
				nextAncestry.add(target.key)
				queue.push({
					sourceShape: nodeMetrics,
					sourceRowOffset: row.yOffset,
					depth: depth + 1,
					target,
					ancestry: nextAncestry,
				})
			}
		}
	}

	return { shapes, bindings, maxY }
}

function buildRouteRowLayout(route: ReviewRoute): RowLayout[] {
	const rows: RowLayout[] = []
	let y = CARD_HEADER_HEIGHT

	if (route.parameters.length > 0) {
		y += SECTION_HEADER_HEIGHT
		for (const param of route.parameters) {
			rows.push({ field: param, yOffset: y + FIELD_ROW_HEIGHT / 2 })
			y += FIELD_ROW_HEIGHT
		}
	}

	if (route.requestBody) {
		y += SECTION_HEADER_HEIGHT
		const fields = route.requestBody.schema.children ?? [route.requestBody.schema]
		for (const field of fields) {
			rows.push({ field, yOffset: y + FIELD_ROW_HEIGHT / 2 })
			y += FIELD_ROW_HEIGHT
		}
	}

	for (const resp of route.responses) {
		y += SECTION_HEADER_HEIGHT
		if (!resp.schema) continue
		const fields = resp.schema.children ?? [resp.schema]
		for (const field of fields) {
			rows.push({ field, yOffset: y + FIELD_ROW_HEIGHT / 2 })
			y += FIELD_ROW_HEIGHT
		}
	}

	return rows
}

function buildSchemaNodeLayout(
	root: ReviewFieldNode,
	spec: ReviewSpec
): { rows: RowLayout[]; height: number } {
	const rows: RowLayout[] = []
	let y = SCHEMA_HEADER_HEIGHT

	const resolvedRoot = resolveRefRoot(root, spec)
	const fields =
		resolvedRoot.children && resolvedRoot.children.length > 0 ? resolvedRoot.children : [resolvedRoot]
	for (const field of fields) {
		rows.push({ field, yOffset: y + FIELD_ROW_HEIGHT / 2 })
		y += FIELD_ROW_HEIGHT
	}

	return { rows, height: y + 8 }
}

function resolveRefRoot(root: ReviewFieldNode, spec: ReviewSpec): ReviewFieldNode {
	let current = root
	const seen = new Set<string>()
	while (current.typeKind === 'ref' && current.refTarget) {
		if (seen.has(current.refTarget)) break
		seen.add(current.refTarget)
		const next = spec.schemas.get(current.refTarget)
		if (!next) break
		current = next.root
	}
	return current
}

function collectSchemaTargets(field: ReviewFieldNode, spec: ReviewSpec): SchemaTarget[] {
	switch (field.typeKind) {
		case 'ref': {
			if (!field.refTarget) return []
			const schema = spec.schemas.get(field.refTarget)
			if (!schema) return []
			return [
				{
					node: schema.root,
					title: field.refTarget,
					subtitle: field.displayName !== field.refTarget ? field.displayName : undefined,
					schemaName: field.refTarget,
					key: `ref:${field.refTarget}`,
				},
			]
		}
		case 'object':
			return [
				{
					node: field,
					title: field.displayName,
					key: `field:${field.id}`,
				},
			]
		case 'array': {
			if (!field.items) return []
			const target = collectSchemaTargets(field.items, spec)
			return target.map((entry) => ({
				...entry,
				title: entry.schemaName ? entry.title : `${field.displayName}[]`,
				subtitle: entry.schemaName ? `${field.displayName}[]` : entry.subtitle,
				key: `array:${field.id}:${entry.key}`,
			}))
		}
		case 'union': {
			if (!field.variants) return []
			const results: SchemaTarget[] = []
			field.variants.forEach((variant, idx) => {
				const targets = collectSchemaTargets(variant, spec)
				for (const entry of targets) {
					results.push({
						...entry,
						subtitle: `${field.displayName} (variant ${idx + 1})`,
						key: `union:${field.id}:${idx}:${entry.key}`,
					})
				}
			})
			return results
		}
		default:
			return []
	}
}

function getSchemaNodeX(routeShape: ShapeMetrics, direction: 1 | -1, depth: number): number {
	if (direction === 1) {
		return routeShape.x + routeShape.w + SCHEMA_GAP_X + (depth - 1) * (SCHEMA_WIDTH + SCHEMA_GAP_X)
	}
	return (
		routeShape.x -
		SCHEMA_GAP_X -
		SCHEMA_WIDTH -
		(depth - 1) * (SCHEMA_WIDTH + SCHEMA_GAP_X)
	)
}

function anchorPoint(shape: ShapeMetrics, anchor: { x: number; y: number }) {
	return {
		x: shape.x + shape.w * anchor.x,
		y: shape.y + shape.h * anchor.y,
	}
}

function clamp(value: number) {
	if (value < 0) return 0
	if (value > 1) return 1
	return value
}

function sanitizeId(value: string) {
	return value.replace(/[^a-zA-Z0-9-_]+/g, '-')
}
