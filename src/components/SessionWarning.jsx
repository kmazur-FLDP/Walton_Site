import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const SessionWarning = () => {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!user) return

    const WARNING_TIME = 5 * 60 * 1000 // Show warning 5 minutes before timeout
    const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes total

    const checkWarning = () => {
      const lastActivity = localStorage.getItem('lastActivity')
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity)
        const timeUntilTimeout = SESSION_TIMEOUT - timeSinceActivity
        
        if (timeUntilTimeout <= WARNING_TIME && timeUntilTimeout > 0) {
          setShowWarning(true)
          setTimeLeft(Math.ceil(timeUntilTimeout / 1000 / 60)) // Convert to minutes
        } else {
          setShowWarning(false)
        }
      }
    }

    const interval = setInterval(checkWarning, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [user])

  const handleExtendSession = () => {
    localStorage.setItem('lastActivity', Date.now().toString())
    setShowWarning(false)
  }

  if (!showWarning) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-3 z-50 text-center">
      <div className="flex items-center justify-center space-x-4">
        <span className="font-semibold">
          Your session will expire in {timeLeft} minute(s) due to inactivity
        </span>
        <button
          onClick={handleExtendSession}
          className="bg-white text-yellow-600 px-3 py-1 rounded font-semibold hover:bg-gray-100"
        >
          Stay Logged In
        </button>
        <button
          onClick={signOut}
          className="bg-red-600 text-white px-3 py-1 rounded font-semibold hover:bg-red-700"
        >
          Logout Now
        </button>
      </div>
    </div>
  )
}

export default SessionWarning