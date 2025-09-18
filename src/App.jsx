import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import MapPage from './pages/MapPage'
import HernandoMapPage from './pages/HernandoMapPage'
import CitrusMapPage from './pages/CitrusMapPage'
import PascoMapPage from './pages/PascoMapPage'
import PolkMapPage from './pages/PolkMapPage'
import TestCitrusMap from './pages/TestCitrusMap'
import CitrusDebugMap from './pages/CitrusDebugMap'
import ManateeMapPage from './pages/ManateeMapPage'
import FavoritesPage from './pages/FavoritesPage'
import ParcelAnalysisPage from './pages/ParcelAnalysisPage'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'
import SessionWarning from './components/SessionWarning'
import ConfidentialityFooter from './components/ConfidentialityFooter'

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Public Route wrapper (redirect to landing if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (user) {
    return <Navigate to="/" replace />
  }
  
  return children
}

const AppContent = () => {
  const { user } = useAuth()
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <SessionWarning />
      {user && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map/:county"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hernando"
          element={
            <ProtectedRoute>
              <HernandoMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/citrus"
          element={
            <ProtectedRoute>
              <CitrusMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pasco"
          element={
            <ProtectedRoute>
              <PascoMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/polk"
          element={
            <ProtectedRoute>
              <PolkMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-citrus"
          element={
            <ProtectedRoute>
              <TestCitrusMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug-citrus"
          element={
            <ProtectedRoute>
              <CitrusDebugMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manatee"
          element={
            <ProtectedRoute>
              <ManateeMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parcel-analysis"
          element={
            <ProtectedRoute>
              <ParcelAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Confidentiality Footer - appears on all pages */}
      <ConfidentialityFooter />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
