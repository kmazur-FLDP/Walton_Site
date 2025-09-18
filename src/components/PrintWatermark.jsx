import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const PrintWatermark = () => {
  const { user } = useAuth()

  useEffect(() => {
    // Create dynamic CSS for user-specific watermarks
    const createUserWatermarkStyles = () => {
      if (!user) return

      const timestamp = new Date().toLocaleString()
      const userEmail = user.email || 'Unknown User'
      const sessionId = localStorage.getItem('sessionId') || 'No Session'
      
      // Remove existing watermark styles
      const existingStyle = document.getElementById('user-watermark-styles')
      if (existingStyle) {
        existingStyle.remove()
      }

      // Create new style element with user-specific information
      const style = document.createElement('style')
      style.id = 'user-watermark-styles'
      style.textContent = `
        @media print {
          /* User-specific footer watermark */
          .print-footer-watermark::after {
            content: "Printed by: ${userEmail} | ${timestamp} | Session: ${sessionId.slice(0, 8)}... | CONFIDENTIAL - DO NOT DISTRIBUTE" !important;
          }
          
          /* User identification in corner */
          .print-user-watermark::after {
            content: "${userEmail.substring(0, 20)}... | ${timestamp}" !important;
          }
          
          /* Dynamic diagonal watermark with user info */
          .print-user-diagonal::before {
            content: "CONFIDENTIAL - ${userEmail} - ${new Date().toLocaleDateString()}" !important;
            position: fixed !important;
            top: 30% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) rotate(-45deg) !important;
            font-size: 24px !important;
            font-weight: bold !important;
            color: rgba(239, 68, 68, 0.12) !important;
            z-index: 999 !important;
            pointer-events: none !important;
            white-space: nowrap !important;
            font-family: Arial, sans-serif !important;
          }
          
          /* Warning banner for sensitive pages */
          .print-warning-banner::before {
            content: "⚠️ CONFIDENTIAL DOCUMENT - Unauthorized sharing of this information is prohibited by law and may result in legal action. Printed by ${userEmail} on ${timestamp}" !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: #fef2f2 !important;
            border: 2px solid #dc2626 !important;
            color: #dc2626 !important;
            font-size: 10px !important;
            font-weight: bold !important;
            padding: 8px !important;
            text-align: center !important;
            z-index: 1003 !important;
            font-family: Arial, sans-serif !important;
          }
          
          /* Page numbering with user info */
          .print-page-info::after {
            content: "User: ${userEmail} | Page " counter(page) " | " !important;
            position: fixed !important;
            bottom: 0 !important;
            right: 10px !important;
            font-size: 8px !important;
            color: #6b7280 !important;
            font-family: monospace !important;
          }
        }
      `
      
      document.head.appendChild(style)
    }

    // Apply watermark styles when component mounts or user changes
    createUserWatermarkStyles()

    // Update watermarks when page visibility changes (print dialog)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User might be printing, refresh watermarks
        setTimeout(createUserWatermarkStyles, 100)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  useEffect(() => {
    // Add watermark classes to body and main content areas
    const addWatermarkClasses = () => {
      // Add main watermark container class to body
      document.body.classList.add('print-watermark-container')
      
      // Add watermark classes to main content areas
      const mainContent = document.querySelector('main') || document.querySelector('#root')
      if (mainContent) {
        mainContent.classList.add('print-content-watermark', 'print-watermark-repeat')
      }

      // Add classes to specific elements
      const contentAreas = document.querySelectorAll('.card, .bg-white, .p-4, .p-6')
      contentAreas.forEach(element => {
        element.classList.add('print-user-diagonal')
      })

      // Add warning banner to sensitive areas
      const sensitiveAreas = document.querySelectorAll('[data-sensitive="true"], .admin-only, .confidential')
      sensitiveAreas.forEach(element => {
        element.classList.add('print-warning-banner')
      })

      // Add footer watermark container
      let footerWatermark = document.querySelector('.print-footer-watermark')
      if (!footerWatermark) {
        footerWatermark = document.createElement('div')
        footerWatermark.className = 'print-footer-watermark'
        document.body.appendChild(footerWatermark)
      }

      // Add user watermark container  
      let userWatermark = document.querySelector('.print-user-watermark')
      if (!userWatermark) {
        userWatermark = document.createElement('div')
        userWatermark.className = 'print-user-watermark'
        document.body.appendChild(userWatermark)
      }

      // Add page info container
      let pageInfo = document.querySelector('.print-page-info')
      if (!pageInfo) {
        pageInfo = document.createElement('div')
        pageInfo.className = 'print-page-info'
        document.body.appendChild(pageInfo)
      }
    }

    // Apply classes after a short delay to ensure DOM is ready
    const timer = setTimeout(addWatermarkClasses, 100)

    return () => {
      clearTimeout(timer)
      // Cleanup watermark containers on unmount
      const containers = document.querySelectorAll('.print-footer-watermark, .print-user-watermark, .print-page-info')
      containers.forEach(container => {
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      })
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default PrintWatermark