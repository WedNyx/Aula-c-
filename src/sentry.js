import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.authorization
          delete event.request.headers.Cookie
          delete event.request.headers.cookie
        }
      }
      return event
    },
  })
}

export { Sentry }
