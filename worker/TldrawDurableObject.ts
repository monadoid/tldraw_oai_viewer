import { DurableObjectSqliteSyncWrapper, SQLiteSyncStorage, TLSocketRoom } from '@tldraw/sync-core'
import {
	createTLSchema,
	defaultBindingSchemas,
	defaultShapeSchemas,
	TLRecord,
} from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import {
	reviewStateShapeMigrations,
	reviewStateShapeProps,
	routeCardShapeMigrations,
	routeCardShapeProps,
	schemaNodeShapeMigrations,
	schemaNodeShapeProps,
} from '../client/api-review/src/shapes/customShapeSchemas'

const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		'route-card': {
			migrations: routeCardShapeMigrations,
			props: routeCardShapeProps,
		},
		'schema-node': {
			migrations: schemaNodeShapeMigrations,
			props: schemaNodeShapeProps,
		},
		'review-state': {
			migrations: reviewStateShapeMigrations,
			props: reviewStateShapeProps,
		},
	},
	bindings: { ...defaultBindingSchemas },
})

// Each whiteboard room is hosted in a Durable Object.
// https://developers.cloudflare.com/durable-objects/
//
// There's only ever one durable object instance per room. Room state is
// persisted automatically to SQLite via ctx.storage.
export class TldrawDurableObject extends DurableObject {
	private room: TLSocketRoom<TLRecord, void>
	private roomId = 'unknown'

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		// Create SQLite-backed storage - persists automatically to Durable Object storage
		const sql = new DurableObjectSqliteSyncWrapper(ctx.storage)
		const storage = new SQLiteSyncStorage<TLRecord>({ sql })

		// Create the room that handles sync protocol
		this.room = new TLSocketRoom<TLRecord, void>({
			schema,
			storage,
			log: {
				error: (...args) => console.error('[sync-do:error]', ...args),
				warn: (...args) => console.warn('[sync-do:warn]', ...args),
			},
			onDataChange: () => {
				console.log('[sync-do] data-change', {
					roomId: this.roomId,
					recordCount: this.getRecordCount(),
				})
			},
			onSessionRemoved: (_room, args) => {
				console.log('[sync-do] session-removed', {
					roomId: this.roomId,
					sessionId: args.sessionId,
					numSessionsRemaining: args.numSessionsRemaining,
				})
			},
		})
	}

	private readonly router = AutoRouter({ catch: (e) => error(e) }).get(
		'/api/connect/:roomId',
		(request) => this.handleConnect(request)
	)

	// Entry point for all requests to the Durable Object
	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	// Handle new WebSocket connection requests
	async handleConnect(request: IRequest) {
		const sessionId = request.query.sessionId as string
		if (!sessionId) return error(400, 'Missing sessionId')
		this.roomId = request.params.roomId ?? this.roomId
		console.log('[sync-do] connect', { roomId: this.roomId, sessionId })

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		// Connect to the room
		this.room.handleSocketConnect({ sessionId, socket: serverWebSocket })

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private getRecordCount() {
		const snapshot = this.room.getCurrentSnapshot() as unknown as {
			documents?: Array<{ state?: Record<string, TLRecord> }>
		}
		if (!snapshot.documents) return 0
		return snapshot.documents.reduce((total, doc) => total + Object.keys(doc.state ?? {}).length, 0)
	}
}
