import React, { useEffect, useState } from 'react'
import { listShifts, listEvents } from './api'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0,0,0,0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatDay(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Kiosk() {
  const [shifts, setShifts] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 60_000); return () => clearInterval(id) }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [shiftsRes, eventsRes] = await Promise.all([
        listShifts(),
        listEvents() // No token needed - public API returns approved events
      ])
      setShifts(shiftsRes.items || [])
      setEvents(eventsRes.events || [])
    } catch (e) {
      console.error('Failed to load data', e)
    } finally {
      setLoading(false)
    }
  }

  const today = startOfDay(new Date())
  // build calendar matrix for next 4 weeks starting from start of week (Monday)
  const start = new Date(today)
  // normalize to monday
  const day = start.getDay() // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7 // days since Monday
  start.setDate(start.getDate() - diff)

  const weeks = Array.from({ length: 4 }).map((_, wi) => {
    return Array.from({ length: 7 }).map((__, di) => addDays(start, wi * 7 + di))
  })

  // group shifts and events by date string
  const map = {}
  for (const s of shifts) {
    const d = startOfDay(s.start_time).toISOString()
    if (!map[d]) map[d] = []
    map[d].push({ ...s, type: 'shift' })
  }
  for (const e of events) {
    const d = startOfDay(e.start_time).toISOString()
    if (!map[d]) map[d] = []
    map[d].push({ ...e, type: 'event' })
  }

  // helper: determine day background color based on shifts (events don't affect color)
  function getDayColor(dayItems) {
    if (dayItems.length === 0) return 'bg-light' // keine Einträge
    const dayShifts = dayItems.filter(i => i.type === 'shift')
    if (dayShifts.length === 0) return 'bg-info text-white' // nur Events → blau
    const hasAvailable = dayShifts.some(s => (s.registered_count || 0) < s.capacity)
    const allFull = dayShifts.every(s => (s.registered_count || 0) >= s.capacity)
    if (allFull) return 'bg-success text-white' // alle voll → grün
    if (hasAvailable) return 'bg-danger text-white' // mindestens eine hat freie Plätze → rot
    return 'bg-light' // fallback
  }

  return (
    <div>
      <h2 className="mb-3">Kiosk-Ansicht — nächste 4 Wochen</h2>
      {loading && <div>Lädt…</div>}
      <div className="container-fluid">
        {weeks.map((week, wi) => (
          <div className="row g-3 mb-3" key={wi}>
            {week.map((d) => {
              const key = startOfDay(d).toISOString()
              const dayShifts = map[key] || []
              const bgColor = getDayColor(dayShifts)
              return (
                <div className="col-12 col-sm-6 col-md-3" key={key}>
                  <div className={`card h-100 ${bgColor}`}>
                    <div className="card-body">
                      <h6 className="card-title">{formatDay(d)}</h6>
                      <div>
                        {dayShifts.length === 0 ? <div className="text-muted">—</div> : (
                          <ul className="list-group list-group-flush">
                            {dayShifts.map(item => {
                              if (item.type === 'event') {
                                return (
                                  <li className="list-group-item d-flex justify-content-between align-items-center" key={`event-${item.id}`}>
                                    <div>
                                      <div className="fw-semibold">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-1" viewBox="0 0 16 16" style={{display: 'inline-block', verticalAlign: 'text-bottom'}}>
                                          <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                        </svg>
                                        {item.title}
                                      </div>
                                      <div className="small text-muted">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <span className={`badge ${item.members_only ? 'bg-warning text-dark' : 'bg-info'}`}>
                                      {item.members_only ? (
                                        <>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-1" viewBox="0 0 16 16" style={{display: 'inline-block', verticalAlign: 'text-bottom'}}>
                                            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                                            <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                                            <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                                          </svg>
                                          Mitglieder
                                        </>
                                      ) : 'Offen'}
                                    </span>
                                  </li>
                                )
                              } else {
                                const registered = item.registered_count || 0
                                const capacity = item.capacity || 0
                                const isFull = registered >= capacity
                                return (
                                  <li className="list-group-item d-flex justify-content-between align-items-center" key={`shift-${item.id}`}>
                                    <div>
                                      <div className="fw-semibold">{item.title}</div>
                                      <div className="small text-muted">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <span className={`badge ${isFull ? 'bg-success' : 'bg-danger'}`}>
                                      {registered}/{capacity}
                                    </span>
                                  </li>
                                )
                              }
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
