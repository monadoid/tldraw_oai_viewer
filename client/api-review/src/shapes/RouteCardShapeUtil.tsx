import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
} from 'tldraw'
import { RouteCardContent } from '../components/RouteCardContent'
import type { RouteCardProps, RouteCardShape } from './route-card-types'
import { ROUTE_CARD_TYPE } from './route-card-types'

export class RouteCardShapeUtil extends BaseBoxShapeUtil<RouteCardShape> {
	static override type = ROUTE_CARD_TYPE
	static override props: RecordProps<RouteCardShape> = {
		w: T.number,
		h: T.number,
		specSide: T.string as any,
		operationId: T.string,
		method: T.string,
	}

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
