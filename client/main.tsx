import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Room } from './pages/Room'

const router = createBrowserRouter([
	{
		path: '/',
		element: <Room />,
	},
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<RouterProvider router={router} />
)
