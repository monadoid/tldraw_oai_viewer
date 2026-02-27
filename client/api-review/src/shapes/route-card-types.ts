import type { TLShape } from 'tldraw'

export const ROUTE_CARD_TYPE = 'route-card' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[ROUTE_CARD_TYPE]: RouteCardProps
	}
}

export interface RouteCardProps {
	w: number
	h: number
	specSide: 'v3' | 'v4'
	operationId: string
	method: string
}

export type RouteCardShape = TLShape<typeof ROUTE_CARD_TYPE>
