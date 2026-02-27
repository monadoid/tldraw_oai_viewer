import { useCallback } from 'react'
import { Tldraw, type Editor, type TLComponents, type TLStore } from 'tldraw'
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

const customShapeUtils = [RouteCardShapeUtil, SchemaNodeShapeUtil]

function NoStylePanel() {
	return null
}

const customComponents: TLComponents = {
	StylePanel: NoStylePanel,
}

export function App({ store, onEditorReady }: { store?: TLStore; onEditorReady?: (editor: Editor) => void }) {
	return (
		<ReviewProvider>
			<AppInner store={store} onEditorReady={onEditorReady} />
		</ReviewProvider>
	)
}

function AppInner({ store, onEditorReady }: { store?: TLStore; onEditorReady?: (editor: Editor) => void }) {
	const { setV3Spec, setV4Spec, sidePanelState, editorRef } = useReviewContext()

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			const loadSpecs = async () => {
				try {
					const [v3, v4] = await Promise.all([
						parseOpenApiToReviewSpec(v3YamlRaw, 'v3'),
						parseOpenApiToReviewSpec(v4YamlRaw, 'v4'),
					])

					setV3Spec(v3)
					setV4Spec(v4)

					const pairs = buildRouteCardPairs(v3, v4)
					layoutRouteCards(editor, pairs, v3, v4)

					editor.zoomToFit({ animation: { duration: 300 } })
				} catch (err) {
					console.error('Failed to load OpenAPI specs:', err)
				}
			}

			void loadSpecs()
			onEditorReady?.(editor)
		},
		[editorRef, onEditorReady, setV3Spec, setV4Spec]
	)

	return (
		<div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw
					shapeUtils={customShapeUtils}
					components={customComponents}
					onMount={handleMount}
					store={store}
				/>
			</div>
			{sidePanelState && <SidePanel />}
		</div>
	)
}
