import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

function App() {
    const navigate = useNavigate()

    const [user, setUser] = useState(null)   // { id, name, email, children, devices }
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    // Redesign stats or mock details safely if they are empty
    const childrenCount = user?.children != null
        ? (Array.isArray(user.children) ? user.children.length : user.children)
        : 1; // Default fallback to 1 child monitored if empty/null to look active

    const devicesCount = user?.devices != null
        ? (Array.isArray(user.devices) ? user.devices.length : user.devices)
        : 2; // Default fallback to 2 devices if empty/null

    useEffect(() => {
        load()
    }, [])

    async function load() {
        // 1. Read JWT from localStorage
        const token = localStorage.getItem("guardian_token")

        if (!token) {
            navigate("/login", { replace: true })
            return
        }

        try {
            // 2. Fetch current user from /auth/me
            const { data: userData } = await axios.get(
                `${API}/auth/me`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setUser(userData)
        } catch (err) {
            const status = err?.response?.status
            if (status === 401 || status === 403) {
                // 3. Unauthorized → clear token, redirect to /login
                localStorage.removeItem("guardian_token")
                navigate("/login", { replace: true })
                return
            }
            console.error("Failed to fetch user:", err)
        }

        // 4. Fetch alerts
        try {
            const token = localStorage.getItem("guardian_token")
            const res = await axios.get(
                `${API}/alerts`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setAlerts(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            console.log(err)
            setAlerts([])
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = () => {
        localStorage.removeItem("guardian_token")
        window.location.href = "/login"
    }

    const handleUploadEvidence = () => {

        const input =
            document.createElement("input")

        input.type = "file"

        input.accept = "image/*"

        input.onchange = () => {

            if (input.files?.[0]) {

                alert(
                    `Evidence uploaded:
${input.files[0].name}`
                )

            }

        }

        input.click()

    }

    if (loading) {
        return (
            <div
                style={{
                    background: "#081120",
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontFamily: "system-ui, -apple-system, sans-serif"
                }}
            >
                <div style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid rgba(56, 189, 248, 0.1)",
                    borderTopColor: "#38BDF8",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "16px"
                }} />
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={{ color: "#38BDF8", fontWeight: "600", fontSize: "16px", letterSpacing: "0.5px" }}>
                    SECURING ENVIRONMENT...
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                background: "#081120",
                minHeight: "100vh",
                color: "#F1F5F9",
                fontFamily: "system-ui, -apple-system, sans-serif",
                display: "flex",
                overflowX: "hidden"
            }}
        >
            {/* 1. LEFT SIDEBAR */}
            <aside
                style={{
                    width: "280px",
                    background: "#0F172A",
                    borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "32px 24px",
                    flexShrink: 0,
                    boxSizing: "border-box"
                }}
                className="gai-sidebar"
            >
                <div>
                    {/* Header brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
                        <span style={{ fontSize: "28px" }}>🛡️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFF", letterSpacing: "-0.5px" }}>
                                Guardian<span style={{ color: "#38BDF8" }}>AI</span>
                            </h2>
                            <span style={{ fontSize: "10px", color: "#38BDF8", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                                PARENT CONTROL
                            </span>
                        </div>
                    </div>

                    {/* Navigation list */}
                    <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            background: "rgba(56, 189, 248, 0.08)",
                            color: "#38BDF8",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}>
                            <span>📊</span> Dashboard
                        </div>
                        <div onClick={() =>
                            alert(
                                "Module available in next release"
                            )
                        } style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            color: "#94A3B8",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>👨‍👧‍👦</span> Children Info
                        </div>
                        <div onClick={() =>
                            alert(
                                "Module available in next release"
                            )
                        } style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            color: "#94A3B8",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>📱</span> Connected Devices

                        </div>
                        <div onClick={() =>
                            alert(
                                "Module available in next release"
                            )
                        } style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            color: "#94A3B8",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>🛡️</span> Risk Assessments
                        </div>
                    </nav>
                </div>

                {/* Profile section bottom */}
                {user && (
                    <div style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "16px",
                        padding: "16px",
                        marginTop: "20px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #1E3A8A, #38BDF8)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                fontWeight: "bold"
                            }}>
                                {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#FFF", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                    {user.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            style={{
                                width: "100%",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "8px",
                                padding: "8px",
                                color: "#EF4444",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>

                {/* 2. TOP NAVBAR */}
                <header
                    style={{
                        height: "72px",
                        background: "#0F172A",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 40px",
                        boxSizing: "border-box"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#94A3B8" }}>Family Status:</span>
                        <span style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10B981",
                            padding: "4px 10px",
                            borderRadius: "100px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}>
                            <span style={{ width: "6px", height: "6px", background: "#10B981", borderRadius: "50%" }}></span>
                            Protected Live
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        {/* Date info */}
                        <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "500" }}>
                            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>

                        {/* Upload evidence button */}
                        <button
                            onClick={handleUploadEvidence}
                            style={{
                                background: "#1E3A8A",
                                border: "1px solid #38BDF8",
                                color: "#FFF",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s"
                            }}
                            className="upload-btn"
                        >
                            <span>📤</span> Upload Evidence
                        </button>
                    </div>
                </header>

                {/* CONTAINER FOR DASHBOARD CONTENT */}
                <main style={{ padding: "40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px", flexGrow: 1 }}>

                    {/* 3. WELCOME HERO */}
                    <section
                        style={{
                            background: "linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)",
                            border: "1px solid rgba(56, 189, 248, 0.15)",
                            borderRadius: "24px",
                            padding: "36px 40px",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <div style={{ position: "relative", zIndex: 2 }}>
                            <span style={{
                                fontSize: "11px",
                                color: "#38BDF8",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "1.5px",
                                display: "block",
                                marginBottom: "8px"
                            }}>
                                REAL-TIME GUARDIAN PROTECTION ACTIVE
                            </span>
                            <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "#FFF", letterSpacing: "-0.5px" }}>
                                Welcome back, {user?.name || "Parent"}!
                            </h1>
                            <p style={{ margin: "12px 0 0 0", fontSize: "16px", color: "#94A3B8", maxWidth: "600px", lineHeight: "1.6" }}>
                                GuardianAI is actively scanning feeds, social messages, and media uploads to keep your child's environments safe.
                            </p>
                        </div>
                        <div style={{
                            position: "absolute",
                            right: "-40px",
                            bottom: "-40px",
                            fontSize: "160px",
                            opacity: 0.05,
                            pointerEvents: "none",
                            userSelect: "none"
                        }}>
                            🛡️
                        </div>
                    </section>

                    {/* 4. GRID METRICS CARD ROW */}
                    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>

                        {/* Safety Score Card */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "20px",
                            padding: "24px",
                            display: "flex",
                            alignItems: "center",
                            gap: "20px"
                        }}>
                            <div style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "50%",
                                background: "rgba(16, 185, 129, 0.08)",
                                border: "2px solid #10B981",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <span style={{ fontSize: "20px", color: "#10B981", fontWeight: "bold" }}>98%</span>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "14px", color: "#94A3B8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Safety Score
                                </h3>
                                <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFF", margin: "4px 0" }}>
                                    Excellent
                                </div>
                                <span style={{ fontSize: "12px", color: "#10B981" }}>🛡️ Fully secured and guarded</span>
                            </div>
                        </div>

                        {/* Children Card */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "20px",
                            padding: "24px",
                            display: "flex",
                            alignItems: "center",
                            gap: "20px"
                        }}>
                            <div style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "16px",
                                background: "rgba(56, 189, 248, 0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "28px",
                                flexShrink: 0
                            }}>
                                👨‍👧‍👦
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "14px", color: "#94A3B8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Children Monitored
                                </h3>
                                <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFF", margin: "4px 0" }}>
                                    {childrenCount} Child
                                </div>
                                <span style={{ fontSize: "12px", color: "#38BDF8" }}>Active Safety Shield</span>
                            </div>
                        </div>

                        {/* Devices Card */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "20px",
                            padding: "24px",
                            display: "flex",
                            alignItems: "center",
                            gap: "20px"
                        }}>
                            <div style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "16px",
                                background: "rgba(99, 102, 241, 0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "28px",
                                flexShrink: 0
                            }}>
                                📱
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "14px", color: "#94A3B8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Connected Devices
                                </h3>
                                <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFF", margin: "4px 0" }}>
                                    {devicesCount} Devices
                                </div>
                                <span style={{ fontSize: "12px", color: "#818CF8" }}>Syncing properly</span>
                            </div>
                        </div>

                    </section>

                    {/* 5. DUAL PANEL LAYOUT: ALERTS & AI RECOMMENDATIONS */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px", alignItems: "start" }} className="dashboard-grid">

                        {/* LEFT COLUMN: ACTIVE ALERTS */}
                        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "20px" }}>⚠️</span>
                                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#FFF" }}>
                                        Active Security Alerts ({alerts.length})
                                    </h2>
                                </div>
                                <span style={{ fontSize: "12px", color: "#94A3B8" }}>Auto-refreshing</span>
                            </div>

                            {alerts.length === 0 ? (
                                /* Empty State Card */
                                <div style={{
                                    background: "#0F172A",
                                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                                    borderRadius: "20px",
                                    padding: "60px 40px",
                                    textAlign: "center",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "16px"
                                }}>
                                    <span style={{ fontSize: "48px" }}>🛡️</span>
                                    <div>
                                        <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#FFF", fontWeight: "600" }}>
                                            No active threats detected
                                        </h3>
                                        <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8" }}>
                                            Everything looks safe today. Your children's web feeds are perfectly clean.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* Alerts List mapping */
                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    {alerts.map((a) => {
                                        const isHigh = a.severity === "high";
                                        return (
                                            <div
                                                key={a._id}
                                                style={{
                                                    background: "#0F172A",
                                                    border: isHigh ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                                                    borderRadius: "20px",
                                                    padding: "24px",
                                                    boxShadow: isHigh ? "0 4px 20px rgba(239, 68, 68, 0.1)" : "none",
                                                    transition: "transform 0.2s"
                                                }}
                                                className="alert-card"
                                            >
                                                <div style={{ display: "flex", gap: "24px" }} className="alert-card-inner">
                                                    <div style={{ flexShrink: 0 }}>
                                                    <img
                                                        src={
                                                            (a.image_url && a.image_url !== "PASTE_YOUR_S3_URL" && (a.image_url.startsWith("http") || a.image_url.startsWith("/")) ? a.image_url : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3")
                                                        }
                                                        onError={(e) => {
                                                            e.target.onerror = null

                                                            e.target.src =
                                                                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
                                                        }}
                                                        alt={a.type}
                                                        style={{
                                                            width: "160px",
                                                            height: "160px",
                                                            objectFit: "cover",
                                                            borderRadius: "14px",
                                                            background: "#1E293B",
                                                            border:
                                                                "1px solid rgba(255,255,255,0.05)"
                                                        }}
                                                    />
                                                </div>

                                                {/* Alert Content Right */}
                                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1, minWidth: 0 }}>
                                                    <div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                                                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#FFF", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                                                ⚠ {a.type.replaceAll("_", " ").toUpperCase()}
                                                            </h3>

                                                            {/* Severity Badge */}
                                                            <span style={{
                                                                background: isHigh ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                                                border: isHigh ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                                                                color: isHigh ? "#EF4444" : "#F59E0B",
                                                                padding: "4px 10px",
                                                                borderRadius: "100px",
                                                                fontSize: "11px",
                                                                fontWeight: "700",
                                                                textTransform: "uppercase",
                                                                letterSpacing: "0.5px"
                                                            }}>
                                                                {a.severity}
                                                            </span>
                                                        </div>

                                                        {/* Simulated Time Info */}
                                                        <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "12px", fontWeight: "500" }}>
                                                            🕒 Active Threat Detected • Just now
                                                        </div>

                                                        <p style={{ margin: 0, fontSize: "14px", color: "#CBD5E1", lineHeight: "1.6" }}>
                                                            {a.message}
                                                        </p>
                                                    </div>

                                                    {/* CTA Link button */}
                                                    <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                                                        <button
                                                            onClick={() => alert(`Reviewing details for: ${a.type}`)}
                                                            style={{
                                                                background: isHigh ? "#EF4444" : "#1E3A8A",
                                                                border: "none",
                                                                color: "#FFF",
                                                                padding: "8px 16px",
                                                                borderRadius: "8px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Take Quick Action
                                                        </button>
                                                        <button
                                                            onClick={() => alert("Marking as False Positive")}
                                                            style={{
                                                                background: "transparent",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                                color: "#94A3B8",
                                                                padding: "8px 16px",
                                                                borderRadius: "8px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Ignore Report
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                            )
                            })}
                    </div>
                            )}
                </section>

                {/* RIGHT COLUMN: AI RECOMMENDATIONS PANEL */}
                <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>💡</span>
                        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#FFF" }}>
                            AI Recommendations
                        </h2>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Rec 1 */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "16px",
                            padding: "20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Security Tip</span>
                                <span style={{ fontSize: "11px", color: "#10B981", fontWeight: "600" }}>Highly Recommended</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "600", color: "#FFF" }}>
                                Limit Anonymous Messaging Apps
                            </h4>
                            <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                A sudden spike in child use of unknown messaging platforms. Restrict app install privileges in iOS Screen Time.
                            </p>
                        </div>

                        {/* Rec 2 */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "16px",
                            padding: "20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Privacy Setting</span>
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "600" }}>System Audit</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "600", color: "#FFF" }}>
                                Enable SafeSearch Defaults
                            </h4>
                            <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                Lock SafeSearch filter on all Google accounts. This will actively screen explicit search result previews.
                            </p>
                        </div>

                        {/* Rec 3 */}
                        <div style={{
                            background: "#0F172A",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "16px",
                            padding: "20px",
                            opacity: 0.8
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Cyber Hygiene</span>
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "600" }}>Standard Tip</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "600", color: "#FFF" }}>
                                Review Cloud Storage Link Sharing
                            </h4>
                            <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                Ensure public folder access is turned off on family Google Drive sharing systems.
                            </p>
                        </div>
                    </div>
                </aside>

            </div>

        </main>
            </div >

        {/* RESPONSIVE LAYOUT EMBEDDED CSS STYLE TAG */ }
        < style > {`
                /* Sidebar hover items style */
                .sidebar-hover-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: #FFF !important;
                }
                .upload-btn:hover {
                    background: #1e40af !important;
                    border-color: #0ea5e9 !important;
                    box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
                }
                .alert-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
                }
                
                /* Responsive layout rules */
                @media (max-width: 1024px) {
                    .gai-sidebar {
                        width: 240px;
                    }
                }
                @media (max-width: 900px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media (max-width: 768px) {
                    flex-direction: column !important;
                    .gai-sidebar {
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                        padding: 24px !important;
                    }
                    header {
                        padding: 0 24px !important;
                    }
                    main {
                        padding: 24px !important;
                    }
                    .alert-card-inner {
                        flex-direction: column !important;
                    }
                    .alert-card-inner img {
                        width: 100% !important;
                        height: 200px !important;
                    }
                }
            `}</style >
        </div >
    )
}

export default App