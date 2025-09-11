import { Fragment, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import adminService from '../services/adminService'

const Navbar = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        console.log('Checking admin status for user:', user.email)
        const adminStatus = await adminService.isAdmin()
        console.log('Admin status result:', adminStatus)
        setIsAdmin(adminStatus)
      }
    }
    checkAdminStatus()
  }, [user])

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
    }
  }

  return (
    <Disclosure as="nav" className="glass shadow-sm sticky top-0 z-50">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-24">
              <div className="flex items-center">
                              <div className="flex-shrink-0 flex items-center">
                {/* FLDP Company Logo */}
                <img 
                  src="/fldp_final_color.png" 
                  alt="FLDP Logo" 
                  className="h-16 w-auto"
                />
                <span className="ml-3 text-xl font-semibold text-gray-900">
                  GIS Portal
                </span>
              </div>
                <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                  <button
                    onClick={() => navigate('/')}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/favorites')}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Favorites
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="text-red-700 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors"
                    >
                      Admin
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {/* Client Logo */}
                <div className="mr-6 flex items-center">
                  <img 
                    src="/walton_logo.webp" 
                    alt="Walton Global" 
                    className="h-8 w-auto mr-2"
                  />
                  <span className="text-sm text-gray-600 font-medium">Walton Global Portal</span>
                </div>
                
                <Menu as="div" className="ml-3 relative">
                  <Menu.Button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                          {user?.email}
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleSignOut}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>

              <div className="sm:hidden flex items-center">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-white border-t">
              <button
                onClick={() => navigate('/')}
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 w-full text-left"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/favorites')}
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 w-full text-left"
              >
                Favorites
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="block pl-3 pr-4 py-2 text-base font-medium text-red-700 hover:text-red-600 hover:bg-red-50 w-full text-left"
                >
                  Admin
                </button>
              )}
              <div className="border-t pt-4 pb-3">
                <div className="px-4 text-sm text-gray-500">{user?.email}</div>
                <button
                  onClick={handleSignOut}
                  className="mt-2 block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 w-full text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}

export default Navbar
