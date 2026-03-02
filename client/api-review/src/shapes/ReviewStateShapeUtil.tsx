import { BaseBoxShapeUtil, HTMLContainer, RecordProps } from 'tldraw'
import { reviewStateShapeMigrations, reviewStateShapeProps } from './customShapeSchemas'
import type { ReviewStateProps, ReviewStateShape } from './review-state-types'
import { REVIEW_STATE_TYPE } from './review-state-types'

export class ReviewStateShapeUtil extends BaseBoxShapeUtil<ReviewStateShape> {
	static override type = REVIEW_STATE_TYPE
	static override props: RecordProps<ReviewStateShape> = reviewStateShapeProps
	static override migrations = reviewStateShapeMigrations

	getDefaultProps(): ReviewStateProps {
		return {
			w: 1,
			h: 1,
			data: '',
		}
	}

	component(shape: ReviewStateShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					opacity: 0,
					pointerEvents: 'none',
				}}
			/>
		)
	}

	indicator() {
		return null
	}
}
