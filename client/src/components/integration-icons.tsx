import { integrationTypeEnum } from 'src/services/integration'

export const GoogleDriveIcon = ({ className = 'h-10 w-10' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285f4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34a853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#fbbc05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#ea4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export const S3Icon = ({ className = 'h-10 w-10' }: { className?: string }) => (
  <div
    className={`flex items-center justify-center rounded bg-orange-500 font-bold text-white ${className}`}
  >
    S3
  </div>
)

export const WebhookIcon = ({ className = 'h-10 w-10' }: { className?: string }) => (
  <div className={`flex items-center justify-center rounded bg-blue-500 text-white ${className}`}>
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
        clipRule="evenodd"
      />
    </svg>
  </div>
)

export const getIntegrationIcon = (type: string, className?: string) => {
  switch (type) {
    case integrationTypeEnum.GOOGLE_DRIVE:
      return <GoogleDriveIcon className={className} />
    case integrationTypeEnum.AWS_S3:
      return <S3Icon className={className} />
    case integrationTypeEnum.WEBHOOK:
      return <WebhookIcon className={className} />
    default:
      return <div className={`rounded bg-gray-300 ${className || 'h-8 w-8'}`}></div>
  }
}
