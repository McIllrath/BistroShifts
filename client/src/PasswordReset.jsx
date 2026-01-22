import React, { useState, useEffect } from 'react'

export default function PasswordReset() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [validation, setValidation] = useState({})

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) setToken(t)
  }, [])

  async function handleResetPassword(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    
    const v = {}
    if (!token) v.token = 'Token erforderlich'
    if (!password || password.length < 6) v.password = 'Passwort muss mindestens 6 Zeichen haben.'
    if (Object.keys(v).length) return setValidation(v)
    
    setBusy(true)
    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts')
      }
      
      setSuccess(true)
      setPassword('')
      setToken('')
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-3 p-md-4 mx-auto" style={{maxWidth:'500px'}}>
      <h2 className="mb-3">Passwort zurücksetzen</h2>
      
      {success ? (
        <div className="alert alert-success">
          <p>✓ Passwort erfolgreich geändert!</p>
          <p className="text-muted small">Sie werden in Kürze zur Login-Seite weitergeleitet...</p>
        </div>
      ) : (
        <form onSubmit={handleResetPassword}>
          {token && (
            <div className="mb-3">
              <label className="form-label">Token</label>
              <input 
                className="form-control" 
                type="text" 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                readOnly={!token || !!error}
              />
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Neues Passwort</label>
            <input 
              className="form-control form-control-lg" 
              type="password" 
              autoComplete="new-password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Mindestens 6 Zeichen"
            />
            {validation.password && <div className="form-text text-danger">{validation.password}</div>}
          </div>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <button 
            className="btn btn-primary btn-lg w-100" 
            type="submit" 
            disabled={busy || !token} 
            style={{minHeight:'48px'}}
          >
            {busy ? 'Wird aktualisiert...' : 'Passwort ändern'}
          </button>
        </form>
      )}
      
      <div className="muted mt-3 text-center">
        <a href="/" className="btn btn-link" style={{minHeight:'44px'}}>Zurück zur Startseite</a>
      </div>
    </div>
  )
}
