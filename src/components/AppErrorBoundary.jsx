import { Sentry } from '../sentry.js'

function Fallback({ resetError }) {
  return (
    <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24, background:'#120b22', color:'#f5f3ff' }}>
      <section role="alert" style={{ width:'min(520px,100%)', padding:24, border:'1px solid #6d28d9', borderRadius:16, background:'#1d1233', textAlign:'center' }}>
        <h1 style={{ marginTop:0 }}>Algo inesperado aconteceu</h1>
        <p>O problema foi registrado para análise. Você pode tentar abrir a plataforma novamente.</p>
        <button type="button" onClick={resetError} style={{ border:0, borderRadius:10, padding:'10px 18px', background:'#7c3aed', color:'white', fontWeight:700, cursor:'pointer' }}>Tentar novamente</button>
      </section>
    </main>
  )
}

export function AppErrorBoundary({ children }) {
  return <Sentry.ErrorBoundary fallback={({ resetError }) => <Fallback resetError={resetError} />}>{children}</Sentry.ErrorBoundary>
}
