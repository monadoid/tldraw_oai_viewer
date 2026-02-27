import type { TLShape } from 'tldraw'

export const SCHEMA_NODE_TYPE = 'schema-node' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[SCHEMA_NODE_TYPE]: SchemaNodeProps
	}
}

export interface SchemaNodeProps {
	w: number
	h: number
	specSide: 'v3' | 'v4'
	title: string
	subtitle?: string
	schemaName?: string
	fieldId?: string
}

export type SchemaNodeShape = TLShape<typeof SCHEMA_NODE_TYPE>
