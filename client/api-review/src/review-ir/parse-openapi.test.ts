import { describe, expect, it } from 'vitest'
import { parseOpenApiToReviewSpec } from './parse-openapi'

import openapiV4Raw from '../../../../openapi.v4.yaml?raw'

describe('parseOpenApiToReviewSpec security headers', () => {
	it('includes global apiKey header schemes as route headers', async () => {
		const spec = await parseOpenApiToReviewSpec(openapiV4Raw, 'v4')
		const sessionStart = spec.routes.find((route) => route.operationId === 'SessionStart')
		expect(sessionStart).toBeDefined()

		const headerNames = sessionStart!.parameters
			.filter((param) => param.parameterIn === 'header')
			.map((param) => param.name)

		expect(headerNames).toContain('x-bb-api-key')
		expect(headerNames).toContain('x-bb-project-id')
		expect(headerNames).toContain('x-model-api-key')
		expect(headerNames).toContain('x-stream-response')
	})
})
