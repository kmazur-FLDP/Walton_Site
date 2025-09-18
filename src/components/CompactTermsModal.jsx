import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

const CompactTermsModal = ({ isOpen, onClose }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                      Terms and Conditions
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Compact Terms Content */}
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-800 font-semibold text-center">
                        ⚠️ CONFIDENTIAL DATA - NO UNAUTHORIZED SHARING
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-gray-900 mb-2">
                        Data Confidentiality Agreement
                      </h4>
                      <p className="leading-relaxed mb-3">
                        By accessing the Walton Global FLDP GIS Portal, you agree to maintain strict confidentiality of all data and information.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h5 className="font-semibold text-gray-900">🚫 Prohibited Actions</h5>
                        <ul className="ml-4 mt-1 space-y-1 list-disc text-xs">
                          <li>Sharing data with real estate agents, brokers, or developers</li>
                          <li>Disclosing information to competitors or unauthorized parties</li>
                          <li>Publishing or posting data on social media or websites</li>
                          <li>Distributing reports or insights outside your organization</li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">✅ Authorized Use</h5>
                        <p className="ml-4 text-xs">
                          Internal business use within your organization only, as outlined in your agreement with FLDP and Walton Global.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900">⚖️ Legal Consequences</h5>
                        <p className="ml-4 text-xs">
                          Violation may result in immediate access termination, legal action, and damages. All activity is logged and monitored.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 font-medium text-xs text-center">
                        This agreement is required for each login session to ensure compliance and security.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-center">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default CompactTermsModal