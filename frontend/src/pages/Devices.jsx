import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function Devices() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [deviceList, setDeviceList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [deviceName, setDeviceName] = useState("")
    const [deviceType, setDeviceType] = useState("Smartphone")

    useEffect(() => {
        const token = localStorage.getItem("guardian_token")
        if (!token) {
            navigate("/login", { replace: true })
            return
        }

        axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setUser(res.data)
        }).catch(() => {
            localStorage.removeItem("guardian_token")
            navigate("/login", { replace: true })
        })

        const storedDevices = localStorage.getItem("guardian_devices")
        if (storedDevices) {
            setDeviceList(JSON.parse(storedDevices))
        } else {
            // Default mock devices
            const defaultDevices = [
                { name: "iPhone 15 Pro", type: "Smartphone" },
                { name: "iPad Air", type: "Tablet" }
            ]
            setDeviceList(defaultDevices)
            localStorage.setItem("guardian_devices", JSON.stringify(defaultDevices))
        }
    }, [])

    const handleAddDevice = (e) => {
        e.preventDefault()
        if (!deviceName) return

        const newDevice = {
            name: deviceName,
            type: deviceType
        }

        const updated = [...deviceList, newDevice]
        setDeviceList(updated)
        localStorage.setItem("guardian_devices", JSON.stringify(updated))

        setDeviceName("")
        setIsModalOpen(false)
    }

    const handleSignOut = () => {
        localStorage.removeItem("guardian_token")
        navigate("/login", { replace: true })
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
                            background: "rgba(56, 189, 248, 0.08)", color: "#38BDF8", fontWeight: "600", cursor: "pointer"
                        }}>
                            <span>📱</span> Connected Devices
                        </div>
                        <div onClick={() => navigate("/risk")} style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px",
                            color: "#94A3B8", fontWeight: "500", cursor: "pointer", transition: "background 0.2s"
                        }} className="sidebar-hover-item">
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
                    display: "flex", alignItems: "center", justifyBetween: "space-between", padding: "0 40px", boxSizing: "border-box"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#94A3B8" }}>Synced Devices:</span>
                        <span style={{ background: "rgba(129, 140, 248, 0.1)", color: "#818CF8", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "600" }}>
                            {deviceList.length} Connected
                        </span>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: "#1E3A8A", border: "1px solid #38BDF8", color: "#FFF",
                            padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer"
                        }}
                    >
                        📱 Link Device
                    </button>
                </header>

                <main style={{ padding: "40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px" }}>
                    
                    <div style={{
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
                        border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: "24px", padding: "36px 40px"
                    }}>
                        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#FFF" }}>
                            Connected & Monitored Devices
                        </h1>
                        <p style={{ margin: "10px 0 0 0", fontSize: "15px", color: "#94A3B8", lineHeight: "1.6" }}>
                            Actively syncing child web activity, application installs, and message alerts from local device integrations.
                        </p>
                    </div>

                    {/* Devices Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                        {deviceList.map((dev, i) => (
                            <div key={i} style={{
                                background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "20px", padding: "24px", display: "flex", alignItems: "center", gap: "16px"
                            }}>
                                <span style={{ fontSize: "36px" }}>
                                    {dev.type === "Tablet" ? "💻" : dev.type === "Desktop" ? "🖥️" : "📱"}
                                </span>
                                <div style={{ flexGrow: 1 }}>
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#FFF", fontWeight: "600" }}>
                                        {dev.name}
                                    </h3>
                                    <span style={{ fontSize: "12px", color: "#818CF8", fontWeight: "500" }}>
                                        Type: {dev.type}
                                    </span>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                                        <span style={{ width: "6px", height: "6px", background: "#10B981", borderRadius: "50%" }}></span>
                                        <span style={{ fontSize: "11px", color: "#10B981", fontWeight: "600" }}>Active & Syncing</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Link Device Modal */}
            {isModalOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(8, 17, 32, 0.8)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <form onSubmit={handleAddDevice} style={{
                        background: "#0F172A", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "24px",
                        width: "100%", maxWidth: "400px", padding: "32px", boxSizing: "border-box"
                    }}>
                        <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#FFF" }}>
                            📱 Link New Device
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                            <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Device Name</label>
                            <input 
                                type="text"
                                required
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px", padding: "10px 14px", color: "#FFF", outline: "none"
                                }}
                                placeholder="e.g. Alex's iPhone"
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
                            <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Device Type</label>
                            <select 
                                value={deviceType}
                                onChange={(e) => setDeviceType(e.target.value)}
                                style={{
                                    background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px", padding: "10px 14px", color: "#FFF", outline: "none"
                                }}
                            >
                                <option value="Smartphone">Smartphone</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Desktop">Desktop / Laptop</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{
                                flex: 1, background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#94A3B8", padding: "10px", borderRadius: "10px", cursor: "pointer"
                            }}>
                                Cancel
                            </button>
                            <button type="submit" style={{
                                flex: 1, background: "#1E3A8A", border: "1px solid #38BDF8",
                                color: "#FFF", padding: "10px", borderRadius: "10px", cursor: "pointer"
                            }}>
                                Link Device
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style>{`
                .sidebar-hover-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: #FFF !important;
                }
            `}</style>
        </div>
    )
}
