import axios from 'axios'
import { mockApi, useMockApi } from './mockApi'

// Use a relative base by default so the client talks to the same origin the page
// was served from. A VITE_API_URL can override this in dev or special deploys.
const BASE = import.meta.env.VITE_API_URL || ''

export async function login(email, password) {
  if (useMockApi()) return mockApi.login(email, password)
  const res = await axios.post(`${BASE}/api/auth/login`, { email, password })
  return res.data
}

export async function register(email, password, display_name) {
  if (useMockApi()) return mockApi.register(email, password, display_name)
  const res = await axios.post(`${BASE}/api/auth/register`, { email, password, display_name })
  return res.data
}

export async function getMe(token) {
  if (useMockApi()) return mockApi.getMe(token)
  const res = await axios.get(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function listShifts() {
  if (useMockApi()) return mockApi.listShifts()
  const res = await axios.get(`${BASE}/api/shifts`)
  return res.data
}

export async function listUsers(token) {
  if (useMockApi()) return mockApi.listUsers(token)
  const res = await axios.get(`${BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function setUserRole(userId, role, token) {
  if (useMockApi()) return mockApi.setUserRole(userId, role, token)
  const res = await axios.patch(`${BASE}/api/users/${userId}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function createUser(data, token) {
  if (useMockApi()) return mockApi.createUser(data, token)
  const res = await axios.post(`${BASE}/api/users`, data, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function deleteUser(userId, token) {
  if (useMockApi()) return mockApi.deleteUser(userId, token)
  const res = await axios.delete(`${BASE}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function signupShift(shiftId, token) {
  if (useMockApi()) return mockApi.signupShift(shiftId, token)
  const res = await axios.post(`${BASE}/api/shifts/${shiftId}/signups`, {}, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

// Admin APIs
export async function createShift(data, token) {
  if (useMockApi()) return mockApi.createShift(data, token)
  const res = await axios.post(`${BASE}/api/shifts`, data, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function updateShift(shiftId, data, token) {
  if (useMockApi()) return mockApi.updateShift(shiftId, data, token)
  const res = await axios.put(`${BASE}/api/shifts/${shiftId}`, data, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function deleteShift(shiftId, token) {
  if (useMockApi()) return mockApi.deleteShift(shiftId, token)
  const res = await axios.delete(`${BASE}/api/shifts/${shiftId}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function listParticipants(shiftId, token) {
  if (useMockApi()) return mockApi.listParticipants(shiftId, token)
  const res = await axios.get(`${BASE}/api/shifts/${shiftId}/participants`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function removeParticipant(shiftId, signupId, token) {
  if (useMockApi()) return mockApi.removeParticipant(shiftId, signupId, token)
  const res = await axios.delete(`${BASE}/api/shifts/${shiftId}/participants/${signupId}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

// Event APIs
export async function createEvent(data, token) {
  if (useMockApi()) return mockApi.createEvent(data, token)
  const res = await axios.post(`${BASE}/api/events`, data, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function listEvents(token) {
  if (useMockApi()) return mockApi.listEvents(token)
  // Token is optional - public access returns only approved events
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await axios.get(`${BASE}/api/events`, { headers })
  return res.data
}

export async function approveEvent(eventId, admin_notes, token) {
  if (useMockApi()) return mockApi.approveEvent(eventId, admin_notes, token)
  const res = await axios.patch(`${BASE}/api/events/${eventId}/status`, { status: 'approved', admin_notes }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function rejectEvent(eventId, admin_notes, token) {
  if (useMockApi()) return mockApi.rejectEvent(eventId, admin_notes, token)
  const res = await axios.patch(`${BASE}/api/events/${eventId}/status`, { status: 'rejected', admin_notes }, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function updateEvent(eventId, data, token) {
  if (useMockApi()) return mockApi.updateEvent(eventId, data, token)
  const res = await axios.put(`${BASE}/api/events/${eventId}`, data, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export async function deleteEvent(eventId, token) {
  if (useMockApi()) return mockApi.deleteEvent(eventId, token)
  const res = await axios.delete(`${BASE}/api/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}
