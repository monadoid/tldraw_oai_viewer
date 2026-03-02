import { useSync } from '@tldraw/sync'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { multiplayerAssetStore } from '../multiplayerAssetStore'
import { App } from '../api-review/src/App'
import { defaultShapeUtils } from 'tldraw'
import { ReviewStateShapeUtil } from '../api-review/src/shapes/ReviewStateShapeUtil'
import { RouteCardShapeUtil } from '../api-review/src/shapes/RouteCardShapeUtil'
import { SchemaNodeShapeUtil } from '../api-review/src/shapes/SchemaNodeShapeUtil'

export function Room() {
	const roomId = new URLSearchParams(window.location.search).get('room') ?? 'api-review'
	const resetDocumentRef = useRef<(() => Promise<void>) | null>(null)
	const [isResetting, setIsResetting] = useState(false)
	const shapeUtils = useMemo(
		() => [...defaultShapeUtils, RouteCardShapeUtil, SchemaNodeShapeUtil, ReviewStateShapeUtil],
		[]
	)

	// Create a store connected to multiplayer.
	const synced = useSync({
		// We need to know the websockets URI...
		uri: `${window.location.origin}/api/connect/${roomId}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssetStore,
		shapeUtils,
	})

	useEffect(() => {
		if (synced.status === 'error') {
			console.error('[sync-status] error', synced.error)
			return
		}
		console.log('[sync-status]', synced.status)
	}, [synced.status])

	const handleReset = useCallback(() => {
		if (!resetDocumentRef.current || isResetting) return
		setIsResetting(true)
		void resetDocumentRef.current().finally(() => {
			setIsResetting(false)
		})
	}, [isResetting])

	return (
		<RoomWrapper roomId={roomId} onReset={handleReset} isResetting={isResetting}>
			{synced.status === 'synced-remote' ? (
				<App
					store={synced.store}
					onEditorReady={(editor) => {
						;(window as Window & { __apiReviewEditor?: typeof editor }).__apiReviewEditor =
							editor
						editor.registerExternalAssetHandler('url', getBookmarkPreview)
					}}
					onResetReady={(resetDocument) => {
						resetDocumentRef.current = resetDocument
					}}
				/>
			) : synced.status === 'error' ? (
				<div style={{ padding: 16, fontFamily: 'Inter, sans-serif' }}>Sync error: {synced.error.message}</div>
			) : (
				<div style={{ padding: 16, fontFamily: 'Inter, sans-serif' }}>Connecting to sync…</div>
			)}
		</RoomWrapper>
	)
}

function RoomWrapper({
	children,
	roomId,
	onReset,
	isResetting,
}: {
	children: ReactNode
	roomId?: string
	onReset: () => void
	isResetting: boolean
}) {
	const [didCopy, setDidCopy] = useState(false)

	useEffect(() => {
		if (!didCopy) return
		const timeout = setTimeout(() => setDidCopy(false), 3000)
		return () => clearTimeout(timeout)
	}, [didCopy])

	return (
		<div className="RoomWrapper">
			<div className="RoomWrapper-header">
				<WifiIcon />
				<div>{roomId}</div>
				<button
					className="RoomWrapper-copy"
					onClick={() => {
						navigator.clipboard.writeText(window.location.href)
						setDidCopy(true)
					}}
					aria-label="copy room link"
				>
					Copy link
					{didCopy && <div className="RoomWrapper-copied">Copied!</div>}
				</button>
				<button className="RoomWrapper-reset" onClick={onReset} disabled={isResetting}>
					{isResetting ? 'Resetting…' : 'Reset'}
				</button>
			</div>
			<div className="RoomWrapper-content">{children}</div>
		</div>
	)
}

function WifiIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	)
}
