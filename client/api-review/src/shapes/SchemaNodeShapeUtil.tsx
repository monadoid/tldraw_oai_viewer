import { BaseBoxShapeUtil, HTMLContainer, RecordProps } from 'tldraw'
import { SchemaNodeContent } from '../components/SchemaNodeContent'
import { schemaNodeShapeMigrations, schemaNodeShapeProps } from './customShapeSchemas'
import type { SchemaNodeProps, SchemaNodeShape } from './schema-node-types'
import { SCHEMA_NODE_TYPE } from './schema-node-types'

export class SchemaNodeShapeUtil extends BaseBoxShapeUtil<SchemaNodeShape> {
	static override type = SCHEMA_NODE_TYPE
	static override props: RecordProps<SchemaNodeShape> = schemaNodeShapeProps
	static override migrations = schemaNodeShapeMigrations

	getDefaultProps(): SchemaNodeProps {
		return {
			w: 320,
			h: 160,
			specSide: 'v4',
			title: '',
			subtitle: undefined,
			schemaName: undefined,
			fieldId: undefined,
		}
	}

	component(shape: SchemaNodeShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: 'all',
					overflow: 'hidden',
				}}
			>
				<SchemaNodeContent
					specSide={shape.props.specSide as 'v3' | 'v4'}
					title={shape.props.title}
					subtitle={shape.props.subtitle}
					schemaName={shape.props.schemaName}
					fieldId={shape.props.fieldId}
					width={shape.props.w}
					height={shape.props.h}
				/>
			</HTMLContainer>
		)
	}

	indicator(shape: SchemaNodeShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
