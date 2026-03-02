import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
} from 'tldraw'
import { RouteCardContent } from '../components/RouteCardContent'
import { routeCardShapeMigrations, routeCardShapeProps } from './customShapeSchemas'
import type { RouteCardProps, RouteCardShape } from './route-card-types'
import { ROUTE_CARD_TYPE } from './route-card-types'

export class RouteCardShapeUtil extends BaseBoxShapeUtil<RouteCardShape> {
	static override type = ROUTE_CARD_TYPE
	static override props: RecordProps<RouteCardShape> = routeCardShapeProps
	static override migrations = routeCardShapeMigrations

	getDefaultProps(): RouteCardProps {
		return {
			w: 380,
			h: 500,
			specSide: 'v3',
			operationId: '',
			method: 'get',
		}
	}

	component(shape: RouteCardShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: 'all',
					overflow: 'hidden',
				}}
			>
				<RouteCardContent
					operationId={shape.props.operationId}
					specSide={shape.props.specSide as 'v3' | 'v4'}
					method={shape.props.method}
					width={shape.props.w}
					height={shape.props.h}
				/>
			</HTMLContainer>
		)
	}

	indicator(shape: RouteCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
