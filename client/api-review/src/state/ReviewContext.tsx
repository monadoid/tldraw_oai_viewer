import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Editor } from 'tldraw'
import {
	addEnumValue,
	addField,
	addObjectProperty,
	addUnionVariant,
	changeFieldType,
	changeRefTarget,
	changeRoutePath,
	changeRouteMethod,
	deleteField,
	findFieldById,
	findRouteById,
	openRouteSidePanel,
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
	ReviewRoute,
	ReviewSpec,
	SidePanelState,
	SpecSide,
} from '../review-ir/types'
import { persistV4Spec } from './persistedSpec'

interface ReviewContextValue {
	v3Spec: ReviewSpec | null
	v4Spec: ReviewSpec | null
	setV3Spec: (spec: ReviewSpec) => void
	setV4Spec: (spec: ReviewSpec) => void
	sidePanelState: SidePanelState | null
	selectField: (field: ReviewFieldNode, side: SpecSide) => void
	selectRoute: (route: ReviewRoute, side: SpecSide) => void
	closeSidePanel: () => void
	setSidePanelState: (state: SidePanelState | null) => void
	editChangeRoutePath: (routeId: string, newPath: string) => void
	editChangeRouteMethod: (routeId: string, newMethod: string) => void
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

function logReviewEvent(event: string, details: Record<string, unknown>) {
	console.log(`[review-event] ${event}`, details)
}

export function ReviewProvider({ children }: { children: ReactNode }) {
	const [v3Spec, setV3Spec] = useState<ReviewSpec | null>(null)
	const [v4Spec, setV4Spec] = useState<ReviewSpec | null>(null)
	const [sidePanelState, setSidePanelState] = useState<SidePanelState | null>(null)
	const editorRef = useRef<Editor | null>(null)

	const selectField = useCallback((field: ReviewFieldNode, side: SpecSide) => {
		setSidePanelState(openSidePanel(field, side))
	}, [])

	const selectRoute = useCallback((route: ReviewRoute, side: SpecSide) => {
		setSidePanelState(openRouteSidePanel(route, side))
	}, [])

	const closeSidePanel = useCallback(() => {
		setSidePanelState(null)
	}, [])

	const applyV4Edit = useCallback(
		(event: string, details: Record<string, unknown>, editFn: (spec: ReviewSpec) => ReviewSpec) => {
			setV4Spec((prevSpec) => {
				if (!prevSpec) return prevSpec
				const updated = editFn(prevSpec)
				if (updated === prevSpec) return prevSpec
				logReviewEvent(event, details)
				if (editorRef.current) {
					persistV4Spec(editorRef.current, updated)
				}

				setSidePanelState((prevPanel) => {
					if (!prevPanel || prevPanel.side !== 'v4') return prevPanel

					let refreshedRoute = prevPanel.currentRoute
					if (refreshedRoute) {
						refreshedRoute = findRouteById(updated, refreshedRoute.id) ?? refreshedRoute
					}

					const refreshedField = findFieldById(updated, prevPanel.currentField.id)
					if (!refreshedField && !refreshedRoute) return prevPanel

					return {
						...prevPanel,
						currentField: refreshedField ?? prevPanel.currentField,
						currentRoute: refreshedRoute,
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
		[editorRef]
	)

	const editChangeRoutePath = useCallback(
		(routeId: string, newPath: string) =>
			applyV4Edit('change-route-path', { routeId, newPath }, (s) => changeRoutePath(s, routeId, newPath)),
		[applyV4Edit]
	)
	const editChangeRouteMethod = useCallback(
		(routeId: string, newMethod: string) =>
			applyV4Edit('change-route-method', { routeId, newMethod }, (s) => changeRouteMethod(s, routeId, newMethod)),
		[applyV4Edit]
	)
	const editRenameField = useCallback(
		(fieldId: string, newName: string) =>
			applyV4Edit('rename-field', { fieldId, newName }, (s) => renameField(s, fieldId, newName)),
		[applyV4Edit]
	)
	const editChangeFieldType = useCallback(
		(fieldId: string, newType: string) =>
			applyV4Edit('change-field-type', { fieldId, newType }, (s) => changeFieldType(s, fieldId, newType)),
		[applyV4Edit]
	)
	const editToggleRequired = useCallback(
		(fieldId: string) =>
			applyV4Edit('toggle-required', { fieldId }, (s) => toggleRequired(s, fieldId)),
		[applyV4Edit]
	)
	const editToggleNullable = useCallback(
		(fieldId: string) =>
			applyV4Edit('toggle-nullable', { fieldId }, (s) => toggleNullable(s, fieldId)),
		[applyV4Edit]
	)
	const editChangeRefTarget = useCallback(
		(fieldId: string, newRef: string) =>
			applyV4Edit('change-ref-target', { fieldId, newRef }, (s) => changeRefTarget(s, fieldId, newRef)),
		[applyV4Edit]
	)
	const editAddEnumValue = useCallback(
		(fieldId: string, value: string) =>
			applyV4Edit('add-enum-value', { fieldId, value }, (s) => addEnumValue(s, fieldId, value)),
		[applyV4Edit]
	)
	const editRemoveEnumValue = useCallback(
		(fieldId: string, value: string) =>
			applyV4Edit('remove-enum-value', { fieldId, value }, (s) => removeEnumValue(s, fieldId, value)),
		[applyV4Edit]
	)
	const editAddObjectProperty = useCallback(
		(parentFieldId: string, property: ReviewFieldNode) =>
			applyV4Edit('add-object-property', { parentFieldId, propertyName: property.name }, (s) =>
				addObjectProperty(s, parentFieldId, property)
			),
		[applyV4Edit]
	)
	const editRemoveObjectProperty = useCallback(
		(parentFieldId: string, propertyName: string) =>
			applyV4Edit('remove-object-property', { parentFieldId, propertyName }, (s) =>
				removeObjectProperty(s, parentFieldId, propertyName)
			),
		[applyV4Edit]
	)
	const editAddUnionVariant = useCallback(
		(fieldId: string, variant: ReviewFieldNode) =>
			applyV4Edit('add-union-variant', { fieldId, variantName: variant.name }, (s) =>
				addUnionVariant(s, fieldId, variant)
			),
		[applyV4Edit]
	)
	const editRemoveUnionVariant = useCallback(
		(fieldId: string, variantIndex: number) =>
			applyV4Edit('remove-union-variant', { fieldId, variantIndex }, (s) =>
				removeUnionVariant(s, fieldId, variantIndex)
			),
		[applyV4Edit]
	)
	const editDeleteField = useCallback(
		(fieldId: string) => applyV4Edit('delete-field', { fieldId }, (s) => deleteField(s, fieldId)),
		[applyV4Edit]
	)
	const editAddField = useCallback(
		(parentFieldId: string, field: ReviewFieldNode) =>
			applyV4Edit('add-field', { parentFieldId, fieldName: field.name }, (s) =>
				addField(s, parentFieldId, field)
			),
		[applyV4Edit]
	)

	useEffect(() => {
		;(window as Window & {
			__reviewDebug?: {
				renameField: (fieldId: string, newName: string) => void
				getFieldDisplayName: (fieldId: string) => string | null
				getFirstEditableFieldId: () => string | null
			}
		}).__reviewDebug = {
			renameField: editRenameField,
			getFieldDisplayName: (fieldId: string) => {
				if (!v4Spec) return null
				return findFieldById(v4Spec, fieldId)?.displayName ?? null
			},
			getFirstEditableFieldId: () => {
				if (!v4Spec) return null
				for (const route of v4Spec.routes) {
					if (route.parameters.length > 0) return route.parameters[0].id
				}
				return null
			},
		}
	}, [editRenameField, v4Spec])

	return (
		<ReviewContext.Provider
			value={{
				v3Spec,
				v4Spec,
				setV3Spec,
				setV4Spec,
				sidePanelState,
				selectField,
				selectRoute,
				closeSidePanel,
				setSidePanelState,
				editChangeRoutePath,
				editChangeRouteMethod,
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
