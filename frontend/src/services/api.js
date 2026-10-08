import axios from "axios"

// Single source of truth for the API base URL
const rawBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "")
export const API_BASE_URL = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`
export const API = API_BASE_URL

// Token helpers
export const ACCESS_TOKEN_KEY = "guardian_access_token"
export const REFRESH_TOKEN_KEY = "guardian_refresh_token"
export const LEGACY_TOKEN_KEY = "guardian_token"

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || null
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken) // Keep legacy key in sync
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

// Configured Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// Attach Bearer Access Token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Automatic refresh mutex / queue management
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor: handle 401 and transparent token rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Do not attempt token refresh on auth endpoints (login, signup, refresh itself)
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/signup") ||
      originalRequest.url?.includes("/auth/refresh")

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue pending requests while refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        isRefreshing = false
        clearTokens()
        window.dispatchEvent(new CustomEvent("guardian:session-expired"))
        return Promise.reject(error)
      }

      try {
        // Use clean unintercepted axios call to refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data?.data || {}

        if (!newAccessToken) {
          throw new Error("Invalid token refresh payload received")
        }

        setTokens(newAccessToken, newRefreshToken)
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        processQueue(null, newAccessToken)
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearTokens()
        window.dispatchEvent(new CustomEvent("guardian:session-expired"))
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export function getErrorMessage(error) {
  if (!error) return "An unexpected error occurred"
  if (typeof error === "string") return error
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.data?.detail) return error.response.data.detail
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    return error.response.data.errors.map((e) => e.message).join(", ")
  }
  if (error.message) return error.message
  return "An unexpected error occurred"
}

export default api
