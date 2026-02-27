import type { ReviewFieldNode, ReviewSchema, ReviewSpec, SpecSide } from '../review-ir/types'
import { findFieldById } from '../review-ir/side-panel'
import { useReviewContext } from '../state/ReviewContext'
import { SCHEMA_HEADER_HEIGHT } from '../shapes/layout-constants'
import { FieldRow } from './FieldRow'

interface SchemaNodeContentProps {
	specSide: SpecSide
	title: string
	subtitle?: string
	schemaName?: string
	fieldId?: string
	width: number
	height: number
}

export function SchemaNodeContent({
	specSide,
	title,
	subtitle,
	schemaName,
	fieldId,
	width,
	height,
}: SchemaNodeContentProps) {
	const { v3Spec, v4Spec } = useReviewContext()
	const spec = specSide === 'v3' ? v3Spec : v4Spec

	const fieldRoot = resolveFieldRoot(spec, schemaName, fieldId)
	const resolvedRoot = fieldRoot ? resolveRefRoot(fieldRoot, spec) : null
	const rows = resolvedRoot ? getDisplayRows(resolvedRoot) : []

	return (
		<div style={schemaShell(specSide, width, height)}>
			<div style={schemaHeaderStyle(specSide)}>
				<div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{title}</div>
				{subtitle && (
					<div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
				)}
			</div>
			<div style={{ overflowY: 'auto', flex: 1 }}>
				{rows.length === 0 && (
					<div style={{ padding: 8, fontSize: 11, color: '#6b7280' }}>No fields</div>
				)}
				{rows.map((field) => (
					<FieldRow key={field.id} field={field} specSide={specSide} />
				))}
			</div>
		</div>
	)
}

function resolveFieldRoot(
	spec: ReviewSpec | null,
	schemaName?: string,
	fieldId?: string
): ReviewFieldNode | null {
	if (!spec) return null
	if (schemaName) {
		const schema: ReviewSchema | undefined = spec.schemas.get(schemaName)
		return schema?.root ?? null
	}
	if (fieldId) {
		return findFieldById(spec, fieldId)
	}
	return null
}

function resolveRefRoot(root: ReviewFieldNode, spec: ReviewSpec | null): ReviewFieldNode {
	if (!spec) return root
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

function getDisplayRows(root: ReviewFieldNode): ReviewFieldNode[] {
	if (root.children && root.children.length > 0) return root.children
	return [root]
}

function schemaShell(specSide: SpecSide, width: number, height: number): React.CSSProperties {
	return {
		width,
		height,
		display: 'flex',
		flexDirection: 'column',
		background: '#ffffff',
		border: `1px solid ${specSide === 'v3' ? '#d1d5db' : '#7dd3fc'}`,
		borderRadius: 8,
		overflow: 'hidden',
		fontFamily: 'system-ui, -apple-system, sans-serif',
		boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
	}
}

function schemaHeaderStyle(specSide: SpecSide): React.CSSProperties {
	return {
		height: SCHEMA_HEADER_HEIGHT,
		boxSizing: 'border-box',
		padding: '6px 8px',
		borderBottom: '1px solid #e5e7eb',
		background: specSide === 'v3' ? '#fafafa' : '#f0f9ff',
		flexShrink: 0,
	}
}
