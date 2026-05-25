import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function Risk() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem("guardian_token")
        if (!token) {
            navigate("/login", { replace: true })
            return
        }

        // Fetch user info
        axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setUser(res.data)
        }).catch(() => {
            localStorage.removeItem("guardian_token")
            navigate("/login", { replace: true })
        })

        // Fetch active alerts
        axios.get(`${API}/alerts`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setAlerts(Array.isArray(res.data) ? res.data : [])
        }).catch(err => {
            console.log(err)
            setAlerts([])
        }).finally(() => {
            setLoading(false)
        })
    }, [])

    const handleSignOut = () => {
        localStorage.removeItem("guardian_token")
        navigate("/login", { replace: true })
    }

    if (loading) {
        return (
            <div style={{
                background: "#081120", minHeight: "100vh", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#38BDF8"
            }}>
                Loading Risk Profiles...
            </div>
        )
    }

    return (
        <div style={{
            background: "#081120",
            minHeight: "100vh",
            color: "#F1F5F9",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex"
        }}>
            {/* LEFT SIDEBAR */}
            <aside style={{
                width: "280px",
                background: "#0F172A",
                borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "32px 24px",
                flexShrink: 0,
                boxSizing: "border-box"
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
                        <span style={{ fontSize: "28px" }}>🛡️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFF" }}>
                                Guardian<span style={{ color: "#38BDF8" }}>AI</span>
                            </h2>
                            <span style={{ fontSize: "10px", color: "#38BDF8", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                                PARENT CONTROL
                            </span>
                        </div>
                    </div>

                    <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div onClick={() => navigate("/dashboard")} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px",
                            color: "#94A3B8", fontWeight: "500", cursor: "pointer", transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>📊</span> Dashboard
                        </div>
                        <div onClick={() => navigate("/children")} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px",
                            color: "#94A3B8", fontWeight: "500", cursor: "pointer", transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>👨‍👧‍👦</span> Children Info
                        </div>
                        <div onClick={() => navigate("/devices")} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px",
                            color: "#94A3B8", fontWeight: "500", cursor: "pointer", transition: "background 0.2s"
                        }} className="sidebar-hover-item">
                            <span>📱</span> Connected Devices
                        </div>
                        <div onClick={() => navigate("/risk")} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px",
                            background: "rgba(56, 189, 248, 0.08)", color: "#38BDF8", fontWeight: "600", cursor: "pointer"
                        }}>
                            <span>🛡️</span> Risk Assessments
                        </div>
                    </nav>
                </div>

                {user && (
                    <div style={{
                        background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "16px", padding: "16px", marginTop: "20px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <div style={{
                                width: "40px", height: "40px", borderRadius: "10px",
                                background: "linear-gradient(135deg, #1E3A8A, #38BDF8)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold"
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
                        <button onClick={handleSignOut} style={{
                            width: "100%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: "8px", padding: "8px", color: "#EF4444", fontSize: "12px", fontWeight: "600", cursor: "pointer"
                        }}>
                            Sign Out
                        </button>
                    </div>
                )}
            </aside>

            {/* MAIN CONTENT AREA */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
                <header style={{
                    height: "72px", background: "#0F172A", borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex", alignItems: "center", padding: "0 40px", boxSizing: "border-box"
                }}>
                    <span style={{ fontSize: "18px", fontWeight: "700" }}>🛡️ Threat Matrix & Family Health Report</span>
                </header>

                <main style={{ padding: "40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px" }}>
                    
                    <div style={{
                        background: "linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
                        border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "24px", padding: "36px 40px"
                    }}>
                        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#FFF" }}>
                            Safety Assessment & Risks
                        </h1>
                        <p style={{ margin: "10px 0 0 0", fontSize: "15px", color: "#94A3B8", lineHeight: "1.6" }}>
                            Real-time safety telemetry gathered from child browsers, chat feeds, and uploaded media evidence logs.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }} className="risk-grid">
                        
                        {/* LEFT COLUMN: Safety Score and Stats */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            
                            {/* Score Card */}
                            <div style={{
                                background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "20px", padding: "32px", textAlign: "center"
                            }}>
                                <div style={{
                                    width: "120px", height: "120px", borderRadius: "50%",
                                    background: "rgba(16, 185, 129, 0.08)", border: "4px solid #10B981",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "36px", fontWeight: "bold", color: "#10B981", margin: "0 auto 20px auto"
                                }}>
                                    98%
                                </div>
                                <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", color: "#FFF" }}>Excellent Score</h3>
                                <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8", lineHeight: "1.5" }}>
                                    Your family safety level remains highly protected. Zero severe cybersecurity vulnerabilities detected today.
                                </p>
                            </div>

                            {/* Active Alerts List */}
                            <div style={{
                                background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "20px", padding: "24px"
                            }}>
                                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#FFF" }}>
                                    Active Alerts Log ({alerts.length})
                                </h3>
                                {alerts.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: "14px", color: "#94A3B8" }}>
                                        🛡️ No active threat reports registered.
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {alerts.map((a, i) => (
                                            <div key={i} style={{
                                                background: "rgba(255,255,255,0.02)", borderLeft: `4px solid ${a.severity === "high" ? "#EF4444" : "#F59E0B"}`,
                                                padding: "12px 16px", borderRadius: "8px"
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#FFF" }}>
                                                        {a.type.replaceAll("_", " ").toUpperCase()}
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: a.severity === "high" ? "#EF4444" : "#F59E0B", fontWeight: "bold" }}>
                                                        {a.severity.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: "12px", color: "#CBD5E1" }}>
                                                    {a.message}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT COLUMN: AI Safety Recommendations */}
                        <div style={{
                            background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "20px", padding: "32px"
                        }}>
                            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#FFF" }}>
                                Smart Recommendations
                            </h3>

                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "16px" }}>
                                    <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Security Tip</span>
                                    <h4 style={{ margin: "4px 0 6px 0", fontSize: "14px", color: "#FFF" }}>Limit Anonymous Messaging Apps</h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                        Unknown messaging platforms bypass normal filters. Restrict app install privileges in iOS Screen Time.
                                    </p>
                                </div>
                                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "16px" }}>
                                    <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Privacy Setting</span>
                                    <h4 style={{ margin: "4px 0 6px 0", fontSize: "14px", color: "#FFF" }}>Enable SafeSearch Defaults</h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                        Lock SafeSearch filter on all Google accounts. This will actively screen explicit search result previews.
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "700", textTransform: "uppercase" }}>Cyber Hygiene</span>
                                    <h4 style={{ margin: "4px 0 6px 0", fontSize: "14px", color: "#FFF" }}>Review Cloud Storage Link Sharing</h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
                                        Ensure public folder access is turned off on family Google Drive sharing systems.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            <style>{`
                .sidebar-hover-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: #FFF !important;
                }
                @media (max-width: 900px) {
                    .risk-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    )
}
