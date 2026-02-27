import { useCallback, useState } from 'react'
import { drillDown, navigateBack } from '../review-ir/side-panel'
import type { ReviewFieldNode } from '../review-ir/types'
import { useReviewContext } from '../state/ReviewContext'

const PANEL_WIDTH = 380

export function SidePanel() {
	const {
		sidePanelState,
		setSidePanelState,
		closeSidePanel,
		v3Spec,
		v4Spec,
		editRenameField,
		editChangeFieldType,
		editToggleRequired,
		editToggleNullable,
		editChangeRefTarget,
		editAddEnumValue,
		editRemoveEnumValue,
		editAddObjectProperty,
		editRemoveObjectProperty,
		editDeleteField,
		editRemoveUnionVariant,
		editorRef,
	} = useReviewContext()

	const blurEditor = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.selectNone()
		}
	}, [editorRef])

	if (!sidePanelState) return null

	const { currentField, breadcrumbs, side, editable } = sidePanelState
	const spec = side === 'v3' ? v3Spec : v4Spec

	const handleDrillDown = (field: ReviewFieldNode) => {
		if (field.typeKind === 'ref' && field.refTarget && spec) {
			const schema = spec.schemas.get(field.refTarget)
			if (schema) {
				setSidePanelState(drillDown(sidePanelState, schema.root))
				return
			}
		}
		setSidePanelState(drillDown(sidePanelState, field))
	}

	const handleBack = () => {
		setSidePanelState(navigateBack(sidePanelState))
	}

	const stop = (e: React.SyntheticEvent) => e.stopPropagation()

	const isObjectWithChildren = currentField.typeKind === 'object' && currentField.children && currentField.children.length > 0

	return (
		<div
			style={panelContainer}
			onPointerDown={(e) => { e.stopPropagation(); blurEditor() }}
			onPointerUp={stop}
			onClick={stop}
			onKeyDown={stop}
			onKeyUp={stop}
			onMouseDown={stop}
		>
			<PanelHeader
				breadcrumbs={breadcrumbs.map((b) => b.label)}
				side={side}
				editable={editable}
				onBack={handleBack}
				onClose={closeSidePanel}
				canGoBack={breadcrumbs.length > 1}
			/>
			<div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
				{isObjectWithChildren ? (
					<ObjectPropertiesView
						parentField={currentField}
						editable={editable}
						onDrillDown={handleDrillDown}
						onRename={editRenameField}
						onChangeType={editChangeFieldType}
						onToggleRequired={editToggleRequired}
						onToggleNullable={editToggleNullable}
						onChangeRefTarget={editChangeRefTarget}
						onRemoveProperty={editRemoveObjectProperty}
						onDeleteField={editDeleteField}
						onAddProperty={editAddObjectProperty}
						onAddEnumValue={editAddEnumValue}
						onRemoveEnumValue={editRemoveEnumValue}
						onRemoveUnionVariant={editRemoveUnionVariant}
					/>
				) : (
					<SingleFieldView
						field={currentField}
						editable={editable}
						onDrillDown={handleDrillDown}
						onRename={(name) => editRenameField(currentField.id, name)}
						onChangeType={(type) => editChangeFieldType(currentField.id, type)}
						onToggleRequired={() => editToggleRequired(currentField.id)}
						onToggleNullable={() => editToggleNullable(currentField.id)}
						onChangeRefTarget={(ref) => editChangeRefTarget(currentField.id, ref)}
						onAddEnumValue={(val) => editAddEnumValue(currentField.id, val)}
						onRemoveEnumValue={(val) => editRemoveEnumValue(currentField.id, val)}
						onDeleteField={() => editDeleteField(currentField.id)}
						onRemoveUnionVariant={(idx) => editRemoveUnionVariant(currentField.id, idx)}
					/>
				)}
			</div>
		</div>
	)
}

// ---- Object properties view: shows all children inline ----

function ObjectPropertiesView({
	parentField,
	editable,
	onDrillDown,
	onRename,
	onChangeType,
	onToggleRequired,
	onToggleNullable,
	onChangeRefTarget: _onChangeRefTarget,
	onRemoveProperty,
	onDeleteField,
	onAddProperty,
	onAddEnumValue,
	onRemoveEnumValue,
	onRemoveUnionVariant: _onRemoveUnionVariant,
}: {
	parentField: ReviewFieldNode
	editable: boolean
	onDrillDown: (field: ReviewFieldNode) => void
	onRename: (fieldId: string, newName: string) => void
	onChangeType: (fieldId: string, newType: string) => void
	onToggleRequired: (fieldId: string) => void
	onToggleNullable: (fieldId: string) => void
	onChangeRefTarget: (fieldId: string, newRef: string) => void
	onRemoveProperty: (parentFieldId: string, propertyName: string) => void
	onDeleteField: (fieldId: string) => void
	onAddProperty: (parentFieldId: string, prop: ReviewFieldNode) => void
	onAddEnumValue: (fieldId: string, val: string) => void
	onRemoveEnumValue: (fieldId: string, val: string) => void
	onRemoveUnionVariant: (fieldId: string, idx: number) => void
}) {
	const children = parentField.children ?? []

	return (
		<div style={{ fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
			<div style={objectHeaderStyle}>
				<span style={{ fontWeight: 700, color: '#111827' }}>{parentField.displayName}</span>
				<span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>{parentField.typeSummary}</span>
			</div>
			{parentField.description && (
				<div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8, lineHeight: '16px' }}>
					{parentField.description}
				</div>
			)}
			<div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
				Properties ({children.length})
			</div>
			{children.map((child) => {
				const isPrimitive = child.typeKind === 'primitive'
				const isEnum = child.typeKind === 'enum'
				const isInlineEditable = isPrimitive || isEnum

				if (isInlineEditable) {
					return (
						<PropertyCard
							key={child.id}
							field={child}
							editable={editable}
							onRename={(name) => onRename(child.id, name)}
							onChangeType={(type) => onChangeType(child.id, type)}
							onToggleRequired={() => onToggleRequired(child.id)}
							onToggleNullable={() => onToggleNullable(child.id)}
							onDelete={() => onDeleteField(child.id)}
							onAddEnumValue={isEnum ? (val) => onAddEnumValue(child.id, val) : undefined}
							onRemoveEnumValue={isEnum ? (val) => onRemoveEnumValue(child.id, val) : undefined}
						/>
					)
				}

				return (
					<DrillDownCard
						key={child.id}
						field={child}
						editable={editable}
						onClick={() => onDrillDown(child)}
						onRemove={() => onRemoveProperty(parentField.id, child.name)}
					/>
				)
			})}

			{editable && (
				<AddPropertyForm onAdd={(prop) => onAddProperty(parentField.id, prop)} />
			)}
		</div>
	)
}

// ---- Property card: inline editing for a single primitive/enum field ----

function PropertyCard({
	field,
	editable,
	onRename,
	onChangeType,
	onToggleRequired,
	onToggleNullable,
	onDelete,
	onAddEnumValue,
	onRemoveEnumValue,
}: {
	field: ReviewFieldNode
	editable: boolean
	onRename: (name: string) => void
	onChangeType: (type: string) => void
	onToggleRequired: () => void
	onToggleNullable: () => void
	onDelete: () => void
	onAddEnumValue?: (val: string) => void
	onRemoveEnumValue?: (val: string) => void
}) {
	return (
		<div style={propertyCardStyle}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
				{editable ? (
					<InlineEditText value={field.displayName} onCommit={onRename} style={{ fontWeight: 600, color: '#111827', fontSize: 13 }} />
				) : (
					<span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{field.displayName}</span>
				)}
				{editable && (
					<button onClick={onDelete} style={removeBtn} title="Remove property">×</button>
				)}
			</div>
			<div style={propRowStyle}>
				<span style={propLabelStyle}>type</span>
				{editable && field.typeKind === 'primitive' ? (
					<InlineEditText value={field.typeSummary} onCommit={onChangeType} style={{ color: '#6b7280', fontSize: 11 }} />
				) : (
					<span style={{ color: '#6b7280', fontSize: 11 }}>{field.typeSummary}</span>
				)}
			</div>
			<div style={propRowStyle}>
				<span style={propLabelStyle}>required</span>
				{editable ? (
					<ToggleButton value={field.required} onToggle={onToggleRequired} />
				) : (
					<span style={{ color: '#6b7280', fontSize: 11 }}>{field.required ? 'Yes' : 'No'}</span>
				)}
			</div>
			<div style={propRowStyle}>
				<span style={propLabelStyle}>nullable</span>
				{editable ? (
					<ToggleButton value={field.nullable} onToggle={onToggleNullable} />
				) : (
					<span style={{ color: '#6b7280', fontSize: 11 }}>{field.nullable ? 'Yes' : 'No'}</span>
				)}
			</div>
			{field.description && (
				<div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2, lineHeight: '14px' }}>{field.description}</div>
			)}
			{field.enumValues && field.enumValues.length > 0 && onAddEnumValue && onRemoveEnumValue && (
				<EnumSection values={field.enumValues} editable={editable} onAdd={onAddEnumValue} onRemove={onRemoveEnumValue} />
			)}
		</div>
	)
}

// ---- Drill-down card: for complex children (object, ref, union, array) ----

function DrillDownCard({
	field,
	editable,
	onClick,
	onRemove,
}: {
	field: ReviewFieldNode
	editable: boolean
	onClick: () => void
	onRemove: () => void
}) {
	return (
		<div style={{ ...propertyCardStyle, cursor: 'pointer', padding: '8px 10px' }} onClick={onClick}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					<span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{field.displayName}</span>
					<span style={{ color: '#6b7280', fontSize: 11 }}>{field.typeSummary}</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					{editable && (
						<button
							onClick={(e) => { e.stopPropagation(); onRemove() }}
							style={removeBtn}
							title="Remove property"
						>
							×
						</button>
					)}
					<span style={{ color: '#93c5fd', fontSize: 12 }}>→</span>
				</div>
			</div>
			{field.description && (
				<div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2, lineHeight: '14px' }}>{field.description}</div>
			)}
		</div>
	)
}

// ---- Single field view: used when drilled into a non-object field ----

function SingleFieldView({
	field,
	editable,
	onDrillDown,
	onRename,
	onChangeType,
	onToggleRequired,
	onToggleNullable,
	onChangeRefTarget: _onChangeRefTarget,
	onAddEnumValue,
	onRemoveEnumValue,
	onDeleteField,
	onRemoveUnionVariant,
}: {
	field: ReviewFieldNode
	editable: boolean
	onDrillDown: (field: ReviewFieldNode) => void
	onRename: (name: string) => void
	onChangeType: (type: string) => void
	onToggleRequired: () => void
	onToggleNullable: () => void
	onChangeRefTarget: (ref: string) => void
	onAddEnumValue: (val: string) => void
	onRemoveEnumValue: (val: string) => void
	onDeleteField: () => void
	onRemoveUnionVariant: (idx: number) => void
}) {
	return (
		<div style={{ fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
			{editable ? (
				<DetailRow label="Name"><InlineEditText value={field.displayName} onCommit={onRename} style={{ color: '#1a1a1a' }} /></DetailRow>
			) : (
				<DetailRow label="Name"><span style={{ color: '#6b7280' }}>{field.displayName}</span></DetailRow>
			)}

			{editable && field.typeKind === 'primitive' ? (
				<DetailRow label="Type"><InlineEditText value={field.typeSummary} onCommit={onChangeType} style={{ color: '#6b7280' }} /></DetailRow>
			) : (
				<DetailRow label="Type"><span style={{ color: '#6b7280' }}>{field.typeSummary}</span></DetailRow>
			)}

			<DetailRow label="Kind"><span style={{ color: '#6b7280' }}>{field.typeKind}</span></DetailRow>

			<DetailRow label="Required">
				{editable ? <ToggleButton value={field.required} onToggle={onToggleRequired} /> : <span style={{ color: '#6b7280' }}>{field.required ? 'Yes' : 'No'}</span>}
			</DetailRow>

			<DetailRow label="Nullable">
				{editable ? <ToggleButton value={field.nullable} onToggle={onToggleNullable} /> : <span style={{ color: '#6b7280' }}>{field.nullable ? 'Yes' : 'No'}</span>}
			</DetailRow>

			{field.description && <DetailRow label="Desc"><span style={{ color: '#6b7280' }}>{field.description}</span></DetailRow>}

			{field.refTarget && (
				<DetailRow label="$ref">
					<span onClick={() => onDrillDown(field)} style={linkStyle}>{field.refTarget}</span>
				</DetailRow>
			)}

			{field.enumValues !== undefined && (
				<EnumSection values={field.enumValues} editable={editable} onAdd={onAddEnumValue} onRemove={onRemoveEnumValue} />
			)}

			{field.variants && field.variants.length > 0 && (
				<div style={{ marginTop: 10 }}>
					<SectionLabel>Union variants</SectionLabel>
					{field.variants.map((v, i) => (
						<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0' }}>
							<span onClick={() => onDrillDown(v)} style={{ ...linkStyle, fontWeight: 500 }}>{v.displayName}</span>
							<span style={{ color: '#6b7280', fontSize: 11 }}>{v.typeSummary}</span>
							{editable && <button onClick={() => onRemoveUnionVariant(i)} style={removeBtn}>×</button>}
						</div>
					))}
				</div>
			)}

			{field.items && (
				<div style={{ marginTop: 10 }}>
					<SectionLabel>Array items</SectionLabel>
					<span onClick={() => onDrillDown(field.items!)} style={linkStyle}>{field.items.typeSummary}</span>
				</div>
			)}

			{editable && (
				<button onClick={onDeleteField} style={deleteBtnStyle}>Delete this field</button>
			)}
		</div>
	)
}

// ---- Shared components ----

function PanelHeader({ breadcrumbs, side, editable, onBack, onClose, canGoBack }: {
	breadcrumbs: string[]; side: string; editable: boolean; onBack: () => void; onClose: () => void; canGoBack: boolean
}) {
	return (
		<div style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
					{canGoBack && <button onClick={onBack} style={backBtn}>←</button>}
					<span style={{ fontSize: 10, fontWeight: 600, color: side === 'v3' ? '#6b7280' : '#2563eb', textTransform: 'uppercase' }}>
						{side} {editable ? '(edit)' : '(read-only)'}
					</span>
				</div>
				<button onClick={onClose} style={closeBtn}>×</button>
			</div>
			<div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{breadcrumbs.join(' › ')}</div>
		</div>
	)
}

function InlineEditText({ value, onCommit, style }: { value: string; onCommit: (val: string) => void; style?: React.CSSProperties }) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(value)

	const commit = () => {
		const trimmed = draft.trim()
		if (trimmed && trimmed !== value) onCommit(trimmed)
		setEditing(false)
	}

	if (!editing) {
		return (
			<span
				onClick={() => { setDraft(value); setEditing(true) }}
				style={{ ...style, cursor: 'pointer', borderBottom: '1px dashed #93c5fd', paddingBottom: 1 }}
				title="Click to edit"
			>
				{value}
			</span>
		)
	}

	return (
		<input
			autoFocus
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
			style={{ ...inputStyle, ...style, width: Math.max(60, value.length * 8) }}
		/>
	)
}

function ToggleButton({ value, onToggle }: { value: boolean; onToggle: () => void }) {
	return (
		<button onClick={onToggle} style={{
			border: `1px solid ${value ? '#86efac' : '#d1d5db'}`,
			background: value ? '#f0fdf4' : '#f9fafb',
			borderRadius: 4, cursor: 'pointer', fontSize: 10, padding: '1px 8px',
			color: value ? '#16a34a' : '#6b7280', fontWeight: 600, minWidth: 32,
		}}>
			{value ? 'Yes' : 'No'}
		</button>
	)
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f3f4f6', gap: 8 }}>
			<span style={{ width: 65, flexShrink: 0, fontWeight: 600, color: '#374151', fontSize: 11 }}>{label}</span>
			{children}
		</div>
	)
}

function EnumSection({ values, editable, onAdd, onRemove }: {
	values: string[]; editable: boolean; onAdd: (val: string) => void; onRemove: (val: string) => void
}) {
	const [newVal, setNewVal] = useState('')
	const handleAdd = () => { const t = newVal.trim(); if (t) { onAdd(t); setNewVal('') } }

	return (
		<div style={{ marginTop: 6 }}>
			<div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>enum</div>
			{values.map((v) => (
				<div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
					<span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280' }}>{v}</span>
					{editable && <button onClick={() => onRemove(v)} style={removeBtn}>×</button>}
				</div>
			))}
			{editable && (
				<div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
					<input value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} placeholder="Add..." style={{ ...inputStyle, flex: 1, fontSize: 10 }} />
					<button onClick={handleAdd} style={addBtn}>+</button>
				</div>
			)}
		</div>
	)
}

function AddPropertyForm({ onAdd }: { onAdd: (prop: ReviewFieldNode) => void }) {
	const [expanded, setExpanded] = useState(false)
	const [name, setName] = useState('')
	const [type, setType] = useState('string')

	const handleAdd = () => {
		const trimmed = name.trim()
		if (!trimmed) return
		onAdd({ id: `new-${Date.now()}-${trimmed}`, name: trimmed, displayName: trimmed, typeKind: 'primitive', typeSummary: type, required: false, nullable: false, location: 'request' })
		setName(''); setType('string'); setExpanded(false)
	}

	if (!expanded) {
		return <button onClick={() => setExpanded(true)} style={{ ...addBtn, width: '100%', marginTop: 8, padding: '6px 0' }}>+ Add property</button>
	}

	return (
		<div style={{ marginTop: 8, padding: 8, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
			<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Field name" style={{ ...inputStyle, width: '100%', marginBottom: 4 }} />
			<select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 6 }}>
				<option value="string">string</option>
				<option value="number">number</option>
				<option value="boolean">boolean</option>
				<option value="object">object</option>
			</select>
			<div style={{ display: 'flex', gap: 4 }}>
				<button onClick={handleAdd} style={{ ...addBtn, flex: 1 }}>Add</button>
				<button onClick={() => setExpanded(false)} style={{ ...addBtn, flex: 1, background: '#f9fafb', color: '#6b7280', border: '1px solid #d1d5db' }}>Cancel</button>
			</div>
		</div>
	)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{children}</div>
}

// ---- Styles ----

const panelContainer: React.CSSProperties = {
	width: PANEL_WIDTH, height: '100%', borderLeft: '1px solid #e5e7eb', background: '#fff',
	display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 9999,
}
const objectHeaderStyle: React.CSSProperties = {
	padding: '6px 0', marginBottom: 6, borderBottom: '2px solid #e5e7eb',
}
const propertyCardStyle: React.CSSProperties = {
	padding: '8px 10px', marginBottom: 6, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb',
}
const propRowStyle: React.CSSProperties = {
	display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
}
const propLabelStyle: React.CSSProperties = {
	width: 55, flexShrink: 0, fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
	fontSize: 12, padding: '2px 5px', border: '1px solid #d1d5db', borderRadius: 3, outline: 'none',
	fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fff',
}
const linkStyle: React.CSSProperties = { color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }
const backBtn: React.CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', color: '#6b7280' }
const closeBtn: React.CSSProperties = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: '0 4px' }
const addBtn: React.CSSProperties = {
	border: '1px solid #93c5fd', background: '#eff6ff', borderRadius: 4, cursor: 'pointer',
	fontSize: 11, padding: '3px 8px', color: '#2563eb', fontWeight: 600,
}
const removeBtn: React.CSSProperties = {
	border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '0 3px', lineHeight: 1, fontWeight: 700,
}
const deleteBtnStyle: React.CSSProperties = {
	marginTop: 12, width: '100%', padding: '5px 0', border: '1px solid #fca5a5',
	background: '#fef2f2', borderRadius: 4, cursor: 'pointer', color: '#dc2626', fontSize: 11, fontWeight: 600,
}
