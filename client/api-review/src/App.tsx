import { useCallback, useEffect } from 'react'
import { Tldraw, defaultShapeUtils, type Editor, type TLComponents, type TLStore } from 'tldraw'
import 'tldraw/tldraw.css'
import { SidePanel } from './components/SidePanel'
import { parseOpenApiToReviewSpec } from './review-ir/parse-openapi'
import { buildRouteCardPairs } from './review-ir/route-cards'
import { RouteCardShapeUtil } from './shapes/RouteCardShapeUtil'
import { ReviewStateShapeUtil } from './shapes/ReviewStateShapeUtil'
import { SchemaNodeShapeUtil } from './shapes/SchemaNodeShapeUtil'
import { layoutRouteCards } from './shapes/layout'
import { getPersistedV4Spec, persistV4Spec } from './state/persistedSpec'
import { ReviewProvider, useReviewContext } from './state/ReviewContext'

import v3YamlRaw from '../../../openapi.v3.yaml?raw'
import v4YamlRaw from '../../../openapi.v4.yaml?raw'

const shapeUtils = [...defaultShapeUtils, RouteCardShapeUtil, SchemaNodeShapeUtil, ReviewStateShapeUtil]

function NoStylePanel() {
	return null
}

const customComponents: TLComponents = {
	StylePanel: NoStylePanel,
}

type AppProps = {
	store?: TLStore
	onEditorReady?: (editor: Editor) => void
	onResetReady?: (resetDocument: () => Promise<void>) => void
}

async function waitForPersistedV4Spec(editor: Editor, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const persisted = getPersistedV4Spec(editor)
		if (persisted) return persisted
		await new Promise((resolve) => setTimeout(resolve, 100))
	}
	return null
}

export function App({ store, onEditorReady, onResetReady }: AppProps) {
	return (
		<ReviewProvider>
			<AppInner store={store} onEditorReady={onEditorReady} onResetReady={onResetReady} />
		</ReviewProvider>
	)
}

function AppInner({
	store,
	onEditorReady,
	onResetReady,
}: {
	store?: TLStore
	onEditorReady?: (editor: Editor) => void
	onResetReady?: (resetDocument: () => Promise<void>) => void
}) {
	const { setV3Spec, setV4Spec, sidePanelState, editorRef } = useReviewContext()

	const loadAndSetSpecs = useCallback(async (editor?: Editor) => {
		const [v3, parsedV4] = await Promise.all([
			parseOpenApiToReviewSpec(v3YamlRaw, 'v3'),
			parseOpenApiToReviewSpec(v4YamlRaw, 'v4'),
		])
		const persistedV4 = editor
			? getPersistedV4Spec(editor) ?? (await waitForPersistedV4Spec(editor, 2000))
			: null
		const v4 = persistedV4 ?? parsedV4
		setV3Spec(v3)
		setV4Spec(v4)
		return { v3, v4, hasPersistedV4: !!persistedV4 }
	}, [setV3Spec, setV4Spec])

	const resetDocument = useCallback(async () => {
		const editor = editorRef.current
		if (!editor) return

		const { v3, v4 } = await loadAndSetSpecs(editor)
		const existingShapeIds = Array.from(editor.getCurrentPageShapeIds())
		if (existingShapeIds.length > 0) {
			editor.deleteShapes(existingShapeIds)
		}

		const pairs = buildRouteCardPairs(v3, v4)
		layoutRouteCards(editor, pairs, v3, v4)
		persistV4Spec(editor, v4)
		editor.zoomToFit({ animation: { duration: 300 } })
	}, [editorRef, loadAndSetSpecs])

	useEffect(() => {
		onResetReady?.(resetDocument)
	}, [onResetReady, resetDocument])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			;(window as Window & { __reviewReady?: boolean }).__reviewReady = false
			const loadSpecs = async () => {
				try {
					const { v3, v4, hasPersistedV4 } = await loadAndSetSpecs(editor)
					if (editor.getCurrentPageShapeIds().size === 0) {
						const pairs = buildRouteCardPairs(v3, v4)
						layoutRouteCards(editor, pairs, v3, v4)
						if (!hasPersistedV4) {
							persistV4Spec(editor, v4)
						}
						editor.zoomToFit({ animation: { duration: 300 } })
					}
					;(window as Window & { __reviewReady?: boolean }).__reviewReady = true
				} catch (err) {
					console.error('Failed to load OpenAPI specs:', err)
				}
			}

			void loadSpecs()
			onEditorReady?.(editor)
		},
		[editorRef, loadAndSetSpecs, onEditorReady]
	)

	return (
		<div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw
					licenseKey="tldraw-2026-06-10/WyJOVV9HdGJUMSIsWyIqIl0sMTYsIjIwMjYtMDYtMTAiXQ.dqDUHBzMLQhTH0jhrtCFrRLcWWm/9O4KCQShywb+BO9GsL/MaZ4mCAo2IxEoCPfgmOMtO9C+FHiO3j7XbE4Ggg"
					shapeUtils={shapeUtils}
					components={customComponents}
					onMount={handleMount}
					store={store}
				/>
			</div>
			{sidePanelState && <SidePanel />}
		</div>
	)
}
