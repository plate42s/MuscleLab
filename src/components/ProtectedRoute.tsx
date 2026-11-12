import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { user, loading, configured } = useAuth()

  if (!configured) {
    return <Navigate to="/setup" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm ml-muted">
        Cargando sesión…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
