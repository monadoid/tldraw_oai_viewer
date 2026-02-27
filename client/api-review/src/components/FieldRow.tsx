import type { ReviewFieldNode, SpecSide } from '../review-ir/types'
import { FIELD_ROW_HEIGHT } from '../shapes/layout-constants'
import { useReviewContext } from '../state/ReviewContext'

interface FieldRowProps {
	field: ReviewFieldNode
	specSide: SpecSide
	indent?: number
}

const BADGE_STYLE: React.CSSProperties = {
	fontSize: 9,
	padding: '1px 4px',
	borderRadius: 3,
	fontWeight: 600,
	lineHeight: '14px',
}

export function FieldRow({ field, specSide, indent = 0 }: FieldRowProps) {
	const { selectField } = useReviewContext()

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		selectField(field, specSide)
	}

	return (
		<div
			onClick={handleClick}
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 6,
				padding: '3px 8px',
				paddingLeft: 8 + indent * 12,
				height: FIELD_ROW_HEIGHT,
				boxSizing: 'border-box',
				cursor: 'pointer',
				borderBottom: '1px solid #f0f0f0',
				fontSize: 12,
				fontFamily: 'system-ui, -apple-system, sans-serif',
				lineHeight: '20px',
			}}
			title={field.description || undefined}
		>
			<span style={{ fontWeight: 500, color: '#1a1a1a', minWidth: 0, flexShrink: 1 }}>
				{field.displayName}
			</span>
			<span style={{ color: '#6b7280', fontSize: 11, flexShrink: 0 }}>
				{field.typeSummary}
			</span>
			<span style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 'auto' }}>
				{field.required && (
					<span style={{ ...BADGE_STYLE, background: '#fef2f2', color: '#dc2626' }}>req</span>
				)}
				{field.nullable && (
					<span style={{ ...BADGE_STYLE, background: '#fffbeb', color: '#d97706' }}>null</span>
				)}
				{field.typeKind === 'enum' && (
					<span style={{ ...BADGE_STYLE, background: '#f0fdf4', color: '#16a34a' }}>enum</span>
				)}
				{field.typeKind === 'ref' && (
					<span style={{ ...BADGE_STYLE, background: '#eff6ff', color: '#2563eb' }}>ref</span>
				)}
				{field.typeKind === 'union' && (
					<span style={{ ...BADGE_STYLE, background: '#faf5ff', color: '#7c3aed' }}>union</span>
				)}
			</span>
		</div>
	)
}
