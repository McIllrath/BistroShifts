import React, { useEffect, useState, useMemo } from 'react'
import { listShifts, createShift, updateShift, deleteShift, listParticipants, listUsers, setUserRole, createUser, deleteUser, removeParticipant, listEvents, approveEvent, rejectEvent, updateEvent, deleteEvent } from './api'
import Modal from './Modal'
import Toaster from './Toasts'

function isoToLocalDatetime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localToISOString(local) {
  if (!local) return null
  const [date, time] = local.split('T')
  if (!date || !time) return null
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const dt = new Date(y, m - 1, d, hh, mm)
  return dt.toISOString()
}

export default function Admin({ token }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', start_local: '', end_local: '', capacity: 1, location: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [participants, setParticipants] = useState([])
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ email: '', password: '', display_name: '', role: 'user' })
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('asc')
  const [toasts, setToasts] = useState([])
  const [events, setEvents] = useState([])
  const [adminNotes, setAdminNotes] = useState({})
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [eventForm, setEventForm] = useState({ title: '', description: '', members_only: false, start_time: '', end_time: '' })

  function addToast(message, type = 'info', timeout = 4000) {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    if (timeout > 0) setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeout)
  }

  // computed filtered + sorted users
  const displayedUsers = useMemo(() => {
    const q = (filter || '').toLowerCase().trim()
    let list = users.slice()
    if (q) list = list.filter(u => (u.email || '').toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q) || String(u.id) === q)
    list.sort((a, b) => {
      const av = (a[sortBy] == null) ? '' : String(a[sortBy]).toLowerCase()
      const bv = (b[sortBy] == null) ? '' : String(b[sortBy]).toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [users, filter, sortBy, sortDir])

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }
  function removeToast(id) { setToasts(t => t.filter(x => x.id !== id)) }

  useEffect(() => { fetch(); fetchUsers(); fetchEvents(); }, [])

  async function fetch() {
    setLoading(true)
    try {
      const res = await listShifts()
      setShifts(res.items || [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  function openCreate() {
    setEditingId(null)
    setForm({ title: '', start_local: '', end_local: '', capacity: 1, location: '', description: '' })
    setParticipants([])
    setModalOpen(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({ title: s.title || '', start_local: isoToLocalDatetime(s.start_time), end_local: isoToLocalDatetime(s.end_time), capacity: s.capacity || 1, location: s.location || '', description: s.description || '' })
    setParticipants([])
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    const payload = {
      title: form.title,
      start_time: localToISOString(form.start_local),
      end_time: localToISOString(form.end_local),
      capacity: form.capacity,
      location: form.location,
      description: form.description
    }
    try {
      if (editingId) {
        await updateShift(editingId, payload, token)
      } else {
        await createShift(payload, token)
      }
      await fetch()
      setModalOpen(false)
    } catch (err) {
      alert('Fehler: ' + (err.response?.data?.error || err.message))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Schicht wirklich löschen?')) return
    try { await deleteShift(id, token); await fetch() } catch (e) { alert('Fehler: ' + (e.response?.data?.error || e.message)) }
  }

  async function showParticipants(id) {
    try {
      const res = await listParticipants(id, token)
      setParticipants(res.participants || [])
    } catch (e) { alert('Fehler: ' + (e.response?.data?.error || e.message)) }
  }

  async function handleRemoveParticipant(shiftId, signup) {
    if (!confirm(`Teilnehmer ${signup.display_name || signup.email} wirklich entfernen?`)) return
    try {
      await removeParticipant(shiftId, signup.signup_id, token)
      addToast('Teilnehmer entfernt', 'success')
      // refresh participant list and shifts
      await showParticipants(shiftId)
      await fetch()
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function fetchUsers() {
    try {
      const res = await listUsers(token)
      setUsers(res.users || [])
    } catch (e) { console.error('fetch users', e); }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    try {
      await createUser(newUser, token)
      setNewUser({ email: '', password: '', display_name: '', role: 'user' })
      await fetchUsers()
      addToast('Benutzer erstellt', 'success')
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function handleDeleteUser(u) {
    if (!confirm(`Benutzer ${u.email} wirklich löschen?`)) return
    try {
      await deleteUser(u.id, token)
      await fetchUsers()
      addToast('Benutzer gelöscht', 'success')
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function toggleAdmin(u) {
    if (!confirm(`${u.display_name || u.email}: admin status umschalten?`)) return
    try {
      const newRole = u.role === 'admin' ? 'user' : 'admin'
      await setUserRole(u.id, newRole, token)
      await fetchUsers()
      addToast('Rolle geändert', 'success')
    } catch (e) {
      addToast('Fehler: ' + (e.response?.data?.error || e.message), 'error')
    }
  }

  async function fetchEvents() {
    try {
      const res = await listEvents(token)
      setEvents(res.events || [])
    } catch (e) { console.error('fetch events', e); }
  }

  async function handleApproveEvent(eventId) {
    try {
      await approveEvent(eventId, adminNotes[eventId] || '', token)
      addToast('Event genehmigt', 'success')
      await fetchEvents()
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function handleRejectEvent(eventId) {
    try {
      await rejectEvent(eventId, adminNotes[eventId] || '', token)
      addToast('Event abgelehnt', 'success')
      await fetchEvents()
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  function openEditEvent(e) {
    setEditingEventId(e.id)
    setEventForm({
      title: e.title || '',
      description: e.description || '',
      members_only: e.members_only || false,
      start_time: isoToLocalDatetime(e.start_time),
      end_time: isoToLocalDatetime(e.end_time)
    })
    setEventModalOpen(true)
  }

  async function handleUpdateEvent(evt) {
    evt.preventDefault()
    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        members_only: eventForm.members_only,
        start_time: localToISOString(eventForm.start_time),
        end_time: localToISOString(eventForm.end_time)
      }
      await updateEvent(editingEventId, payload, token)
      addToast('Event aktualisiert', 'success')
      setEventModalOpen(false)
      await fetchEvents()
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function handleDeleteEvent(eventId, eventTitle) {
    if (!confirm(`Event "${eventTitle}" wirklich löschen?`)) return
    try {
      await deleteEvent(eventId, token)
      addToast('Event gelöscht', 'success')
      await fetchEvents()
    } catch (err) {
      addToast('Fehler: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const pendingEvents = events.filter(e => e.status === 'pending')
  const processedEvents = events.filter(e => e.status !== 'pending')

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Admin-Verwaltung</h2>
      
      <div className="accordion" id="adminAccordion">
        
        {/* Schichten-Verwaltung */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseShifts" aria-expanded="true" aria-controls="collapseShifts">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
              Schichten verwalten
            </button>
          </h2>
          <div id="collapseShifts" className="accordion-collapse collapse show" data-bs-parent="#adminAccordion">
            <div className="accordion-body">
          <div className="mb-3">
            <button className="btn btn-primary" onClick={openCreate}>Neue Schicht erstellen</button>
          </div>

          <h5>Bestehende Schichten</h5>
      {loading && <div>Loading...</div>}
      <div className="list-group mb-3">
        {shifts.map(s => (
          <div key={s.id} className="list-group-item d-flex justify-content-between align-items-start">
            <div className="ms-2 me-auto">
              <div className="fw-bold">{s.title}</div>
              <div className="text-muted small">{new Date(s.start_time).toLocaleString()} — {new Date(s.end_time).toLocaleString()}</div>
              <div className="small">Kapazität: {s.capacity}, Angemeldet: {s.registered_count || 0}</div>
            </div>
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(s)}>Bearbeiten</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}>Löschen</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => showParticipants(s.id)}>Teilnehmer</button>
            </div>
          </div>
        ))}
      </div>

          {participants.length > 0 && (
            <div className="mt-3">
              <h5>Teilnehmer</h5>
              <ul className="list-group">
                {participants.map(p => (
                  <li key={p.signup_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>{p.display_name || p.email} — <span className="text-muted small">{p.status}</span></div>
                    <div>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveParticipant(p.shift_id || /* fallback */ null, p)}>Entfernen</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Event-Genehmigung */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseEvents" aria-expanded="false" aria-controls="collapseEvents">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
              </svg>
              Event-Anträge genehmigen
            </button>
          </h2>
          <div id="collapseEvents" className="accordion-collapse collapse" data-bs-parent="#adminAccordion">
            <div className="accordion-body">
          {pendingEvents.length === 0 && <div className="alert alert-info mb-0">Keine ausstehenden Event-Anträge</div>}
          {pendingEvents.length > 0 && (
            <div className="list-group">
              {pendingEvents.map(e => (
                <div key={e.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-1">{e.title}</h5>
                      <p className="mb-1 text-muted small">{e.description || 'Keine Beschreibung'}</p>
                      <div className="small">
                        <strong>Sichtbarkeit:</strong> {e.members_only ? 'Nur Mitglieder' : 'Öffentlich'} | <strong>Start:</strong> {new Date(e.start_time).toLocaleString()} | <strong>Ende:</strong> {new Date(e.end_time).toLocaleString()}
                      </div>
                      <div className="small text-muted">Eingesendet von: {e.creator_name || e.creator_email}</div>
                    </div>
                    <span className={`badge bg-warning text-dark`}>Ausstehend</span>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Admin-Notizen</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="Optionale Notizen"
                      value={adminNotes[e.id] || ''}
                      onChange={ev => setAdminNotes({ ...adminNotes, [e.id]: ev.target.value })}
                    />
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-success" onClick={() => handleApproveEvent(e.id)}>Genehmigen</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRejectEvent(e.id)}>Ablehnen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Genehmigte & Abgelehnte Events */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProcessed" aria-expanded="false" aria-controls="collapseProcessed">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
              Genehmigte & abgelehnte Events
            </button>
          </h2>
          <div id="collapseProcessed" className="accordion-collapse collapse" data-bs-parent="#adminAccordion">
            <div className="accordion-body">
          {processedEvents.length === 0 && <div className="alert alert-info mb-0">Keine genehmigten oder abgelehnten Events</div>}
          {processedEvents.length > 0 && (
            <div className="list-group">
              {processedEvents.map(e => (
                <div key={e.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <h5 className="mb-1">{e.title}</h5>
                      <p className="mb-1 text-muted small">{e.description || 'Keine Beschreibung'}</p>
                      <div className="small">
                        <strong>Sichtbarkeit:</strong> {e.members_only ? 'Nur Mitglieder' : 'Öffentlich'} | <strong>Start:</strong> {new Date(e.start_time).toLocaleString()} | <strong>Ende:</strong> {new Date(e.end_time).toLocaleString()}
                      </div>
                      <div className="small text-muted">Eingesendet von: {e.creator_name || e.creator_email}</div>
                      {e.admin_notes && <div className="small text-muted mt-1"><strong>Admin-Notiz:</strong> {e.admin_notes}</div>}
                    </div>
                    <div className="d-flex flex-column align-items-end gap-2">
                      <span className={`badge ${e.status === 'approved' ? 'bg-success' : 'bg-secondary'}`}>
                        {e.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                      </span>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEditEvent(e)}>
                        Bearbeiten
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEvent(e.id, e.title)}>
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Benutzer-Verwaltung */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseUsers" aria-expanded="false" aria-controls="collapseUsers">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
              </svg>
              Benutzer verwalten
            </button>
          </h2>
          <div id="collapseUsers" className="accordion-collapse collapse" data-bs-parent="#adminAccordion">
            <div className="accordion-body">

          <form onSubmit={handleCreateUser} className="row g-2 align-items-center mb-3">
            <div className="col-auto">
              <input className="form-control" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
            </div>
            <div className="col-auto">
              <input className="form-control" placeholder="Passwort" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div className="col-auto">
              <input className="form-control" placeholder="Anzeigename" value={newUser.display_name} onChange={e => setNewUser({ ...newUser, display_name: e.target.value })} />
            </div>
            <div className="col-auto">
              <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" type="submit">Erstellen</button>
            </div>
          </form>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
            <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
              <label className="mb-0 text-muted text-nowrap">Filter:</label>
              <input className="form-control form-control-sm flex-grow-1" placeholder="Name, Email oder ID" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <div className="text-muted">{users.length} users</div>
          </div>

          {/* Desktop View */}
          <div className="d-none d-lg-block">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th style={{width: '5%', cursor: 'pointer'}} onClick={() => handleSort('id')}>ID {sortBy==='id' ? (sortDir==='asc' ? '▲' : '▼') : ''}</th>
                  <th style={{width: '25%', cursor: 'pointer'}} onClick={() => handleSort('display_name')}>Name {sortBy==='display_name' ? (sortDir==='asc' ? '▲' : '▼') : ''}</th>
                  <th style={{width: '35%', cursor: 'pointer'}} onClick={() => handleSort('email')}>Email {sortBy==='email' ? (sortDir==='asc' ? '▲' : '▼') : ''}</th>
                  <th style={{width: '10%', cursor: 'pointer'}} onClick={() => handleSort('role')}>Role {sortBy==='role' ? (sortDir==='asc' ? '▲' : '▼') : ''}</th>
                  <th style={{width: '10%', cursor: 'pointer'}} onClick={() => handleSort('is_active')}>Active {sortBy==='is_active' ? (sortDir==='asc' ? '▲' : '▼') : ''}</th>
                  <th style={{width: '15%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.display_name || '-'}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.is_active ? 'yes' : 'no'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => toggleAdmin(u)}>{u.role === 'admin' ? 'Revoke' : 'Make admin'}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Card Layout */}
          <div className="d-lg-none">
            <div className="mb-2 d-flex gap-2 small text-muted overflow-auto pb-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSort('id')}>ID {sortBy==='id' ? (sortDir==='asc' ? '▲' : '▼') : ''}</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSort('display_name')}>Name {sortBy==='display_name' ? (sortDir==='asc' ? '▲' : '▼') : ''}</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSort('email')}>Email {sortBy==='email' ? (sortDir==='asc' ? '▲' : '▼') : ''}</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSort('role')}>Role {sortBy==='role' ? (sortDir==='asc' ? '▲' : '▼') : ''}</button>
            </div>
            {displayedUsers.map(u => (
              <div key={u.id} className="card mb-2">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-secondary">#{u.id}</span>
                        <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-info'}`}>{u.role}</span>
                        <span className={`badge ${u.is_active ? 'bg-success' : 'bg-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <h6 className="mb-1">{u.display_name || '-'}</h6>
                      <p className="mb-0 small text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => toggleAdmin(u)}>
                      {u.role === 'admin' ? 'Revoke' : 'Make admin'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>

      </div>

      {/* Toaster UI */}
        <Toaster toasts={toasts} onRemove={removeToast} />

      <Modal title={editingId ? 'Schicht bearbeiten' : 'Neue Schicht'} show={modalOpen} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="mb-3">
              <label className="form-label">Titel</label>
              <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Start (lokal)</label>
              <input className="form-control" type="datetime-local" value={form.start_local} onChange={e => setForm({ ...form, start_local: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Ende (lokal)</label>
              <input className="form-control" type="datetime-local" value={form.end_local} onChange={e => setForm({ ...form, end_local: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Kapazität</label>
              <input className="form-control" type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Ort</label>
              <input className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Beschreibung</label>
              <input className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="d-flex mt-2">
              <button className="btn btn-primary" type="submit">Speichern</button>
              <button className="btn btn-secondary ms-2" type="button" onClick={() => setModalOpen(false)}>Abbrechen</button>
            </div>
          </form>
        </Modal>

      <Modal title="Event bearbeiten" show={eventModalOpen} onClose={() => setEventModalOpen(false)}>
          <form onSubmit={handleUpdateEvent}>
            <div className="mb-3">
              <label className="form-label">Titel</label>
              <input className="form-control" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Beschreibung</label>
              <textarea className="form-control" rows="3" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
            </div>
            <div className="mb-3 form-check form-switch">
              <input className="form-check-input" type="checkbox" id="eventMembersOnly" checked={eventForm.members_only} onChange={e => setEventForm({ ...eventForm, members_only: e.target.checked })} />
              <label className="form-check-label" htmlFor="eventMembersOnly">Nur für Mitglieder sichtbar</label>
            </div>
            <div className="mb-3">
              <label className="form-label">Start (lokal)</label>
              <input className="form-control" type="datetime-local" value={eventForm.start_time} onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Ende (lokal)</label>
              <input className="form-control" type="datetime-local" value={eventForm.end_time} onChange={e => setEventForm({ ...eventForm, end_time: e.target.value })} required />
            </div>
            <div className="d-flex mt-2">
              <button className="btn btn-primary" type="submit">Speichern</button>
              <button className="btn btn-secondary ms-2" type="button" onClick={() => setEventModalOpen(false)}>Abbrechen</button>
            </div>
          </form>
        </Modal>
    </div>
  )
}
