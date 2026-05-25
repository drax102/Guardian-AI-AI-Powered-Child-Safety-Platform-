import { createContext, useContext, useState, useEffect, useCallback } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { id, name, email }
  const [token, setToken]     = useState(() => localStorage.getItem("guardian_token"))
  const [loading, setLoading] = useState(true)   // true while restoring session

  // ── Restore session on mount ─────────────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return }

    axios
      .get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUser(r.data))
      .catch(() => {
        // Token invalid / expired — clear it
        localStorage.removeItem("guardian_token")
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  // ── Persist token in localStorage ───────────────────────
  function saveToken(t) {
    setToken(t)
    if (t) localStorage.setItem("guardian_token", t)
    else   localStorage.removeItem("guardian_token")
  }

  // ── Sign Up ──────────────────────────────────────────────
  async function signup(name, email, password) {
    const { data } = await axios.post(`${API}/auth/signup`, { name, email, password })
    saveToken(data.token)
    setUser(data.user)
    return data.user
  }

  // ── Login ────────────────────────────────────────────────
  async function login(email, password) {
    const { data } = await axios.post(`${API}/auth/login`, { email, password })
    saveToken(data.token)
    setUser(data.user)
    return data.user
  }

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(() => {
    saveToken(null)
    setUser(null)
  }, [])

  // ── Axios helper with auth header ────────────────────────
  const authAxios = useCallback(
    () => axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } }),
    [token]
  )

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, authAxios }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
