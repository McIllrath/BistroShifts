import React, { useEffect, useState } from 'react'
import { listShifts, signupShift } from './api'

export default function Shifts({ token }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [signupLoading, setSignupLoading] = useState({})

  useEffect(() => {
    fetch()
  }, [])

  async function fetch() {
    setLoading(true)
    setError(null)
    try {
      const res = await listShifts()
      setShifts(res.items || [])
    } catch (e) {
      setError('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(id) {
    if (signupLoading[id]) return
    setSignupLoading(s => ({ ...s, [id]: true }))
    try {
      await signupShift(id, token)
      alert('Erfolgreich angemeldet')
      await fetch()
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      alert('Fehler: ' + msg)
      await fetch()
    } finally {
      setSignupLoading(s => ({ ...s, [id]: false }))
    }
  }

  if (loading) return <div className="p-3">Loading...</div>
  if (error) return <div className="alert alert-danger">{error}</div>

  return (
    <div>
      <h2 className="mb-3">Verfügbare Schichten</h2>
      {shifts.length === 0 && <div className="alert alert-info">Keine Schichten vorhanden.</div>}
      <div className="row g-3">
        {shifts.map(s => {
          const remaining = (s.capacity || 0) - (s.registered_count || 0)
          const isFull = remaining <= 0
          return (
            <div key={s.id} className="col-12">
              <div className="card">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-1">{s.title}</h5>
                    <div className="text-muted small">{new Date(s.start_time).toLocaleString()} — {new Date(s.end_time).toLocaleString()}</div>
                    <div className="small">Plätze frei: {remaining} / {s.capacity}</div>
                  </div>
                  <div>
                    <button className="btn btn-primary" onClick={() => handleSignup(s.id)} disabled={isFull || signupLoading[s.id]}>{signupLoading[s.id] ? 'Anmeldung…' : (isFull ? 'Voll' : 'Eintragen')}</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
