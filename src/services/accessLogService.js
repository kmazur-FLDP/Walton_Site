import { supabase } from '../lib/supabase'

class AccessLogService {
  /**
   * Log an access event (login, logout, etc.)
   * @param {Object} eventData - Access event details
   * @param {string} eventData.userId - User ID (optional for failed logins)
   * @param {string} eventData.email - User email
   * @param {string} eventData.eventType - Type of event ('login', 'logout', 'session_refresh', 'access_denied')
   * @param {boolean} eventData.success - Whether the event was successful
   * @param {string} eventData.sessionId - Session identifier (optional)
   * @returns {Promise<boolean>} Success status
   */
  async logAccess(eventData) {
    try {
      // Get IP address and user agent from browser
      const ipInfo = await this.getClientInfo()
      
      // Get geolocation data for IP
      const locationData = await this.getLocationFromIP(ipInfo.ip)
      
      // Parse user agent for device information
      const deviceInfo = this.parseUserAgent(ipInfo.userAgent)
      
      const logEntry = {
        user_id: eventData.userId || null,
        email: eventData.email,
        ip_address: ipInfo.ip,
        user_agent: ipInfo.userAgent,
        event_type: eventData.eventType,
        success: eventData.success,
        location_country: locationData.country,
        location_region: locationData.region,
        location_city: locationData.city,
        location_coords: locationData.coords ? `(${locationData.coords.lat},${locationData.coords.lng})` : null,
        session_id: eventData.sessionId || null,
        referrer: document.referrer || null,
        device_info: deviceInfo,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('access_logs')
        .insert(logEntry)

      if (error) {
        console.warn('Access logging failed (this is non-critical):', error.message)
        return false
      }

      console.log('Access event logged successfully:', eventData.eventType)
      return true
    } catch (error) {
      console.warn('Access logging encountered an error (this is non-critical):', error.message)
      // Don't throw the error - logging failures shouldn't break the user experience
      return false
    }
  }

  /**
   * Get client IP address and user agent
   * @returns {Promise<Object>} Client information
   */
  async getClientInfo() {
    try {
      // Try to get real IP address from service
      let ip = 'unknown'
      let userAgent = navigator.userAgent

      // Use a public IP service to get real IP (not local network IP)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
        
        const response = await fetch('https://api.ipify.org?format=json', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          ip = data.ip || 'unknown'
        }
      } catch (error) {
        console.warn('Could not fetch real IP address:', error.message)
        // Fallback: use a placeholder IP for development
        ip = 'localhost'
      }

      return {
        ip,
        userAgent
      }
    } catch (error) {
      console.error('Error getting client info:', error)
      return {
        ip: 'unknown',
        userAgent: navigator.userAgent || 'unknown'
      }
    }
  }

  /**
   * Get geographic location from IP address
   * @param {string} ip - IP address
   * @returns {Promise<Object>} Location data
   */
  async getLocationFromIP(ip) {
    try {
      if (ip === 'unknown' || ip === 'localhost' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
          country: 'Local/Development',
          region: null,
          city: null,
          coords: null
        }
      }

      // Use ipapi.co for geolocation (free service with HTTPS)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FLDP-GIS-Portal/1.0'
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data && !data.error) {
          return {
            country: data.country_name || 'Unknown',
            region: data.region || null,
            city: data.city || null,
            coords: data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : null
          }
        }
      }
      
      // Fallback if the service fails
      return {
        country: 'Unknown',
        region: null,
        city: null,
        coords: null
      }
    } catch (error) {
      console.warn('Could not get location from IP:', error.message)
      return {
        country: 'Unknown',
        region: null,
        city: null,
        coords: null
      }
    }
  }

  /**
   * Parse user agent string to extract device information
   * @param {string} userAgent - User agent string
   * @returns {Object} Parsed device info
   */
  parseUserAgent(userAgent) {
    try {
      const info = {
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        device: 'Unknown',
        mobile: false
      }

      if (!userAgent) return info

      // Detect mobile
      info.mobile = /Mobile|Android|iPhone|iPad/.test(userAgent)

      // Detect OS
      if (/Windows NT/.test(userAgent)) {
        info.os = 'Windows'
        const match = userAgent.match(/Windows NT ([\d.]+)/)
        if (match) info.os += ` ${match[1]}`
      } else if (/Mac OS X/.test(userAgent)) {
        info.os = 'macOS'
        const match = userAgent.match(/Mac OS X ([\d_]+)/)
        if (match) info.os += ` ${match[1].replace(/_/g, '.')}`
      } else if (/Android/.test(userAgent)) {
        info.os = 'Android'
        const match = userAgent.match(/Android ([\d.]+)/)
        if (match) info.os += ` ${match[1]}`
      } else if (/iPhone OS/.test(userAgent)) {
        info.os = 'iOS'
        const match = userAgent.match(/iPhone OS ([\d_]+)/)
        if (match) info.os += ` ${match[1].replace(/_/g, '.')}`
      } else if (/Linux/.test(userAgent)) {
        info.os = 'Linux'
      }

      // Detect browser
      if (/Chrome/.test(userAgent) && !/Chromium/.test(userAgent)) {
        info.browser = 'Chrome'
        const match = userAgent.match(/Chrome\/([\d.]+)/)
        if (match) info.browserVersion = match[1]
      } else if (/Firefox/.test(userAgent)) {
        info.browser = 'Firefox'
        const match = userAgent.match(/Firefox\/([\d.]+)/)
        if (match) info.browserVersion = match[1]
      } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
        info.browser = 'Safari'
        const match = userAgent.match(/Version\/([\d.]+)/)
        if (match) info.browserVersion = match[1]
      } else if (/Edge/.test(userAgent)) {
        info.browser = 'Edge'
        const match = userAgent.match(/Edge\/([\d.]+)/)
        if (match) info.browserVersion = match[1]
      }

      // Detect device type
      if (/iPhone/.test(userAgent)) {
        info.device = 'iPhone'
      } else if (/iPad/.test(userAgent)) {
        info.device = 'iPad'
      } else if (/Android/.test(userAgent) && /Mobile/.test(userAgent)) {
        info.device = 'Android Phone'
      } else if (/Android/.test(userAgent)) {
        info.device = 'Android Tablet'
      } else if (info.mobile) {
        info.device = 'Mobile Device'
      } else {
        info.device = 'Desktop'
      }

      return info
    } catch (error) {
      console.error('Error parsing user agent:', error)
      return {
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        device: 'Unknown',
        mobile: false
      }
    }
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log successful login
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} sessionId - Session ID
   */
  async logLogin(userId, email, sessionId = null) {
    return this.logAccess({
      userId,
      email,
      eventType: 'login',
      success: true,
      sessionId: sessionId || this.generateSessionId()
    })
  }

  /**
   * Log failed login attempt
   * @param {string} email - Attempted email
   * @param {string} reason - Failure reason
   */
  async logFailedLogin(email, reason = 'invalid_credentials') {
    return this.logAccess({
      userId: null,
      email,
      eventType: 'login',
      success: false,
      sessionId: `failed_${Date.now()}_${reason}`
    })
  }

  /**
   * Log logout
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} sessionId - Session ID
   */
  async logLogout(userId, email, sessionId = null) {
    return this.logAccess({
      userId,
      email,
      eventType: 'logout',
      success: true,
      sessionId
    })
  }

  /**
   * Log session refresh/continuation
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} sessionId - Session ID
   */
  async logSessionRefresh(userId, email, sessionId = null) {
    return this.logAccess({
      userId,
      email,
      eventType: 'session_refresh',
      success: true,
      sessionId
    })
  }

  /**
   * Log access denied event
   * @param {string} email - User email (if available)
   * @param {string} reason - Denial reason
   */
  async logAccessDenied(email = null, reason = 'unauthorized') {
    return this.logAccess({
      userId: null,
      email,
      eventType: 'access_denied',
      success: false,
      sessionId: `denied_${Date.now()}_${reason}`
    })
  }
}

// Create and export singleton instance
export const accessLogService = new AccessLogService()
export default accessLogService