import type { ReviewFieldNode } from './types'

export interface RouteParameterSection {
	title: 'Headers' | 'Parameters'
	diffKey: 'parameters'
	fields: ReviewFieldNode[]
}

export function getRouteParameterSections(parameters: ReviewFieldNode[]): RouteParameterSection[] {
	const headers = parameters.filter((param) => param.parameterIn === 'header')
	const others = parameters.filter((param) => param.parameterIn !== 'header')
	const sections: RouteParameterSection[] = []

	if (headers.length > 0) {
		sections.push({
			title: 'Headers',
			diffKey: 'parameters',
			fields: headers,
		})
	}

	if (others.length > 0) {
		sections.push({
			title: 'Parameters',
			diffKey: 'parameters',
			fields: others,
		})
	}

	return sections
}
