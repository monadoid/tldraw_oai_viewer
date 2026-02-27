import { generateTypeSummary } from './type-summary'
import type { ReviewFieldNode, ReviewSchema, ReviewSpec, SidePanelState, SpecSide } from './types'

/**
 * Search the entire spec tree for a field node by ID.
 * Returns the field if found, or null if not.
 */
export function findFieldById(spec: ReviewSpec, fieldId: string): ReviewFieldNode | null {
	function searchNode(node: ReviewFieldNode): ReviewFieldNode | null {
		if (node.id === fieldId) return node
		if (node.children) {
			for (const child of node.children) {
				const found = searchNode(child)
				if (found) return found
			}
		}
		if (node.items) {
			const found = searchNode(node.items)
			if (found) return found
		}
		if (node.variants) {
			for (const variant of node.variants) {
				const found = searchNode(variant)
				if (found) return found
			}
		}
		return null
	}

	for (const route of spec.routes) {
		for (const param of route.parameters) {
			const found = searchNode(param)
			if (found) return found
		}
		if (route.requestBody) {
			const found = searchNode(route.requestBody.schema)
			if (found) return found
		}
		for (const resp of route.responses) {
			if (resp.schema) {
				const found = searchNode(resp.schema)
				if (found) return found
			}
		}
	}

	for (const [, schema] of spec.schemas) {
		const found = searchNode(schema.root)
		if (found) return found
	}

	return null
}

/**
 * Create initial side panel state for a selected field.
 */
export function openSidePanel(
	field: ReviewFieldNode,
	side: SpecSide
): SidePanelState {
	return {
		side,
		currentField: field,
		breadcrumbs: [{ label: field.name, fieldNode: field }],
		editable: side === 'v4',
	}
}

/**
 * Drill down into a nested field/ref in the side panel.
 * The caller is responsible for resolving $refs before calling this.
 */
export function drillDown(
	state: SidePanelState,
	targetField: ReviewFieldNode
): SidePanelState {
	return {
		...state,
		currentField: targetField,
		breadcrumbs: [
			...state.breadcrumbs,
			{ label: targetField.name, fieldNode: targetField },
		],
	}
}

/**
 * Navigate back one breadcrumb level.
 */
export function navigateBack(state: SidePanelState): SidePanelState {
	if (state.breadcrumbs.length <= 1) return state

	const newBreadcrumbs = state.breadcrumbs.slice(0, -1)
	const previousEntry = newBreadcrumbs[newBreadcrumbs.length - 1]

	return {
		...state,
		currentField: previousEntry.fieldNode,
		breadcrumbs: newBreadcrumbs,
	}
}

// ---- V4 Editing Operations ----
// All editing functions are immutable: they return a new ReviewSpec.
// If the target field ID is not found, the original spec is returned unchanged.

export function renameField(
	spec: ReviewSpec,
	fieldId: string,
	newName: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		displayName: newName,
	}))
}

export function changeFieldType(
	spec: ReviewSpec,
	fieldId: string,
	newType: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => {
		const updated = { ...field, typeSummary: newType, typeKind: 'primitive' as const }
		updated.typeSummary = newType
		return updated
	})
}

export function toggleRequired(
	spec: ReviewSpec,
	fieldId: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		required: !field.required,
	}))
}

export function toggleNullable(
	spec: ReviewSpec,
	fieldId: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => {
		const updated = { ...field, nullable: !field.nullable }
		updated.typeSummary = generateTypeSummary(updated)
		return updated
	})
}

export function changeRefTarget(
	spec: ReviewSpec,
	fieldId: string,
	newRef: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => {
		const updated = { ...field, refTarget: newRef }
		updated.typeSummary = generateTypeSummary(updated)
		return updated
	})
}

export function addEnumValue(
	spec: ReviewSpec,
	fieldId: string,
	value: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		enumValues: [...(field.enumValues ?? []), value],
	}))
}

export function removeEnumValue(
	spec: ReviewSpec,
	fieldId: string,
	value: string
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		enumValues: (field.enumValues ?? []).filter((v) => v !== value),
	}))
}

export function addObjectProperty(
	spec: ReviewSpec,
	parentFieldId: string,
	property: ReviewFieldNode
): ReviewSpec {
	return updateFieldById(spec, parentFieldId, (field) => ({
		...field,
		children: [...(field.children ?? []), property],
	}))
}

export function removeObjectProperty(
	spec: ReviewSpec,
	parentFieldId: string,
	propertyName: string
): ReviewSpec {
	return updateFieldById(spec, parentFieldId, (field) => ({
		...field,
		children: (field.children ?? []).filter((c) => c.name !== propertyName),
	}))
}

export function addUnionVariant(
	spec: ReviewSpec,
	fieldId: string,
	variant: ReviewFieldNode
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		variants: [...(field.variants ?? []), variant],
	}))
}

export function removeUnionVariant(
	spec: ReviewSpec,
	fieldId: string,
	variantIndex: number
): ReviewSpec {
	return updateFieldById(spec, fieldId, (field) => ({
		...field,
		variants: (field.variants ?? []).filter((_, i) => i !== variantIndex),
	}))
}

export function deleteField(
	spec: ReviewSpec,
	fieldId: string
): ReviewSpec {
	return removeFieldById(spec, fieldId)
}

export function addField(
	spec: ReviewSpec,
	parentFieldId: string,
	field: ReviewFieldNode
): ReviewSpec {
	return addObjectProperty(spec, parentFieldId, field)
}

// ---- Internal helpers ----

/**
 * Deep-clone and update a single field node by ID across the entire spec.
 * Returns the original spec if the field ID is not found.
 */
function updateFieldById(
	spec: ReviewSpec,
	fieldId: string,
	updater: (field: ReviewFieldNode) => ReviewFieldNode
): ReviewSpec {
	let found = false

	function updateNode(node: ReviewFieldNode): ReviewFieldNode {
		if (node.id === fieldId) {
			found = true
			return updater(node)
		}

		let changed = false
		let newChildren = node.children
		let newItems = node.items
		let newVariants = node.variants

		if (node.children) {
			newChildren = node.children.map((c) => {
				const updated = updateNode(c)
				if (updated !== c) changed = true
				return updated
			})
		}
		if (node.items) {
			const updatedItems = updateNode(node.items)
			if (updatedItems !== node.items) {
				newItems = updatedItems
				changed = true
			}
		}
		if (node.variants) {
			newVariants = node.variants.map((v) => {
				const updated = updateNode(v)
				if (updated !== v) changed = true
				return updated
			})
		}

		if (!changed) return node
		return { ...node, children: newChildren, items: newItems, variants: newVariants }
	}

	const newRoutes = spec.routes.map((route) => {
		let routeChanged = false
		const newParams = route.parameters.map((p) => {
			const updated = updateNode(p)
			if (updated !== p) routeChanged = true
			return updated
		})

		let newRequestBody = route.requestBody
		if (route.requestBody) {
			const updatedSchema = updateNode(route.requestBody.schema)
			if (updatedSchema !== route.requestBody.schema) {
				newRequestBody = { ...route.requestBody, schema: updatedSchema }
				routeChanged = true
			}
		}

		const newResponses = route.responses.map((resp) => {
			if (!resp.schema) return resp
			const updatedSchema = updateNode(resp.schema)
			if (updatedSchema !== resp.schema) {
				return { ...resp, schema: updatedSchema }
			}
			return resp
		})
		if (newResponses.some((r, i) => r !== route.responses[i])) routeChanged = true

		if (!routeChanged) return route
		return {
			...route,
			parameters: newParams,
			requestBody: newRequestBody,
			responses: newResponses,
		}
	})

	const newSchemas = new Map<string, ReviewSchema>()
	for (const [name, schema] of spec.schemas) {
		const updatedRoot = updateNode(schema.root)
		if (updatedRoot !== schema.root) {
			newSchemas.set(name, { ...schema, root: updatedRoot })
		} else {
			newSchemas.set(name, schema)
		}
	}

	if (!found) return spec
	return { ...spec, routes: newRoutes, schemas: newSchemas }
}

/**
 * Remove a field by ID from its parent object's children.
 * Returns the original spec if the field ID is not found.
 */
function removeFieldById(spec: ReviewSpec, fieldId: string): ReviewSpec {
	let found = false

	function removeFromNode(node: ReviewFieldNode): ReviewFieldNode {
		let changed = false
		let newChildren = node.children
		let newItems = node.items
		let newVariants = node.variants

		if (node.children) {
			const filtered = node.children.filter((c) => {
				if (c.id === fieldId) {
					found = true
					return false
				}
				return true
			})
			if (filtered.length !== node.children.length) {
				newChildren = filtered
				changed = true
			} else {
				newChildren = node.children.map((c) => {
					const updated = removeFromNode(c)
					if (updated !== c) changed = true
					return updated
				})
			}
		}
		if (node.items) {
			const updated = removeFromNode(node.items)
			if (updated !== node.items) {
				newItems = updated
				changed = true
			}
		}
		if (node.variants) {
			newVariants = node.variants.map((v) => {
				const updated = removeFromNode(v)
				if (updated !== v) changed = true
				return updated
			})
		}

		if (!changed) return node
		return { ...node, children: newChildren, items: newItems, variants: newVariants }
	}

	const newRoutes = spec.routes.map((route) => {
		let routeChanged = false
		const newParams = route.parameters.filter((p) => {
			if (p.id === fieldId) { found = true; return false }
			return true
		})
		if (newParams.length !== route.parameters.length) routeChanged = true

		let newRequestBody = route.requestBody
		if (route.requestBody) {
			const updatedSchema = removeFromNode(route.requestBody.schema)
			if (updatedSchema !== route.requestBody.schema) {
				newRequestBody = { ...route.requestBody, schema: updatedSchema }
				routeChanged = true
			}
		}

		const newResponses = route.responses.map((resp) => {
			if (!resp.schema) return resp
			const updatedSchema = removeFromNode(resp.schema)
			if (updatedSchema !== resp.schema) return { ...resp, schema: updatedSchema }
			return resp
		})
		if (newResponses.some((r, i) => r !== route.responses[i])) routeChanged = true

		if (!routeChanged) return route
		return { ...route, parameters: newParams, requestBody: newRequestBody, responses: newResponses }
	})

	const newSchemas = new Map<string, ReviewSchema>()
	for (const [name, schema] of spec.schemas) {
		const updatedRoot = removeFromNode(schema.root)
		if (updatedRoot !== schema.root) {
			newSchemas.set(name, { ...schema, root: updatedRoot })
		} else {
			newSchemas.set(name, schema)
		}
	}

	if (!found) return spec
	return { ...spec, routes: newRoutes, schemas: newSchemas }
}
