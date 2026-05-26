import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("guardian_token"))
  const [loading, setLoading] = useState(true)

  // Save Token
  const saveToken = useCallback((t) => {
    setToken(t)
    if (t) {
      localStorage.setItem("guardian_token", t)
    } else {
      localStorage.removeItem("guardian_token")
    }
  }, [])

  // Session restore flow with safety checks
  useEffect(() => {
    let mounted = true

    async function restore() {
      const storedToken = localStorage.getItem("guardian_token")
      if (!storedToken) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
          timeout: 5000
        })

        if (mounted) {
          setUser(res.data)
        }
      } catch (err) {
        console.error("Auth restore failed:", err)
        localStorage.removeItem("guardian_token")
        if (mounted) {
          setUser(null)
          setToken(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restore()

    return () => {
      mounted = false
    }
  }, [])

  // Signup
  async function signup(name, email, password) {
    const { data } = await axios.post(`${API}/auth/signup`, {
      name,
      email,
      password
    })
    saveToken(data.token)
    setUser(data.user)
    return data.user
  }

  // Login
  async function login(email, password) {
    const { data } = await axios.post(`${API}/auth/login`, {
      email,
      password
    })
    saveToken(data.token)
    setUser(data.user)
    return data.user
  }

  // Logout
  const logout = useCallback(() => {
    saveToken(null)
    setUser(null)
    window.location.href = "/login"
  }, [saveToken])

  // Auth Axios helper
  const authAxios = useCallback(() => {
    return axios.create({
      baseURL: API,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }, [token])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        login,
        logout,
        authAxios
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return ctx
}