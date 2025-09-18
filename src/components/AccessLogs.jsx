import { useState, useEffect, useMemo, useCallback } from 'react'
import adminService from '../services/adminService'
import LoadingSpinner from './LoadingSpinner'

const AccessLogs = () => {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    eventType: '',
    dateRange: '7', // days
    limit: 100
  })
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 25

  const fetchAccessLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate date filter
      const dateFrom = filters.dateRange 
        ? new Date(Date.now() - parseInt(filters.dateRange) * 24 * 60 * 60 * 1000).toISOString()
        : null

      const filterParams = {
        eventType: filters.eventType || undefined,
        dateFrom,
        limit: filters.limit
      }

      const data = await adminService.getAccessLogs(filterParams)
      setLogs(data)
    } catch (err) {
      console.error('Error fetching access logs:', err)
      setError('Failed to load access logs')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await adminService.getAccessLogStats()
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching access log stats:', err)
    }
  }, [])

  useEffect(() => {
    fetchAccessLogs()
    fetchStats()
  }, [fetchAccessLogs, fetchStats])

  // Pagination logic
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * logsPerPage
    return logs.slice(startIndex, startIndex + logsPerPage)
  }, [logs, currentPage])

  const totalPages = Math.ceil(logs.length / logsPerPage)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getEventBadgeColor = (eventType, success) => {
    switch (eventType) {
      case 'login':
        return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      case 'logout':
        return 'bg-blue-100 text-blue-800'
      case 'session_refresh':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventIcon = (eventType, success) => {
    switch (eventType) {
      case 'login':
        return success ? '✅' : '❌'
      case 'logout':
        return '🚪'
      case 'session_refresh':
        return '🔄'
      default:
        return '📝'
    }
  }

  if (loading && logs.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Access</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalAccess}</div>
            <div className="text-xs text-gray-400">Last 30 days</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Successful Logins</div>
            <div className="text-2xl font-bold text-green-600">{stats.successfulLogins}</div>
            <div className="text-xs text-gray-400">{stats.loginSuccessRate}% success rate</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Failed Logins</div>
            <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
            <div className="text-xs text-gray-400">Security alerts</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Unique Users</div>
            <div className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</div>
            <div className="text-xs text-gray-400">Active users</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Unique IPs</div>
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueIPs}</div>
            {stats.suspiciousIPs > 0 && (
              <div className="text-xs text-red-500">{stats.suspiciousIPs} suspicious</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Events</option>
              <option value="login">Logins</option>
              <option value="logout">Logouts</option>
              <option value="session_refresh">Session Refresh</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="">All time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
              <option value={250}>250 records</option>
              <option value={500}>500 records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Access Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Recent Access Logs
            {loading && <span className="ml-2">🔄</span>}
          </h3>
          <p className="text-sm text-gray-500">
            Showing {paginatedLogs.length} of {logs.length} logs
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {loading ? 'Loading access logs...' : 'No access logs found'}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getEventIcon(log.event_type, log.success)}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventBadgeColor(log.event_type, log.success)}`}>
                          {log.event_type}
                        </span>
                        {!log.success && log.error_message && (
                          <span className="ml-2 text-xs text-red-500" title={log.error_message}>
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.email || 'Anonymous'}
                      </div>
                      {log.user_id && (
                        <div className="text-xs text-gray-500">
                          ID: {log.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.ip_address}
                      </div>
                      {log.isp && (
                        <div className="text-xs text-gray-500">
                          {log.isp}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.location_city && log.location_region 
                          ? `${log.location_city}, ${log.location_region}`
                          : log.location_country || 'Unknown'
                        }
                      </div>
                      {log.location_country && (
                        <div className="text-xs text-gray-500">
                          {log.location_country}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.device_type || 'Unknown'}
                      </div>
                      {log.device_os && log.browser && (
                        <div className="text-xs text-gray-500">
                          {log.device_os} • {log.browser}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div title={formatDate(log.created_at)}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspicious Activity Alert */}
      {stats && (stats.suspiciousIPs > 0 || stats.multiLocationUsers > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Suspicious Activity Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {stats.suspiciousIPs > 0 && (
                    <li>{stats.suspiciousIPs} suspicious IP address(es) detected</li>
                  )}
                  {stats.multiLocationUsers > 0 && (
                    <li>{stats.multiLocationUsers} user(s) accessing from multiple locations</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccessLogs