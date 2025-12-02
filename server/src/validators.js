function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function validateShiftPayload(payload) {
  const errors = []
  if (!payload || typeof payload !== 'object') {
    errors.push('payload required')
    return { ok: false, errors }
  }

  const title = (payload.title || '').toString().trim()
  if (!title) errors.push('title required')

  const startRaw = payload.start_time || payload.start_local || payload.start
  const endRaw = payload.end_time || payload.end_local || payload.end
  const start = parseDate(startRaw)
  const end = parseDate(endRaw)
  if (!start) errors.push('start_time is invalid or missing')
  if (!end) errors.push('end_time is invalid or missing')
  if (start && end && start.getTime() >= end.getTime()) errors.push('end_time must be after start_time')

  const capacity = Number(payload.capacity || 0)
  if (!Number.isInteger(capacity) || capacity < 1) errors.push('capacity must be integer >= 1')

  if (errors.length) return { ok: false, errors }

  // cleaned payload
  return {
    ok: true,
    data: {
      title,
      description: payload.description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: payload.location || null,
      capacity
    }
  }
}

module.exports = { validateShiftPayload }
