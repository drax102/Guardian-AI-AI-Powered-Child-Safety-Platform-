import { io } from "socket.io-client"
import { API_BASE_URL, getAccessToken } from "./api"

let socketInstance = null
let currentSocketToken = null

export function getSocketServerUrl() {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL
  if (explicitSocketUrl && typeof explicitSocketUrl === "string" && explicitSocketUrl.trim()) {
    return explicitSocketUrl.trim().replace(/\/+$/, "")
  }

  try {
    const url = new URL(API_BASE_URL, window.location.origin)
    return url.origin
  } catch {
    return "http://localhost:5000"
  }
}

export function connectSocket(token) {
  const authToken = token || getAccessToken()

  if (!authToken) {
    disconnectSocket()
    return null
  }

  // Reuse existing socket if connected with identical token
  if (socketInstance && currentSocketToken === authToken && socketInstance.connected) {
    return socketInstance
  }

  // Clean up any stale connection
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  const serverUrl = getSocketServerUrl()
  currentSocketToken = authToken

  socketInstance = io(serverUrl, {
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socketInstance.on("connect", () => {
    // Connected to private room
  })

  socketInstance.on("connect_error", (err) => {
    console.warn("[SOCKET ERROR]", err.message)
  })

  socketInstance.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      // Reconnection forced by server rejection
      socketInstance.connect()
    }
  })

  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
  currentSocketToken = null
}

export function getSocket() {
  return socketInstance
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
}
