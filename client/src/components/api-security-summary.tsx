import { useState } from 'react'
import { Button } from './button'

interface ApiCall {
  url: string
  method: string
  secret_used: string
  auth_methods_attempted: string[]
  auth_method_successful: string | null
  response_size_bytes: number
  content_type: string
  security_scan_passed: boolean
  execution_time_ms: number
  rate_limit_remaining?: string | number
  errors: string[]
}

interface SecurityChecks {
  total_downloads: string
  malicious_content_detected: boolean
  prompt_injection_attempts: number
  unsafe_redirects: number
  rate_limits_hit: boolean
}

interface ApiSecuritySummaryData {
  api_calls: ApiCall[]
  security_checks: SecurityChecks
  recommendations: string[]
  errors: string[]
}

interface ApiSecuritySummaryProps {
  summary: ApiSecuritySummaryData | Record<string, any> | null | undefined
  className?: string
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname + urlObj.pathname
  } catch {
    return url
  }
}

const isValidApiSecuritySummary = (data: any): data is ApiSecuritySummaryData => {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.api_calls) &&
    typeof data.security_checks === 'object' &&
    Array.isArray(data.recommendations) &&
    Array.isArray(data.errors)
  )
}

export const ApiSecuritySummary = ({ summary, className = '' }: ApiSecuritySummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Type guard and validation
  if (!summary || !isValidApiSecuritySummary(summary)) {
    return null
  }

  // Don't render if no API calls
  if (!summary.api_calls || summary.api_calls.length === 0) {
    return null
  }

  const hasSecurityIssues =
    summary.security_checks?.malicious_content_detected ||
    summary.errors?.length > 0 ||
    summary.api_calls.some((call) => !call.security_scan_passed || call.errors?.length > 0)

  const hasRecommendations = summary.recommendations && summary.recommendations.length > 0

  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-blue-800">
            🔒 API Security Summary
            {hasSecurityIssues && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                Issues Detected
              </span>
            )}
          </h4>
          <div className="mt-1 text-sm text-blue-700">
            {summary.api_calls.length} API call{summary.api_calls.length !== 1 ? 's' : ''} made •{' '}
            {summary.security_checks?.total_downloads || '0B'} downloaded
          </div>
        </div>
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-100"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {/* Quick Status Indicators */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 font-medium ${
            hasSecurityIssues ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {hasSecurityIssues ? '⚠️ Security Issues' : '✓ Security Scan Passed'}
        </span>

        {summary.security_checks?.malicious_content_detected && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 font-medium text-red-800">
            🚨 Malicious Content Detected
          </span>
        )}

        {summary.security_checks?.prompt_injection_attempts > 0 && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 font-medium text-orange-800">
            🎯 Prompt Injection Attempts: {summary.security_checks.prompt_injection_attempts}
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* API Calls Made */}
          <div>
            <h5 className="mb-2 font-medium text-blue-800">API Calls</h5>
            <div className="space-y-2">
              {summary.api_calls.map((call, index) => (
                <div key={index} className="rounded-md border border-blue-200 bg-white p-3 text-sm">
                  <div className="font-medium text-gray-900">
                    <span className="mr-2 inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                      {call.method}
                    </span>
                    {formatUrl(call.url)}
                  </div>

                  <div className="mt-2 grid gap-1 text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                      <span>🔑 Secret: {call.secret_used}</span>
                      {call.auth_method_successful ? (
                        <span className="text-green-600">
                          ✓ Auth: {call.auth_method_successful}
                        </span>
                      ) : (
                        <span className="text-red-600">✗ Auth Failed</span>
                      )}
                      <span>📊 Size: {formatBytes(call.response_size_bytes)}</span>
                      <span>⏱️ {call.execution_time_ms}ms</span>
                    </div>

                    {call.content_type && <div>📄 Content-Type: {call.content_type}</div>}

                    {call.rate_limit_remaining && (
                      <div>⏳ Rate Limit: {call.rate_limit_remaining} remaining</div>
                    )}

                    {call.auth_methods_attempted && call.auth_methods_attempted.length > 1 && (
                      <div>🔄 Auth attempts: {call.auth_methods_attempted.join(' → ')}</div>
                    )}

                    {call.errors && call.errors.length > 0 && (
                      <div className="mt-1">
                        <span className="text-red-600">⚠️ Issues:</span>
                        <ul className="ml-4 mt-1 list-disc text-red-600">
                          {call.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Summary */}
          {summary.security_checks && (
            <div>
              <h5 className="mb-2 font-medium text-blue-800">Security Checks</h5>
              <div className="rounded-md border border-blue-200 bg-white p-3 text-sm">
                <div className="grid gap-1 text-gray-600">
                  <div>📥 Total Downloads: {summary.security_checks.total_downloads}</div>
                  <div>
                    🛡️ Malicious Content:{' '}
                    {summary.security_checks.malicious_content_detected ? 'Detected' : 'None'}
                  </div>
                  <div>
                    🎯 Prompt Injection Attempts:{' '}
                    {summary.security_checks.prompt_injection_attempts || 0}
                  </div>
                  <div>🔗 Unsafe Redirects: {summary.security_checks.unsafe_redirects || 0}</div>
                  <div>
                    ⏰ Rate Limits Hit: {summary.security_checks.rate_limits_hit ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {hasRecommendations && (
            <div>
              <h5 className="mb-2 font-medium text-blue-800">💡 Recommendations</h5>
              <div className="rounded-md border border-blue-200 bg-white p-3">
                <ul className="space-y-1 text-sm text-gray-700">
                  {summary.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-blue-600">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Errors */}
          {summary.errors && summary.errors.length > 0 && (
            <div>
              <h5 className="mb-2 font-medium text-red-800">❌ Errors</h5>
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <ul className="space-y-1 text-sm text-red-700">
                  {summary.errors.map((error, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-red-600">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ApiSecuritySummary
