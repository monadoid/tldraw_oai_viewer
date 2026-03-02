import type { TLShape } from 'tldraw'

export const REVIEW_STATE_TYPE = 'review-state' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[REVIEW_STATE_TYPE]: ReviewStateProps
	}
}

export interface ReviewStateProps {
	w: number
	h: number
	data: string
}

export type ReviewStateShape = TLShape<typeof REVIEW_STATE_TYPE>
