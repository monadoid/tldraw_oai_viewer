import { describe, expect, it } from 'vitest'
import { getRouteParameterSections } from './route-parameter-sections'
import type { ReviewFieldNode } from './types'

function makeParam(name: string, parameterIn: ReviewFieldNode['parameterIn']): ReviewFieldNode {
	return {
		id: `field-${name}`,
		name,
		displayName: name,
		typeKind: 'primitive',
		typeSummary: 'string',
		required: true,
		nullable: false,
		location: 'parameter',
		parameterIn,
	}
}

describe('getRouteParameterSections', () => {
	it('splits headers from other parameters for route UI sections', () => {
		const sections = getRouteParameterSections([
			makeParam('x-bb-project-id', 'header'),
			makeParam('id', 'path'),
			makeParam('x-stream-response', 'header'),
		])

		expect(sections).toHaveLength(2)
		expect(sections[0].title).toBe('Headers')
		expect(sections[0].fields.map((f) => f.name)).toEqual([
			'x-bb-project-id',
			'x-stream-response',
		])
		expect(sections[1].title).toBe('Parameters')
		expect(sections[1].fields.map((f) => f.name)).toEqual(['id'])
	})
})
