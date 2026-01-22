import React, { useState } from 'react'
import { login, register } from './api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('login') // 'login', 'register', 'forgot-password', 'reset-password'
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [validation, setValidation] = useState({})
  const [resetToken, setResetToken] = useState('')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    
    const v = {}
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) v.email = 'Bitte gültige E-Mail angeben.'
    if (!password || password.length < 6) v.password = 'Passwort muss mindestens 6 Zeichen haben.'
    if (Object.keys(v).length) return setValidation(v)
    
    setBusy(true)
    try {
      const res = await login(email, password)
      onLogin(res.token)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    
    const v = {}
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) v.email = 'Bitte gültige E-Mail angeben.'
    if (!password || password.length < 6) v.password = 'Passwort muss mindestens 6 Zeichen haben.'
    if (!name || name.length < 2) v.name = 'Bitte Namen angeben.'
    if (Object.keys(v).length) return setValidation(v)
    
    setBusy(true)
    try {
      await register(email, password, name)
      const res = await login(email, password)
      onLogin(res.token)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    
    const v = {}
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) v.email = 'Bitte gültige E-Mail angeben.'
    if (Object.keys(v).length) return setValidation(v)
    
    setBusy(true)
    try {
      const response = await fetch('/api/password/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler')
      setResetSent(true)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    
    const v = {}
    if (!resetToken) v.resetToken = 'Reset-Link erforderlich'
    if (!password || password.length < 6) v.password = 'Passwort muss mindestens 6 Zeichen haben.'
    if (Object.keys(v).length) return setValidation(v)
    
    setBusy(true)
    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler')
      
      setError(null)
      setMode('login')
      setEmail('')
      setPassword('')
      setResetToken('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-3 p-md-4 mx-auto" style={{maxWidth:'500px'}}>
      {mode === 'login' && (
        <>
          <h2 className="mb-3">Login</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control form-control-lg" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
              {validation.email && <div className="form-text text-danger">{validation.email}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className="form-control form-control-lg" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              {validation.password && <div className="form-text text-danger">{validation.password}</div>}
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy} style={{minHeight:'48px'}}>{busy ? 'Logging in...' : 'Login'}</button>
          </form>
          <div className="muted mt-3 text-center">
            <button className="btn btn-link btn-sm" onClick={() => { setMode('forgot-password'); setError(null); setResetSent(false) }}>Passwort vergessen?</button>
            <div className="mt-2">
              <button className="btn btn-link" onClick={() => { setMode('register'); setError(null) }} style={{minHeight:'44px'}}>Konto erstellen</button>
            </div>
          </div>
        </>
      )}

      {mode === 'register' && (
        <>
          <h2 className="mb-3">Registrieren</h2>
          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <label className="form-label">Display name</label>
              <input className="form-control form-control-lg" value={name} onChange={e => setName(e.target.value)} />
              {validation.name && <div className="form-text text-danger">{validation.name}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control form-control-lg" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
              {validation.email && <div className="form-text text-danger">{validation.email}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className="form-control form-control-lg" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
              {validation.password && <div className="form-text text-danger">{validation.password}</div>}
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy} style={{minHeight:'48px'}}>{busy ? 'Creating...' : 'Registrieren'}</button>
          </form>
          <div className="muted mt-3 text-center">
            <button className="btn btn-link" onClick={() => { setMode('login'); setError(null) }} style={{minHeight:'44px'}}>Zurück zu Login</button>
          </div>
        </>
      )}

      {mode === 'forgot-password' && (
        <>
          <h2 className="mb-3">Passwort zurücksetzen</h2>
          {resetSent ? (
            <div className="alert alert-info">
              <p>Ein Reset-Link wurde an Ihre E-Mail-Adresse gesendet (falls diese in unserem System existiert).</p>
              <p>Bitte überprüfen Sie Ihren Posteingang und klicken Sie auf den Link, um Ihr Passwort zurückzusetzen.</p>
              <p className="text-muted small">Der Link verfällt in 1 Stunde.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control form-control-lg" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                {validation.email && <div className="form-text text-danger">{validation.email}</div>}
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy} style={{minHeight:'48px'}}>{busy ? 'Senden...' : 'Reset-Link anfordern'}</button>
            </form>
          )}
          <div className="muted mt-3 text-center">
            <button className="btn btn-link" onClick={() => { setMode('login'); setError(null); setResetSent(false) }} style={{minHeight:'44px'}}>Zurück zu Login</button>
          </div>
        </>
      )}

      {mode === 'reset-password' && (
        <>
          <h2 className="mb-3">Neues Passwort setzen</h2>
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label className="form-label">Reset Token</label>
              <input className="form-control form-control-lg" type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Token aus dem E-Mail-Link" />
              {validation.resetToken && <div className="form-text text-danger">{validation.resetToken}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Neues Passwort</label>
              <input className="form-control form-control-lg" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
              {validation.password && <div className="form-text text-danger">{validation.password}</div>}
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy} style={{minHeight:'48px'}}>{busy ? 'Updating...' : 'Passwort ändern'}</button>
          </form>
          <div className="muted mt-3 text-center">
            <button className="btn btn-link" onClick={() => { setMode('login'); setError(null) }} style={{minHeight:'44px'}}>Zurück zu Login</button>
          </div>
        </>
      )}
    </div>
  )
}
