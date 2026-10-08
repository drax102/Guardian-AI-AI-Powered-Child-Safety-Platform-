import { useState } from "react"
import api, { getErrorMessage } from "../services/api"

const ALERT_TYPES = [
  { value: "CYBERBULLYING", label: "Cyberbullying" },
  { value: "EXPLICIT_CONTENT", label: "Explicit Content" },
  { value: "STRANGER_DANGER", label: "Stranger Danger" },
  { value: "SUSPICIOUS_MESSAGING", label: "Suspicious Messaging" },
  { value: "ONLINE_PREDATION", label: "Online Predation" },
  { value: "SCREEN_TIME_VIOLATION", label: "Screen Time Violation" },
  { value: "UNAUTHORIZED_APP", label: "Unauthorized App" },
]

const SEVERITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
]

export default function CreateAlertModal({
  isOpen,
  onClose,
  onAlertCreated,
  childrenList = [],
  deviceList = [],
}) {
  const [type, setType] = useState("ONLINE_PREDATION")
  const [severity, setSeverity] = useState("HIGH")
  const [message, setMessage] = useState("")
  const [childId, setChildId] = useState("")
  const [deviceId, setDeviceId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      setErrorMessage("Please enter an incident alert description.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const payload = {
        type,
        severity,
        message: message.trim(),
        ...(childId ? { childId } : {}),
        ...(deviceId ? { deviceId } : {}),
      }

      const res = await api.post("/alerts", payload)
      const createdAlert = res.data?.data?.alert

      if (onAlertCreated && createdAlert) {
        onAlertCreated(createdAlert)
      }
      onClose()
    } catch (err) {
      console.error("Alert creation error:", err)
      setErrorMessage(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 17, 32, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#0F172A",
          border: "1px solid rgba(56, 189, 248, 0.15)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "500px",
          padding: "32px",
          boxSizing: "border-box",
          position: "relative",
          color: "#F1F5F9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "transparent",
            border: "none",
            color: "#94A3B8",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          &times;
        </button>

        <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "700" }}>
          🚨 Create Incident Alert
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#94A3B8", lineHeight: "1.5" }}>
          Simulate or record an active digital safety incident. The AI Risk Engine will immediately evaluate deterministic threat signals.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94A3B8", marginBottom: "6px" }}>
              Threat Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: "100%",
                background: "#1E293B",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#FFF",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              {ALERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94A3B8", marginBottom: "6px" }}>
              Severity Level
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                width: "100%",
                background: "#1E293B",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#FFF",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94A3B8", marginBottom: "6px" }}>
              Incident Description
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Unidentified user attempting to solicit location coordinates via messaging platform"
              rows={3}
              style={{
                width: "100%",
                background: "#1E293B",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#FFF",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {childrenList.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94A3B8", marginBottom: "6px" }}>
                Associated Child (Optional)
              </label>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1E293B",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#FFF",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                <option value="">None / General</option>
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.age} yrs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {deviceList.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94A3B8", marginBottom: "6px" }}>
                Associated Device (Optional)
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1E293B",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#FFF",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                <option value="">None / General</option>
                {deviceList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#EF4444",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              ⚠ {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94A3B8",
                padding: "12px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              style={{
                flex: 1,
                background: submitting || !message.trim() ? "rgba(30, 58, 138, 0.5)" : "#1E3A8A",
                border: "1px solid #38BDF8",
                color: "#FFF",
                padding: "12px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: submitting || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Analyzing & Creating..." : "Create Alert →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
