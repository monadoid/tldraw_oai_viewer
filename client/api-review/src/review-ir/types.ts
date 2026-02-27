/** Which side of the review board a spec lives on. */
export type SpecSide = 'v3' | 'v4'

/** Kind of a type node in the Review IR. */
export type TypeKind =
	| 'primitive'
	| 'enum'
	| 'object'
	| 'array'
	| 'union'
	| 'ref'
	| 'any'

/** Where a field originates in the OpenAPI operation. */
export type FieldLocation = 'parameter' | 'request' | 'response'

/** Parameter location per OpenAPI (path, query, header, cookie). */
export type ParameterIn = 'path' | 'query' | 'header' | 'cookie'

/**
 * A node in the normalized field/type tree.
 * Used for both route-card rendering and side-panel editing.
 */
export interface ReviewFieldNode {
	/** Stable identity (survives renames). */
	id: string
	/** Original field name from the spec. */
	name: string
	/** Display name — equals `name` unless the user renames the field. */
	displayName: string
	/** Kind of type this node represents. */
	typeKind: TypeKind
	/** Compact human-readable type string, e.g. "string", "ActOptions", "string | Action". */
	typeSummary: string
	/** Whether this field is required. */
	required: boolean
	/** Whether this field is nullable. */
	nullable: boolean
	/** OpenAPI description, if present. */
	description?: string
	/** Enum values when typeKind === 'enum'. */
	enumValues?: string[]
	/** Child fields when typeKind === 'object'. */
	children?: ReviewFieldNode[]
	/** Item schema when typeKind === 'array'. */
	items?: ReviewFieldNode
	/** Union variant schemas when typeKind === 'union'. */
	variants?: ReviewFieldNode[]
	/** $ref target schema name when typeKind === 'ref'. */
	refTarget?: string
	/** Where this field lives in the operation. */
	location: FieldLocation
	/** JSON pointer in the original OpenAPI doc (provenance). */
	jsonPointer?: string
	/** For parameters, where the parameter is sent. */
	parameterIn?: ParameterIn
}

/** An HTTP response entry in a route. */
export interface ReviewResponse {
	statusCode: string
	description?: string
	mediaType?: string
	schema?: ReviewFieldNode
}

/** A request body entry in a route. */
export interface ReviewRequestBody {
	required: boolean
	mediaType: string
	schema: ReviewFieldNode
}

/** A single API operation (route) in the Review IR. */
export interface ReviewRoute {
	/** Stable identity for this route. */
	id: string
	/** HTTP path, e.g. "/v1/sessions/{id}/act". */
	path: string
	/** HTTP method, e.g. "post", "get". */
	method: string
	/** OpenAPI operationId. */
	operationId: string
	/** Short summary from OpenAPI. */
	summary?: string
	/** Longer description from OpenAPI. */
	description?: string
	/** Path prefix for grouping, e.g. "/v1/sessions". */
	pathPrefix: string
	/** Operation parameters (path, query, header params). */
	parameters: ReviewFieldNode[]
	/** Request body, if present. */
	requestBody?: ReviewRequestBody
	/** All responses keyed by status code. */
	responses: ReviewResponse[]
}

/** A named schema from components/schemas, resolved and normalized. */
export interface ReviewSchema {
	/** Schema name from OpenAPI (e.g. "ActRequest", "Action"). */
	name: string
	/** Root field node representing the schema body. */
	root: ReviewFieldNode
}

/** Top-level Review IR for one spec file. */
export interface ReviewSpec {
	/** API title. */
	title: string
	/** API version string. */
	version: string
	/** Which side this spec is on. */
	side: SpecSide
	/** All routes/operations. */
	routes: ReviewRoute[]
	/** Named schemas from components/schemas. */
	schemas: Map<string, ReviewSchema>
}

/** A pair of v3 + v4 route cards grouped for canvas display. */
export interface RouteCardPair {
	/** Path prefix group these cards belong to. */
	pathPrefix: string
	/** The v3 (read-only) route. */
	v3: ReviewRoute
	/** The v4 (editable) route. */
	v4: ReviewRoute
}

/** Breadcrumb entry for side-panel navigation. */
export interface BreadcrumbEntry {
	/** Display label for this breadcrumb level. */
	label: string
	/** The field node at this level. */
	fieldNode: ReviewFieldNode
}

/** Side panel state for editing/inspecting a field. */
export interface SidePanelState {
	/** Which side is being inspected. */
	side: SpecSide
	/** The currently displayed field node. */
	currentField: ReviewFieldNode
	/** Navigation breadcrumbs (back stack). */
	breadcrumbs: BreadcrumbEntry[]
	/** Whether editing is allowed (true for v4). */
	editable: boolean
}
