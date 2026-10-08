import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import api, {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getErrorMessage,
} from "../services/api"
import { connectSocket, disconnectSocket } from "../services/socket"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(getAccessToken())
  const [loading, setLoading] = useState(true)

  // Centralized session teardown
  const handleSessionTeardown = useCallback(() => {
    disconnectSocket()
    clearTokens()
    setUser(null)
    setToken(null)
  }, [])

  // Synchronize Socket.IO client with authenticated user session
  useEffect(() => {
    if (token && user) {
      connectSocket(token)
    } else {
      disconnectSocket()
    }
  }, [token, user])

  // Session restore flow on application mount
  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const storedRefreshToken = getRefreshToken()
      const storedAccessToken = getAccessToken()

      if (!storedRefreshToken && !storedAccessToken) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        // If refresh token exists, attempt refresh first to verify validity & get fresh access token
        if (storedRefreshToken) {
          try {
            const refreshRes = await api.post("/auth/refresh", {
              refreshToken: storedRefreshToken,
            })
            const { accessToken: newAccess, refreshToken: newRefresh } =
              refreshRes.data?.data || {}
            if (newAccess) {
              setTokens(newAccess, newRefresh)
              if (mounted) setToken(newAccess)
            }
          } catch (refreshErr) {
            console.warn("Initial refresh attempt failed, trying existing access token...", refreshErr)
          }
        }

        // Fetch current authenticated user profile
        const meRes = await api.get("/auth/me")
        const userData = meRes.data?.data?.user || meRes.data?.user || null

        if (mounted && userData) {
          setUser(userData)
          setToken(getAccessToken())
        } else if (mounted) {
          handleSessionTeardown()
        }
      } catch (err) {
        console.error("Session restore failed:", getErrorMessage(err))
        if (mounted) {
          handleSessionTeardown()
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    // Listen for session expiry triggered by API response interceptor
    const onSessionExpired = () => {
      handleSessionTeardown()
    }
    window.addEventListener("guardian:session-expired", onSessionExpired)

    return () => {
      mounted = false
      window.removeEventListener("guardian:session-expired", onSessionExpired)
    }
  }, [handleSessionTeardown])

  // Signup
  const signup = useCallback(async (name, email, password) => {
    const res = await api.post("/auth/signup", {
      name,
      email,
      password,
    })

    const data = res.data?.data
    if (!data || !data.accessToken || !data.user) {
      throw new Error("Invalid signup response from server")
    }

    setTokens(data.accessToken, data.refreshToken)
    setToken(data.accessToken)
    setUser(data.user)
    setLoading(false)
    return data.user
  }, [])

  // Login
  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", {
      email,
      password,
    })

    const data = res.data?.data
    if (!data || !data.accessToken || !data.user) {
      throw new Error("Invalid login response from server")
    }

    setTokens(data.accessToken, data.refreshToken)
    setToken(data.accessToken)
    setUser(data.user)
    setLoading(false)
    return data.user
  }, [])

  // Logout
  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken })
      } catch (err) {
        console.warn("Server logout notification failed:", err)
      }
    }
    handleSessionTeardown()
    window.location.href = "/login"
  }, [handleSessionTeardown])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        login,
        logout,
        setUser,
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