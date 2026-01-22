import React, { useState, useEffect } from 'react'
import Login from './Login'
import PasswordReset from './PasswordReset'
import Shifts from './Shifts'
import Admin from './Admin'
import Kiosk from './Kiosk'
import EventProposal from './EventProposal'
import { getMe } from './api'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('shifts')
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    // Listen for path changes
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    async function fetchMe() {
      if (!token) return setUser(null)
      try {
        const me = await getMe(token)
        setUser(me.user)
      } catch (e) {
        console.error(e)
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
      }
    }
    fetchMe()
  }, [token])

  function onLogin(tok) {
    setToken(tok)
    localStorage.setItem('token', tok)
  }

  function onLogout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  // Show password reset page if URL contains /password-reset
  if (window.location.pathname === '/password-reset' || currentPath === '/password-reset') {
    return (
      <div className="container py-4">
        <PasswordReset />
      </div>
    )
  }

  return (
    <div className="container">
      <header className="d-flex flex-wrap justify-content-between align-items-center mb-3 py-2">
        <h1 className="m-0 flex-shrink-1" style={{fontSize:'clamp(1.25rem, 5vw, 2rem)'}}>Wochenend-Schichten</h1>
        {user ? (
          <div className="user d-flex align-items-center gap-2 flex-wrap mt-2 mt-md-0">
            <span className="text-truncate" style={{maxWidth:'150px'}}>{user.display_name || user.email}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={onLogout} style={{minHeight:'40px'}}>Logout</button>
          </div>
        ) : null}
      </header>

        <main>
          {!token ? (
            <Login onLogin={onLogin} />
          ) : (
            <div>
              <nav className="mb-3">
                <div className="btn-group w-100" role="group" aria-label="views">
                  <button className={`btn btn-outline-primary ${view==='shifts' ? 'active' : ''}`} onClick={() => setView('shifts')} style={{minHeight:'44px'}}>Schichten</button>
                  <button className={`btn btn-outline-primary ${view==='events' ? 'active' : ''}`} onClick={() => setView('events')} style={{minHeight:'44px'}}>Events</button>
                  <button className={`btn btn-outline-primary ${view==='kiosk' ? 'active' : ''}`} onClick={() => setView('kiosk')} style={{minHeight:'44px'}}>Kiosk</button>
                  {user && user.role === 'admin' && <button className={`btn btn-outline-primary ${view==='admin' ? 'active' : ''}`} onClick={() => setView('admin')} style={{minHeight:'44px'}}>Admin</button>}
                </div>
              </nav>
              {view === 'shifts' && <Shifts token={token} />}
              {view === 'events' && <EventProposal token={token} onSuccess={() => alert('Event-Antrag eingereicht!')} />}
              {view === 'kiosk' && <Kiosk />}
              {view === 'admin' && user && user.role === 'admin' && <Admin token={token} />}
            </div>
          )}
        </main>
    </div>
  )
}
