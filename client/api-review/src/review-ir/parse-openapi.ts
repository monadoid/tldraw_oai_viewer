import { dereference, validate } from '@scalar/openapi-parser'
import { parse as parseYaml } from 'yaml'
import { generateTypeSummary } from './type-summary'
import type {
	FieldLocation,
	ParameterIn,
	ReviewFieldNode,
	ReviewRequestBody,
	ReviewResponse,
	ReviewRoute,
	ReviewSchema,
	ReviewSpec,
	SpecSide,
	TypeKind,
} from './types'

let fieldIdCounter = 0
function nextFieldId(hint: string): string {
	return `${hint}::${fieldIdCounter++}`
}

export function resetFieldIdCounter(): void {
	fieldIdCounter = 0
}

/**
 * Load and parse an OpenAPI YAML string, then normalize it into a ReviewSpec.
 */
export async function parseOpenApiToReviewSpec(
	yamlContent: string,
	side: SpecSide
): Promise<ReviewSpec> {
	resetFieldIdCounter()

	const { valid, errors } = await validate(yamlContent)
	if (!valid && errors && errors.length > 0) {
		throw new Error(`OpenAPI validation failed: ${errors.map((e: any) => e.message).join(', ')}`)
	}

	const { schema: resolved } = await dereference(yamlContent)
	if (!resolved) {
		throw new Error('Failed to dereference OpenAPI spec')
	}

	const doc = resolved as any

	const title = doc.info?.title ?? ''
	const version = doc.info?.version ?? ''

	const schemas = parseSchemas(doc, yamlContent)
	const routes = parseRoutes(doc)

	return { title, version, side, routes, schemas }
}

function parseSchemas(doc: any, rawYaml: string): Map<string, ReviewSchema> {
	const schemas = new Map<string, ReviewSchema>()
	const componentSchemas = doc.components?.schemas
	if (!componentSchemas) return schemas

	const rawDoc = parseRawYaml(rawYaml)
	const rawSchemas = rawDoc?.components?.schemas ?? {}

	for (const [name, schema] of Object.entries<any>(componentSchemas)) {
		const rawSchema = rawSchemas[name]
		const isRefAlias = rawSchema && rawSchema.$ref && Object.keys(rawSchema).length === 1

		let root: ReviewFieldNode
		if (isRefAlias) {
			const refTarget = extractRefName(rawSchema.$ref)
			root = {
				id: nextFieldId(`schema-${name}`),
				name,
				displayName: name,
				typeKind: 'ref',
				typeSummary: '',
				required: false,
				nullable: false,
				location: 'request',
				refTarget,
				jsonPointer: `#/components/schemas/${name}`,
			}
			root.typeSummary = generateTypeSummary(root)
		} else {
			root = schemaToFieldNode(
				schema,
				name,
				false,
				'request',
				`#/components/schemas/${name}`,
				rawSchemas[name]
			)
		}

		schemas.set(name, { name, root })
	}

	return schemas
}

function parseRawYaml(yamlContent: string): any {
	try {
		return parseYaml(yamlContent)
	} catch {
		return null
	}
}

function parseRoutes(doc: any): ReviewRoute[] {
	const routes: ReviewRoute[] = []
	const paths = doc.paths
	if (!paths) return routes

	for (const [path, pathItem] of Object.entries<any>(paths)) {
		for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
			const operation = pathItem[method]
			if (!operation) continue

			const operationId = operation.operationId ?? `${method}_${path}`
			const summary = operation.summary
			const description = operation.description
			const pathPrefix = computePathPrefix(path)

			const parameters = parseParameters(
				operation.parameters ?? [],
				`#/paths/${escapeJsonPointer(path)}/${method}/parameters`
			)

			const requestBody = parseRequestBody(
				operation.requestBody,
				`#/paths/${escapeJsonPointer(path)}/${method}/requestBody`
			)

			const responses = parseResponses(
				operation.responses ?? {},
				`#/paths/${escapeJsonPointer(path)}/${method}/responses`
			)

			routes.push({
				id: nextFieldId(`route-${operationId}`),
				path,
				method,
				operationId,
				summary,
				description,
				pathPrefix,
				parameters,
				requestBody,
				responses,
			})
		}
	}

	return routes
}

function parseParameters(params: any[], basePath: string): ReviewFieldNode[] {
	return params.map((param: any, index: number) => {
		const schema = param.schema ?? {}
		const node = schemaToFieldNode(
			schema,
			param.name,
			param.required ?? false,
			'parameter',
			`${basePath}/${index}`,
			undefined
		)
		node.parameterIn = param.in as ParameterIn
		node.description = param.description ?? schema.description
		return node
	})
}

function parseRequestBody(requestBody: any, basePath: string): ReviewRequestBody | undefined {
	if (!requestBody) return undefined

	const content = requestBody.content
	if (!content) return undefined

	const mediaType = Object.keys(content)[0] ?? 'application/json'
	const mediaContent = content[mediaType]
	if (!mediaContent?.schema) return undefined

	const schema = schemaToFieldNode(
		mediaContent.schema,
		'body',
		false,
		'request',
		`${basePath}/content/${escapeJsonPointer(mediaType)}/schema`,
		undefined
	)

	return {
		required: requestBody.required ?? false,
		mediaType,
		schema,
	}
}

function parseResponses(responses: Record<string, any>, basePath: string): ReviewResponse[] {
	const result: ReviewResponse[] = []

	for (const [statusCode, response] of Object.entries<any>(responses)) {
		const content = response.content
		let schema: ReviewFieldNode | undefined
		let mediaType: string | undefined

		if (content) {
			mediaType = Object.keys(content)[0]
			if (mediaType && content[mediaType]?.schema) {
				schema = schemaToFieldNode(
					content[mediaType].schema,
					'response',
					false,
					'response',
					`${basePath}/${statusCode}/content/${escapeJsonPointer(mediaType!)}/schema`,
					undefined
				)
			}
		}

		result.push({
			statusCode,
			description: response.description,
			mediaType,
			schema,
		})
	}

	return result
}

function schemaToFieldNode(
	schema: any,
	name: string,
	required: boolean,
	location: FieldLocation,
	jsonPointer: string,
	rawSchema: any | undefined
): ReviewFieldNode {
	if (!schema || typeof schema !== 'object') {
		const node: ReviewFieldNode = {
			id: nextFieldId(name),
			name,
			displayName: name,
			typeKind: 'any',
			typeSummary: '',
			required,
			nullable: false,
			location,
			jsonPointer,
		}
		node.typeSummary = generateTypeSummary(node)
		return node
	}

	if (rawSchema && rawSchema.$ref && Object.keys(rawSchema).length === 1) {
		const refTarget = extractRefName(rawSchema.$ref)
		const node: ReviewFieldNode = {
			id: nextFieldId(name),
			name,
			displayName: name,
			typeKind: 'ref',
			typeSummary: '',
			required,
			nullable: false,
			location,
			refTarget,
			jsonPointer,
		}
		node.typeSummary = generateTypeSummary(node)
		return node
	}

	const nullable = isNullable(schema, rawSchema)
	const typeKind = determineTypeKind(schema, rawSchema)

	const node: ReviewFieldNode = {
		id: nextFieldId(name),
		name,
		displayName: name,
		typeKind,
		typeSummary: '',
		required,
		nullable,
		location,
		jsonPointer,
		description: schema.description,
	}

	switch (typeKind) {
		case 'enum':
			node.enumValues = schema.enum ?? []
			node.typeSummary = mapPrimitiveType(schema.type)
			break
		case 'object':
			node.children = parseObjectProperties(schema, location, jsonPointer, rawSchema)
			break
		case 'array':
			if (schema.items) {
				node.items = schemaToFieldNode(
					schema.items,
					'items',
					false,
					location,
					`${jsonPointer}/items`,
					rawSchema?.items
				)
			}
			break
		case 'union':
			node.variants = parseUnionVariants(schema, location, jsonPointer, rawSchema)
			break
		case 'primitive':
			node.typeSummary = mapPrimitiveType(schema.type)
			break
		case 'any':
			break
		default:
			break
	}

	node.typeSummary = generateTypeSummary(node)
	return node
}

function parseObjectProperties(
	schema: any,
	location: FieldLocation,
	basePath: string,
	rawSchema: any
): ReviewFieldNode[] {
	const properties = schema.properties
	if (!properties) return []

	const requiredSet = new Set<string>(schema.required ?? [])
	const children: ReviewFieldNode[] = []

	for (const [propName, propSchema] of Object.entries<any>(properties)) {
		const rawPropSchema = rawSchema?.properties?.[propName]
		const child = schemaToFieldNode(
			propSchema,
			propName,
			requiredSet.has(propName),
			location,
			`${basePath}/properties/${propName}`,
			rawPropSchema
		)
		children.push(child)
	}

	return children
}

function parseUnionVariants(
	schema: any,
	location: FieldLocation,
	basePath: string,
	rawSchema: any
): ReviewFieldNode[] {
	const raw = rawSchema ?? schema
	const resolvedVariants = schema.oneOf ?? schema.anyOf ?? []
	const rawVariants = rawSchema?.oneOf ?? rawSchema?.anyOf ?? []

	const keyword = raw.oneOf ? 'oneOf' : 'anyOf'

	return resolvedVariants.map((variant: any, index: number) => {
		const rawVariant = rawVariants[index]
		return schemaToFieldNode(
			variant,
			`${keyword}[${index}]`,
			false,
			location,
			`${basePath}/${keyword}/${index}`,
			rawVariant
		)
	})
}

function determineTypeKind(schema: any, rawSchema: any): TypeKind {
	const raw = rawSchema ?? schema

	if (raw?.oneOf || raw?.anyOf || schema.oneOf || schema.anyOf) {
		const variants = raw?.oneOf ?? raw?.anyOf ?? schema.oneOf ?? schema.anyOf ?? []
		const nonNullVariants = variants.filter((v: any) => {
			if (v.$ref) return true
			return v.type !== 'null'
		})

		if (nonNullVariants.length >= 2) {
			return 'union'
		}
	}

	if (schema.enum) return 'enum'
	if (schema.type === 'object' || schema.properties) return 'object'
	if (schema.type === 'array') return 'array'

	const prim = schema.type
	if (prim === 'string' || prim === 'number' || prim === 'integer' || prim === 'boolean') {
		return 'primitive'
	}

	if (!schema.type && !schema.properties && !schema.items) return 'any'

	return 'primitive'
}

function isNullable(schema: any, rawSchema: any): boolean {
	const raw = rawSchema ?? schema
	const variants = raw?.anyOf ?? raw?.oneOf ?? schema.anyOf ?? schema.oneOf
	if (variants && Array.isArray(variants)) {
		const hasNull = variants.some((v: any) => v.type === 'null')
		if (hasNull) {
			const nonNull = variants.filter((v: any) => v.type !== 'null')
			if (nonNull.length <= 1) return true
		}
	}
	if (schema.nullable === true) return true
	return false
}

function mapPrimitiveType(type: string | undefined): string {
	if (!type) return 'unknown'
	if (type === 'integer') return 'number'
	return type
}

function extractRefName(ref: string): string {
	const parts = ref.split('/')
	return parts[parts.length - 1]
}

function computePathPrefix(path: string): string {
	const segments = path.split('/').filter(Boolean)
	if (segments.length <= 1) return '/' + segments.join('/')
	segments.pop()
	return '/' + segments.join('/')
}

function escapeJsonPointer(str: string): string {
	return str.replace(/~/g, '~0').replace(/\//g, '~1')
}
