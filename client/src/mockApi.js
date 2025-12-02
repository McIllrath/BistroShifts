// Mock API für Frontend-Entwicklung ohne Backend
// Simuliert alle API-Endpunkte mit Testdaten

const MOCK_ENABLED = import.meta.env.VITE_MOCK_API === 'true'

// Mock-Daten
const mockUsers = [
  { id: 1, email: 'admin@test.com', display_name: 'Mock Admin', role: 'admin', is_active: true },
  { id: 2, email: 'user@test.com', display_name: 'Mock User', role: 'user', is_active: true },
  { id: 3, email: 'inactive@test.com', display_name: 'Inactive User', role: 'user', is_active: false }
]

const mockShifts = [
  {
    id: 1,
    title: 'Morgenschicht',
    start_time: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
    capacity: 3,
    registered_count: 2,
    location: 'Küche',
    description: 'Frühstücksvorbereitung'
  },
  {
    id: 2,
    title: 'Mittagsschicht',
    start_time: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 48 * 3600 * 1000 + 6 * 3600 * 1000).toISOString(),
    capacity: 5,
    registered_count: 5,
    location: 'Restaurant',
    description: 'Mittagsservice (VOLL)'
  },
  {
    id: 3,
    title: 'Abendschicht',
    start_time: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 72 * 3600 * 1000 + 5 * 3600 * 1000).toISOString(),
    capacity: 4,
    registered_count: 0,
    location: 'Bar',
    description: 'Abendservice'
  }
]

const mockParticipants = [
  { signup_id: 1, shift_id: 1, user_id: 2, email: 'user@test.com', display_name: 'Mock User', status: 'confirmed' },
  { signup_id: 2, shift_id: 1, user_id: 3, email: 'inactive@test.com', display_name: 'Inactive User', status: 'confirmed' }
]

const mockEvents = [
  {
    id: 1,
    title: 'Sommerfest',
    description: 'Großes Sommerfest mit Grillstation',
    members_only: false,
    start_time: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 8 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  },
  {
    id: 2,
    title: 'Weihnachtsmarkt',
    description: 'Weihnachtsmarkt mit Glühweinstand und Kunsthandwerk',
    members_only: false,
    start_time: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 12 * 24 * 3600 * 1000 + 10 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  },
  {
    id: 3,
    title: 'Jazz Brunch',
    description: 'Entspannter Brunch mit Live-Jazz',
    members_only: false,
    start_time: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 10 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  },
  {
    id: 4,
    title: 'Weinprobe',
    description: 'Exklusive Weinprobe mit lokalem Winzer',
    members_only: true,
    start_time: new Date(Date.now() + 14 * 24 * 3600 * 1000 + 18 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 14 * 24 * 3600 * 1000 + 21 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  },
  {
    id: 5,
    title: 'Kochworkshop',
    description: 'Italienische Küche für Anfänger',
    members_only: true,
    start_time: new Date(Date.now() + 20 * 24 * 3600 * 1000 + 15 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 20 * 24 * 3600 * 1000 + 19 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  },
  {
    id: 6,
    title: 'Firmenfeier Anfrage',
    description: 'Firmenfeier mit ca. 50 Personen',
    members_only: false,
    start_time: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 25 * 24 * 3600 * 1000 + 6 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'pending',
    is_active: 1
  },
  {
    id: 7,
    title: 'Live-Musik Abend',
    description: 'Akustik-Abend mit lokaler Band',
    members_only: false,
    start_time: new Date(Date.now() + 21 * 24 * 3600 * 1000 + 19 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 21 * 24 * 3600 * 1000 + 23 * 3600 * 1000).toISOString(),
    created_by: 2,
    creator_name: 'Mock User',
    creator_email: 'user@test.com',
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    is_active: 1
  }
]

// Simuliert API-Delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi = {
  // Auth
  login: async (email, password) => {
    await delay()
    if (password === 'wrong') throw new Error('Invalid credentials')
    // Gibt passenden Mock-User basierend auf Email zurück
    const user = mockUsers.find(u => u.email === email) || mockUsers[1] // fallback auf standard user
    // Speichere Email für getMe
    localStorage.setItem('mock_user_email', user.email)
    return { token: 'mock-token-12345', user }
  },

  register: async (email, password, name) => {
    await delay()
    return { user: { id: 99, email, display_name: name, role: 'user', is_active: true } }
  },

  getMe: async (token) => {
    await delay()
    // Extrahiere User aus dem Token (in Realität würde man den Token parsen)
    // Im Mock geben wir den User zurück, der beim letzten Login verwendet wurde
    const email = localStorage.getItem('mock_user_email') || 'admin@test.com'
    const user = mockUsers.find(u => u.email === email) || mockUsers[0]
    return { user }
  },

  // Shifts
  listShifts: async () => {
    await delay()
    return { items: mockShifts }
  },

  signupShift: async (id, token) => {
    await delay()
    return { ok: true, message: 'Erfolgreich angemeldet' }
  },

  createShift: async (payload, token) => {
    await delay()
    return { shift: { id: 99, ...payload } }
  },

  updateShift: async (id, payload, token) => {
    await delay()
    return { shift: { id, ...payload } }
  },

  deleteShift: async (id, token) => {
    await delay()
    return { ok: true }
  },

  listParticipants: async (shiftId, token) => {
    await delay()
    return { participants: mockParticipants.filter(p => p.shift_id === shiftId) }
  },

  removeParticipant: async (shiftId, signupId, token) => {
    await delay()
    return { ok: true }
  },

  // Users
  listUsers: async (token) => {
    await delay()
    return { users: mockUsers }
  },

  createUser: async (userData, token) => {
    await delay()
    return { user: { id: 100, ...userData, is_active: true } }
  },

  setUserRole: async (userId, role, token) => {
    await delay()
    return { ok: true }
  },

  deleteUser: async (userId, token) => {
    await delay()
    return { ok: true }
  },

  // Events
  createEvent: async (eventData, token) => {
    await delay()
    return { event: { id: 99, ...eventData, status: 'pending' } }
  },

  listEvents: async (token) => {
    await delay()
    return { events: mockEvents }
  },

  approveEvent: async (eventId, admin_notes, token) => {
    await delay()
    return { ok: true, status: 'approved' }
  },

  rejectEvent: async (eventId, admin_notes, token) => {
    await delay()
    return { ok: true, status: 'rejected' }
  },

  updateEvent: async (eventId, eventData, token) => {
    await delay()
    return { ok: true, event: { id: eventId, ...eventData } }
  },

  deleteEvent: async (eventId, token) => {
    await delay()
    return { ok: true }
  }
}

export function useMockApi() {
  return MOCK_ENABLED
}