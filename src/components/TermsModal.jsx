import { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const TermsModal = ({ isOpen, onAccept, onDecline, loading = false }) => {
  // SUPER SIMPLE VERSION FOR DEBUGGING
  const [agreed, setAgreed] = useState(false)

  console.log('TermsModal render - agreed:', agreed)

  const handleCheckboxChange = () => {
    console.log('Checkbox clicked! Current state:', agreed)
    const newState = !agreed
    setAgreed(newState)
    console.log('New state:', newState)
  }

  const handleAcceptClick = () => {
    console.log('Accept button clicked, agreed state:', agreed)
    if (agreed) {
      onAccept()
    } else {
      alert('Please check the agreement box first')
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-6">
                  <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900">
                    Terms and Conditions
                  </Dialog.Title>
                </div>

                {/* Terms Content */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
                  <div className="space-y-4 text-sm text-gray-700">
                    <h4 className="font-bold text-lg text-gray-900">
                      Data Confidentiality and Non-Disclosure Agreement
                    </h4>
                    
                    <p className="leading-relaxed">
                      By accessing and using the Walton Global FLDP GIS Portal ("the Portal"), you acknowledge and agree to the following terms and conditions:
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h5 className="font-semibold text-gray-900">1. Confidential Information</h5>
                        <p className="ml-4">
                          All data, maps, property information, analytics, insights, reports, and any other information accessed through this Portal is considered proprietary and confidential information belonging to Florida Land Design & Permitting (FLDP) and/or its data partners.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">2. Non-Disclosure Obligation</h5>
                        <p className="ml-4">
                          You agree that you <strong>WILL NOT</strong> share, distribute, disclose, or communicate any data, insights, or information obtained from this Portal to any third parties, including but not limited to:
                        </p>
                        <ul className="ml-8 mt-2 space-y-1 list-disc">
                          <li>Real estate agents or brokers</li>
                          <li>Property developers or investors</li>
                          <li>Competitors or business partners</li>
                          <li>Media or publications</li>
                          <li>Social media platforms</li>
                          <li>Any individuals outside of your immediate company</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">3. Authorized Use</h5>
                        <p className="ml-4">
                          The information provided is solely for internal business use within your organization and for the specific purposes outlined in your agreement with FLDP and Walton Global.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">4. Data Security</h5>
                        <p className="ml-4">
                          You agree to maintain appropriate security measures to protect any downloaded or accessed information and to prevent unauthorized access or disclosure.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">5. Consequences of Violation</h5>
                        <p className="ml-4">
                          Violation of these terms may result in immediate termination of access, legal action, and potential damages. All activities on this Portal are logged and monitored.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">6. Acceptance</h5>
                        <p className="ml-4">
                          By clicking "I Accept" below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 font-semibold">
                        ⚠️ IMPORTANT: This agreement is legally binding. Unauthorized disclosure of confidential information may result in legal consequences.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox - FIXED VERSION */}
                <div className="mb-6">
                  {/* Large clickable area with checkbox - WORKING METHOD */}
                  <div 
                    className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                      agreed ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-blue-50'
                    }`}
                    onClick={handleCheckboxChange}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={() => {}} // Handled by parent div click
                        className="mt-1 h-6 w-6 text-green-600 focus:ring-green-500 border-2 border-gray-400 rounded pointer-events-none"
                      />
                      <div className="flex-1 pointer-events-none">
                        <div className="text-base font-medium text-gray-900">
                          {agreed ? '✅ ' : '☐ '}
                          I have read and agree to the terms and conditions above
                        </div>
                        <div className="text-sm mt-1 text-gray-700">
                          I understand that I will NOT share any data or insights from this portal outside of my company, including with real estate agents.
                        </div>
                        
                        {/* Clear status indicator */}
                        <div className="mt-2">
                          {agreed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓ Agreement Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              ○ Click anywhere in this box to accept terms
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                                {/* Action Buttons */}
                <div className="flex justify-between space-x-4">
                  <button
                    type="button"
                    onClick={onDecline}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleAcceptClick}
                    className={`px-8 py-2 rounded-md font-medium text-white transition-colors ${
                      agreed 
                        ? 'bg-green-600 hover:bg-green-700 cursor-pointer' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {agreed ? 'I Accept - Continue' : 'Please Check Box First'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Your acceptance will be recorded for compliance purposes.
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default TermsModal