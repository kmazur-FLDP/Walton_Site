import { PrinterIcon } from '@heroicons/react/24/outline'

const PrintButton = ({ 
  children = 'Print Page',
  className = '',
  contentSelector = null,
  showWarning = true 
}) => {
  
  const handlePrint = () => {
    if (showWarning) {
      const confirmed = window.confirm(
        '⚠️ SECURITY NOTICE\n\n' +
        'This document contains confidential information. By printing, you acknowledge:\n\n' +
        '• This document will include watermarks with your email and timestamp\n' +
        '• You will not share this printed document with unauthorized parties\n' +
        '• You understand this action is logged for security purposes\n\n' +
        'Do you want to continue printing?'
      )
      
      if (!confirmed) {
        return
      }
    }

    // Add additional print-specific styling
    document.body.classList.add('printing')
    
    // If content selector is provided, only print that content
    if (contentSelector) {
      const element = document.querySelector(contentSelector)
      if (element) {
        const originalDisplay = document.body.style.display
        const originalVisibility = Array.from(document.body.children).map(child => child.style.visibility)
        
        // Hide everything except the target element
        Array.from(document.body.children).forEach(child => {
          if (!child.contains(element) && child !== element) {
            child.style.visibility = 'hidden'
          }
        })
        
        // Print
        window.print()
        
        // Restore visibility
        Array.from(document.body.children).forEach((child, index) => {
          child.style.visibility = originalVisibility[index] || ''
        })
        document.body.style.display = originalDisplay
      }
    } else {
      // Print entire page
      window.print()
    }
    
    // Remove print styling
    setTimeout(() => {
      document.body.classList.remove('printing')
    }, 1000)
  }

  return (
    <button
      onClick={handlePrint}
      className={`print-button ${className}`}
      title="Print with security watermarks"
    >
      <PrinterIcon className="h-4 w-4" />
      <span>{children}</span>
    </button>
  )
}

export default PrintButton