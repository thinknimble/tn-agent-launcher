import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'OAUTH_ERROR',
            error: `OAuth error: ${error}`,
          },
          '*',
        )
      }
      window.close()
      return
    }

    if (code && state) {
      // Send OAuth result back to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'OAUTH_CALLBACK',
            data: {
              code,
              state,
            },
          },
          '*',
        )
      }
      window.close()
    } else {
      console.error('Missing code or state in OAuth callback')
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'OAUTH_ERROR',
            error: 'Missing authorization code or state',
          },
          '*',
        )
      }
      window.close()
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Processing OAuth callback...</p>
        <p className="mt-2 text-sm text-gray-400">This window will close automatically.</p>
      </div>
    </div>
  )
}
