import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { Food } from './pages/Food'
import { Login } from './pages/Login'
import { Placeholder } from './pages/Placeholder'
import { Profile } from './pages/Profile'
import { Progress } from './pages/Progress'
import { Setup } from './pages/Setup'
import { Today } from './pages/Today'
import { Train } from './pages/Train'
import { WorkoutDetail } from './pages/WorkoutDetail'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Navigate to="/login" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Today />} />
              <Route path="entrenar" element={<Train />} />
              <Route path="progreso" element={<Progress />} />
              <Route path="progreso/:id" element={<WorkoutDetail />} />
              <Route path="comida" element={<Food />} />
              <Route
                path="coach"
                element={
                  <Placeholder
                    title="Coach IA"
                    blurb="Ajuste de sesión y rutina base llegarán en F4."
                  />
                }
              />
              <Route path="perfil" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
