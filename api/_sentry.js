import * as Sentry from '@sentry/node'

let initialized = false

export function initServerSentry() {
  const dsn = process.env.SENTRY_DSN || ''
  if (!dsn || initialized) return false
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        if (event.request.headers) {
          delete event.request.headers.authorization
          delete event.request.headers.cookie
          delete event.request.headers['x-rapidapi-key']
        }
      }
      return event
    },
  })
  initialized = true
  return true
}

export function captureServerError(error, context = {}) {
  if (!initServerSentry()) return
  Sentry.withScope(scope => {
    for (const [key, value] of Object.entries(context)) scope.setTag(key, String(value))
    Sentry.captureException(error)
  })
}
