import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import accessLogService from '../services/accessLogService'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState(null)
  
  // Session timeout (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds
  const [lastActivity, setLastActivity] = useState(Date.now())

  // Define signOut function first (before useEffect that references it)
  const signOut = useCallback(async () => {
    try {
      // Log logout before clearing data (non-blocking)
      if (user) {
        try {
          await accessLogService.logLogout(user.id, user.email, sessionId)
        } catch (logError) {
          console.warn('Access logging failed:', logError.message)
        }
      }

      // Clear any local storage data
      localStorage.clear()
      sessionStorage.clear()
      
      const { error } = await supabase.auth.signOut()
      
      // Clear session ID
      setSessionId(null)
      
      return { error }
    } catch (err) {
      console.error('Error in signOut:', err)
      return { error: err }
    }
  }, [user, sessionId])

  // Update last activity time on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now())
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [])

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      if (user && Date.now() - lastActivity > SESSION_TIMEOUT) {
        console.log('Session timed out due to inactivity')
        signOut()
      }
    }

    const interval = setInterval(checkTimeout, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [user, lastActivity, SESSION_TIMEOUT, signOut])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // If user exists, log session refresh
      if (session?.user) {
        const newSessionId = accessLogService.generateSessionId()
        setSessionId(newSessionId)
        accessLogService.logSessionRefresh(session.user.id, session.user.email, newSessionId)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Sign out user when they close the browser
    const handleBeforeUnload = () => {
      supabase.auth.signOut()
    }

    // Add event listener for browser close only
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Log failed login attempt (non-blocking)
        try {
          await accessLogService.logFailedLogin(email, error.message)
        } catch (logError) {
          console.warn('Access logging failed:', logError.message)
        }
        return { data, error }
      }

      if (data.user) {
        // Generate session ID and log successful login (non-blocking)
        try {
          const newSessionId = accessLogService.generateSessionId()
          setSessionId(newSessionId)
          await accessLogService.logLogin(data.user.id, data.user.email, newSessionId)
        } catch (logError) {
          console.warn('Access logging failed:', logError.message)
        }
      }

      return { data, error }
    } catch (err) {
      console.error('Error in signIn:', err)
      try {
        await accessLogService.logFailedLogin(email, 'system_error')
      } catch (logError) {
        console.warn('Access logging failed:', logError.message)
      }
      return { data: null, error: err }
    }
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
