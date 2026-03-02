import { createShapePropsMigrationSequence } from '@tldraw/tlschema'
import { T } from 'tldraw'

export const routeCardShapeProps = {
	w: T.number,
	h: T.number,
	specSide: T.string as any,
	operationId: T.string,
	method: T.string,
}

export const routeCardShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })

export const schemaNodeShapeProps = {
	w: T.number,
	h: T.number,
	specSide: T.string as any,
	title: T.string,
	subtitle: T.string.optional(),
	schemaName: T.string.optional(),
	fieldId: T.string.optional(),
}

export const schemaNodeShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })

export const reviewStateShapeProps = {
	w: T.number,
	h: T.number,
	data: T.string,
}

export const reviewStateShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
