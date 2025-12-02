import React, { useState } from 'react'
import { createEvent } from './api'

export default function EventProposal({ token, onSuccess }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [membersOnly, setMembersOnly] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!title || !startTime || !endTime) {
      setError('Titel, Start- und Endzeit sind erforderlich')
      setLoading(false)
      return
    }

    try {
      await createEvent({ title, description, members_only: membersOnly, start_time: startTime, end_time: endTime }, token)
      // Reset form
      setTitle('')
      setDescription('')
      setMembersOnly(false)
      setStartTime('')
      setEndTime('')
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || 'Event-Antrag fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Veranstaltung beantragen</h2>
      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Titel *</label>
              <input
                type="text"
                className="form-control form-control-lg"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Beschreibung</label>
              <textarea
                className="form-control"
                rows="3"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="membersOnlySwitch"
                  checked={membersOnly}
                  onChange={e => setMembersOnly(e.target.checked)}
                  style={{ minWidth: '48px', minHeight: '24px', cursor: 'pointer' }}
                />
                <label className="form-check-label" htmlFor="membersOnlySwitch" style={{ cursor: 'pointer', paddingLeft: '0.5rem' }}>
                  Nur für Mitglieder
                </label>
              </div>
              <small className="text-muted">Wenn aktiviert, ist das Event nur für Mitglieder sichtbar und zugänglich</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Startzeit *</label>
              <input
                type="datetime-local"
                className="form-control form-control-lg"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Endzeit *</label>
              <input
                type="datetime-local"
                className="form-control form-control-lg"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading} style={{ minHeight: '48px' }}>
              {loading ? 'Wird gesendet...' : 'Event beantragen'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Ihr Event-Antrag wird an einen Administrator zur Genehmigung weitergeleitet. Sie werden benachrichtigt, sobald eine Entscheidung getroffen wurde.
      </div>
    </div>
  )
}
