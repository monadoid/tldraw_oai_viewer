import { useCallback, useEffect } from 'react'
import { Tldraw, defaultShapeUtils, type Editor, type TLComponents, type TLStore } from 'tldraw'
import 'tldraw/tldraw.css'
import { SidePanel } from './components/SidePanel'
import { parseOpenApiToReviewSpec } from './review-ir/parse-openapi'
import { buildRouteCardPairs } from './review-ir/route-cards'
import { RouteCardShapeUtil } from './shapes/RouteCardShapeUtil'
import { SchemaNodeShapeUtil } from './shapes/SchemaNodeShapeUtil'
import { layoutRouteCards } from './shapes/layout'
import { ReviewProvider, useReviewContext } from './state/ReviewContext'

import v3YamlRaw from '../../../openapi.v3.yaml?raw'
import v4YamlRaw from '../../../openapi.v4.yaml?raw'

const shapeUtils = [...defaultShapeUtils, RouteCardShapeUtil, SchemaNodeShapeUtil]

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

	const loadAndSetSpecs = useCallback(async () => {
		const [v3, v4] = await Promise.all([
			parseOpenApiToReviewSpec(v3YamlRaw, 'v3'),
			parseOpenApiToReviewSpec(v4YamlRaw, 'v4'),
		])
		setV3Spec(v3)
		setV4Spec(v4)
		return { v3, v4 }
	}, [setV3Spec, setV4Spec])

	const resetDocument = useCallback(async () => {
		const editor = editorRef.current
		if (!editor) return

		const { v3, v4 } = await loadAndSetSpecs()
		const existingShapeIds = Array.from(editor.getCurrentPageShapeIds())
		if (existingShapeIds.length > 0) {
			editor.deleteShapes(existingShapeIds)
		}

		const pairs = buildRouteCardPairs(v3, v4)
		layoutRouteCards(editor, pairs, v3, v4)
		editor.zoomToFit({ animation: { duration: 300 } })
	}, [editorRef, loadAndSetSpecs])

	useEffect(() => {
		onResetReady?.(resetDocument)
	}, [onResetReady, resetDocument])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			const loadSpecs = async () => {
				try {
					const { v3, v4 } = await loadAndSetSpecs()
					if (editor.getCurrentPageShapeIds().size === 0) {
						const pairs = buildRouteCardPairs(v3, v4)
						layoutRouteCards(editor, pairs, v3, v4)
						editor.zoomToFit({ animation: { duration: 300 } })
					}
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
