import type { ReviewRoute, SpecSide } from '../review-ir/types'
import { CARD_HEADER_HEIGHT, SECTION_HEADER_HEIGHT } from '../shapes/layout-constants'
import { useReviewContext } from '../state/ReviewContext'
import { FieldRow } from './FieldRow'

interface RouteCardContentProps {
	operationId: string
	specSide: SpecSide
	method: string
	width: number
	height: number
}

const METHOD_COLORS: Record<string, string> = {
	get: '#22c55e',
	post: '#3b82f6',
	put: '#f59e0b',
	patch: '#f59e0b',
	delete: '#ef4444',
}

const SECTION_HEADER: React.CSSProperties = {
	fontSize: 10,
	fontWeight: 700,
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
	color: '#9ca3af',
	padding: '6px 8px 2px',
	height: SECTION_HEADER_HEIGHT,
	boxSizing: 'border-box',
	fontFamily: 'system-ui, -apple-system, sans-serif',
}

export function RouteCardContent({
	operationId,
	specSide,
	method,
	width,
	height,
}: RouteCardContentProps) {
	const { v3Spec, v4Spec } = useReviewContext()
	const spec = specSide === 'v3' ? v3Spec : v4Spec

	if (!spec) {
		return (
			<div style={cardShell(specSide, width, height)}>
				<div style={{ padding: 16, color: '#9ca3af' }}>Loading...</div>
			</div>
		)
	}

	const route = spec.routes.find((r) => r.operationId === operationId)
	if (!route) {
		return (
			<div style={cardShell(specSide, width, height)}>
				<div style={{ padding: 16, color: '#ef4444' }}>Route not found: {operationId}</div>
			</div>
		)
	}

	return (
		<div style={cardShell(specSide, width, height)}>
			<CardHeader route={route} method={method} specSide={specSide} />
			<div style={{ overflowY: 'auto', flex: 1 }}>
				{route.parameters.length > 0 && (
					<Section title="Parameters">
						{route.parameters.map((param) => (
							<FieldRow key={param.id} field={param} specSide={specSide} />
						))}
					</Section>
				)}
				{route.requestBody && (
					<Section title="Request body">
						{route.requestBody.schema.children?.map((field) => (
							<FieldRow key={field.id} field={field} specSide={specSide} />
						)) ?? (
							<FieldRow field={route.requestBody.schema} specSide={specSide} />
						)}
					</Section>
				)}
				{route.responses.map((resp) => (
					<Section key={resp.statusCode} title={`Response ${resp.statusCode}`}>
						{resp.schema?.children?.map((field) => (
							<FieldRow key={field.id} field={field} specSide={specSide} />
						)) ?? (
							resp.schema && <FieldRow field={resp.schema} specSide={specSide} />
						)}
					</Section>
				))}
			</div>
		</div>
	)
}

function CardHeader({
	route,
	method,
	specSide,
}: {
	route: ReviewRoute
	method: string
	specSide: SpecSide
}) {
	const methodColor = METHOD_COLORS[method.toLowerCase()] ?? '#6b7280'

	return (
		<div
			style={{
				padding: '8px 10px',
				height: CARD_HEADER_HEIGHT,
				boxSizing: 'border-box',
				borderBottom: '2px solid #e5e7eb',
				background: specSide === 'v3' ? '#fafafa' : '#f0f9ff',
				flexShrink: 0,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: '#fff',
						background: methodColor,
						padding: '1px 6px',
						borderRadius: 3,
						textTransform: 'uppercase',
						fontFamily: 'monospace',
					}}
				>
					{method}
				</span>
				<span
					style={{
						fontSize: 10,
						fontWeight: 600,
						color: specSide === 'v3' ? '#6b7280' : '#2563eb',
						textTransform: 'uppercase',
						fontFamily: 'system-ui, -apple-system, sans-serif',
					}}
				>
					{specSide}
				</span>
			</div>
			<div
				style={{
					fontSize: 12,
					fontWeight: 600,
					color: '#111827',
					fontFamily: 'monospace',
					wordBreak: 'break-all',
				}}
			>
				{route.path}
			</div>
			{route.summary && (
				<div
					style={{
						fontSize: 11,
						color: '#6b7280',
						marginTop: 2,
						fontFamily: 'system-ui, -apple-system, sans-serif',
					}}
				>
					{route.summary}
				</div>
			)}
		</div>
	)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div>
			<div style={SECTION_HEADER}>{title}</div>
			{children}
		</div>
	)
}

function cardShell(specSide: SpecSide, width: number, height: number): React.CSSProperties {
	return {
		width,
		height,
		display: 'flex',
		flexDirection: 'column',
		background: '#ffffff',
		border: `1px solid ${specSide === 'v3' ? '#d1d5db' : '#93c5fd'}`,
		borderRadius: 8,
		overflow: 'hidden',
		fontFamily: 'system-ui, -apple-system, sans-serif',
		boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
	}
}
