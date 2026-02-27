import type { ReviewFieldNode } from './types'

/**
 * Generate a compact, human-readable type summary string for a field node.
 *
 * Examples:
 *   "string", "boolean", "number"
 *   "ActOptions"          (for $ref)
 *   "array<Action>"       (for array of refs)
 *   "string | Action"     (for union)
 *   "string?"             (for nullable)
 *   "string (enum)"       (for enum type)
 */
export function generateTypeSummary(fieldNode: ReviewFieldNode): string {
	let base: string

	switch (fieldNode.typeKind) {
		case 'primitive':
			base = fieldNode.typeSummary || 'unknown'
			break
		case 'ref':
			base = fieldNode.refTarget || 'unknown'
			break
		case 'array': {
			const itemSummary = fieldNode.items ? generateTypeSummary(fieldNode.items) : 'unknown'
			base = `array<${itemSummary}>`
			break
		}
		case 'union': {
			const parts = (fieldNode.variants ?? []).map((v) => generateTypeSummary(v))
			base = parts.join(' | ')
			break
		}
		case 'enum':
			base = `${fieldNode.typeSummary || 'string'} (enum)`
			break
		case 'object':
			base = 'object'
			break
		case 'any':
			base = 'any'
			break
		default:
			base = 'unknown'
	}

	if (fieldNode.nullable) {
		base += '?'
	}

	return base
}
