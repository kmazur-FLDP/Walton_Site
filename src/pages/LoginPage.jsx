import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import CompactTermsModal from '../components/CompactTermsModal'
import termsService from '../services/termsService'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if terms are accepted
    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions to continue')
      return
    }

    setLoading(true)
    setError('')

    // Sign in first
    const { error: signInError } = await signIn(email, password)
    
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Record terms acceptance for this login session
    try {
      const sessionId = `login-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await termsService.acceptTermsForLogin(sessionId)
    } catch (termsError) {
      console.warn('Failed to record terms acceptance:', termsError)
      // Don't fail login for terms recording issues
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Section */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-8 mb-6">
            {/* FLDP Logo */}
            <img 
              src="/fldp_final_color.png" 
              alt="FLDP" 
              className="h-12 w-auto"
            />
            {/* Client Logo */}
            <img 
              src="/walton_logo.webp" 
              alt="Walton Global" 
              className="h-12 w-auto"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to the Walton Global FLDP GIS Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Secure access to your GIS data and property research
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Security Notice:</strong> For enhanced security, you will need to login each time you visit this site. 
              Sessions automatically expire after 30 minutes of inactivity.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Conditions Acceptance */}
            <div className="space-y-3">
              <div 
                className={`border-2 rounded-lg p-3 transition-colors cursor-pointer ${
                  termsAccepted 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-gray-50 hover:bg-blue-50'
                }`}
                onClick={() => setTermsAccepted(!termsAccepted)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={() => {}} // Handled by parent div click
                    className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-2 border-gray-400 rounded pointer-events-none"
                  />
                  <div className="flex-1 pointer-events-none">
                    <div className="text-sm font-medium text-gray-900">
                      {termsAccepted ? '✅ ' : '☐ '}
                      I agree to the Terms and Conditions for this login session
                    </div>
                    <div className="text-xs mt-1 text-gray-600">
                      Required for each login to ensure data confidentiality and compliance
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  View Terms and Conditions
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors duration-200 ${
                  (loading || !termsAccepted)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
              >
                {loading 
                  ? 'Signing in...' 
                  : !termsAccepted 
                    ? 'Accept Terms to Sign In' 
                    : 'Sign in'
                }
              </button>
            </div>
          </form>
        </div>

        {/* Disclaimer Notice */}
                {/* Disclaimer Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Disclaimer
              </h3>
              <div className="mt-1 text-sm text-blue-700 space-y-2">
                <p>
                  The information provided in this portal is for informational purposes only and is derived from publicly available data sources. 
                  While we strive for accuracy, property data may not be current, complete, or error-free.
                </p>
                <p>
                  <strong>No Warranty:</strong> We make no representations or warranties regarding the accuracy, completeness, or reliability of the data presented. 
                  Users should verify all information independently through official county records and other authoritative sources before making any decisions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Authorized access only • Powered by FLDP
          </p>
        </div>
      </div>

      {/* Compact Terms Modal */}
      <CompactTermsModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  )
}

export default LoginPage
