import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Editor } from 'tldraw'
import {
	addEnumValue,
	addField,
	addObjectProperty,
	addUnionVariant,
	changeFieldType,
	changeRefTarget,
	deleteField,
	findFieldById,
	openSidePanel,
	removeEnumValue,
	removeObjectProperty,
	removeUnionVariant,
	renameField,
	toggleNullable,
	toggleRequired,
} from '../review-ir/side-panel'
import type {
	ReviewFieldNode,
	ReviewSpec,
	SidePanelState,
	SpecSide,
} from '../review-ir/types'

interface ReviewContextValue {
	v3Spec: ReviewSpec | null
	v4Spec: ReviewSpec | null
	setV3Spec: (spec: ReviewSpec) => void
	setV4Spec: (spec: ReviewSpec) => void
	sidePanelState: SidePanelState | null
	selectField: (field: ReviewFieldNode, side: SpecSide) => void
	closeSidePanel: () => void
	setSidePanelState: (state: SidePanelState | null) => void
	editRenameField: (fieldId: string, newName: string) => void
	editChangeFieldType: (fieldId: string, newType: string) => void
	editToggleRequired: (fieldId: string) => void
	editToggleNullable: (fieldId: string) => void
	editChangeRefTarget: (fieldId: string, newRef: string) => void
	editAddEnumValue: (fieldId: string, value: string) => void
	editRemoveEnumValue: (fieldId: string, value: string) => void
	editAddObjectProperty: (parentFieldId: string, property: ReviewFieldNode) => void
	editRemoveObjectProperty: (parentFieldId: string, propertyName: string) => void
	editAddUnionVariant: (fieldId: string, variant: ReviewFieldNode) => void
	editRemoveUnionVariant: (fieldId: string, variantIndex: number) => void
	editDeleteField: (fieldId: string) => void
	editAddField: (parentFieldId: string, field: ReviewFieldNode) => void
	editorRef: React.MutableRefObject<Editor | null>
}

const ReviewContext = createContext<ReviewContextValue | null>(null)

export function ReviewProvider({ children }: { children: ReactNode }) {
	const [v3Spec, setV3Spec] = useState<ReviewSpec | null>(null)
	const [v4Spec, setV4Spec] = useState<ReviewSpec | null>(null)
	const [sidePanelState, setSidePanelState] = useState<SidePanelState | null>(null)
	const editorRef = useRef<Editor | null>(null)

	const selectField = useCallback((field: ReviewFieldNode, side: SpecSide) => {
		setSidePanelState(openSidePanel(field, side))
	}, [])

	const closeSidePanel = useCallback(() => {
		setSidePanelState(null)
	}, [])

	const applyV4Edit = useCallback(
		(editFn: (spec: ReviewSpec) => ReviewSpec) => {
			setV4Spec((prevSpec) => {
				if (!prevSpec) return prevSpec
				const updated = editFn(prevSpec)
				if (updated === prevSpec) return prevSpec

				setSidePanelState((prevPanel) => {
					if (!prevPanel || prevPanel.side !== 'v4') return prevPanel
					const refreshedField = findFieldById(updated, prevPanel.currentField.id)
					if (!refreshedField) return prevPanel
					return {
						...prevPanel,
						currentField: refreshedField,
						breadcrumbs: prevPanel.breadcrumbs.map((bc) => {
							const refreshedBc = findFieldById(updated, bc.fieldNode.id)
							if (!refreshedBc) return bc
							return { ...bc, fieldNode: refreshedBc, label: refreshedBc.displayName }
						}),
					}
				})

				return updated
			})
		},
		[]
	)

	const editRenameField = useCallback(
		(fieldId: string, newName: string) => applyV4Edit((s) => renameField(s, fieldId, newName)),
		[applyV4Edit]
	)
	const editChangeFieldType = useCallback(
		(fieldId: string, newType: string) => applyV4Edit((s) => changeFieldType(s, fieldId, newType)),
		[applyV4Edit]
	)
	const editToggleRequired = useCallback(
		(fieldId: string) => applyV4Edit((s) => toggleRequired(s, fieldId)),
		[applyV4Edit]
	)
	const editToggleNullable = useCallback(
		(fieldId: string) => applyV4Edit((s) => toggleNullable(s, fieldId)),
		[applyV4Edit]
	)
	const editChangeRefTarget = useCallback(
		(fieldId: string, newRef: string) => applyV4Edit((s) => changeRefTarget(s, fieldId, newRef)),
		[applyV4Edit]
	)
	const editAddEnumValue = useCallback(
		(fieldId: string, value: string) => applyV4Edit((s) => addEnumValue(s, fieldId, value)),
		[applyV4Edit]
	)
	const editRemoveEnumValue = useCallback(
		(fieldId: string, value: string) => applyV4Edit((s) => removeEnumValue(s, fieldId, value)),
		[applyV4Edit]
	)
	const editAddObjectProperty = useCallback(
		(parentFieldId: string, property: ReviewFieldNode) =>
			applyV4Edit((s) => addObjectProperty(s, parentFieldId, property)),
		[applyV4Edit]
	)
	const editRemoveObjectProperty = useCallback(
		(parentFieldId: string, propertyName: string) =>
			applyV4Edit((s) => removeObjectProperty(s, parentFieldId, propertyName)),
		[applyV4Edit]
	)
	const editAddUnionVariant = useCallback(
		(fieldId: string, variant: ReviewFieldNode) =>
			applyV4Edit((s) => addUnionVariant(s, fieldId, variant)),
		[applyV4Edit]
	)
	const editRemoveUnionVariant = useCallback(
		(fieldId: string, variantIndex: number) =>
			applyV4Edit((s) => removeUnionVariant(s, fieldId, variantIndex)),
		[applyV4Edit]
	)
	const editDeleteField = useCallback(
		(fieldId: string) => applyV4Edit((s) => deleteField(s, fieldId)),
		[applyV4Edit]
	)
	const editAddField = useCallback(
		(parentFieldId: string, field: ReviewFieldNode) =>
			applyV4Edit((s) => addField(s, parentFieldId, field)),
		[applyV4Edit]
	)

	return (
		<ReviewContext.Provider
			value={{
				v3Spec,
				v4Spec,
				setV3Spec,
				setV4Spec,
				sidePanelState,
				selectField,
				closeSidePanel,
				setSidePanelState,
				editRenameField,
				editChangeFieldType,
				editToggleRequired,
				editToggleNullable,
				editChangeRefTarget,
				editAddEnumValue,
				editRemoveEnumValue,
				editAddObjectProperty,
				editRemoveObjectProperty,
				editAddUnionVariant,
				editRemoveUnionVariant,
				editDeleteField,
				editAddField,
				editorRef,
			}}
		>
			{children}
		</ReviewContext.Provider>
	)
}

export function useReviewContext(): ReviewContextValue {
	const ctx = useContext(ReviewContext)
	if (!ctx) throw new Error('useReviewContext must be used within ReviewProvider')
	return ctx
}
