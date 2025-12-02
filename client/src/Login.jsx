import React, { useState } from 'react'
import { login, register } from './api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [validation, setValidation] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setValidation({})
    // basic client-side validation
    const v = {}
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) v.email = 'Bitte gültige E-Mail angeben.'
    if (!password || password.length < 6) v.password = 'Passwort muss mindestens 6 Zeichen haben.'
    if (mode === 'register' && (!name || name.length < 2)) v.name = 'Bitte Namen angeben.'
    if (Object.keys(v).length) return setValidation(v)
    setBusy(true)
    try {
      if (mode === 'login') {
        const res = await login(email, password)
        onLogin(res.token)
      } else {
        await register(email, password, name)
        const res = await login(email, password)
        onLogin(res.token)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-3 p-md-4 mx-auto" style={{maxWidth:'500px'}}>
      <h2 className="mb-3">{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="mb-3">
            <label className="form-label">Display name</label>
            <input className="form-control form-control-lg" value={name} onChange={e => setName(e.target.value)} />
            {validation.name && <div className="form-text text-danger">{validation.name}</div>}
          </div>
        )}
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control form-control-lg" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          {validation.email && <div className="form-text text-danger">{validation.email}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input className="form-control form-control-lg" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} />
          {validation.password && <div className="form-text text-danger">{validation.password}</div>}
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy} style={{minHeight:'48px'}}>{busy ? (mode === 'login' ? 'Logging in...' : 'Creating...') : (mode === 'login' ? 'Login' : 'Register')}</button>
      </form>
      <div className="muted mt-3 text-center">
        <button className="btn btn-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{minHeight:'44px'}}>{mode === 'login' ? 'Create account' : 'Back to login'}</button>
      </div>
    </div>
  )
}
