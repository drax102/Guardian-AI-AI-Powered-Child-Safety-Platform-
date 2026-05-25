import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function Children() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [childrenList, setChildrenList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [name, setName] = useState("")
    const [age, setAge] = useState("")
    const [photo, setPhoto] = useState("")

    useEffect(() => {
        // Fetch current user and children stored locally
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

        const storedChildren = localStorage.getItem("guardian_children")
        if (storedChildren) {
            setChildrenList(JSON.parse(storedChildren))
        } else {
            // Default mock child
            const defaultChild = [{ name: "Alex", age: "12", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2" }]
            setChildrenList(defaultChild)
            localStorage.setItem("guardian_children", JSON.stringify(defaultChild))
        }
    }, [])

    const handleAddChild = (e) => {
        e.preventDefault()
        if (!name || !age) return

        const newChild = {
            name,
            age,
            photo: photo || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d"
        }

        const updated = [...childrenList, newChild]
        setChildrenList(updated)
        localStorage.setItem("guardian_children", JSON.stringify(updated))

        setName("")
        setAge("")
        setPhoto("")
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
                            background: "rgba(56, 189, 248, 0.08)", color: "#38BDF8", fontWeight: "600", cursor: "pointer"
                        }}>
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
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", boxSizing: "border-box"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#94A3B8" }}>Children Monitored:</span>
                        <span style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38BDF8", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "600" }}>
                            {childrenList.length} Active Profiles
                        </span>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: "#1E3A8A", border: "1px solid #38BDF8", color: "#FFF",
                            padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer"
                        }}
                    >
                        ➕ Add Child Profile
                    </button>
                </header>

                <main style={{ padding: "40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px" }}>
                    
                    {/* Welcome Hero style bar */}
                    <div style={{
                        background: "linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
                        border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "24px", padding: "36px 40px"
                    }}>
                        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#FFF" }}>
                            Monitored Children Profiles
                        </h1>
                        <p style={{ margin: "10px 0 0 0", fontSize: "15px", color: "#94A3B8", lineHeight: "1.6" }}>
                            Manage children settings, age profiles, and verified avatars to enhance smart content filtering algorithms.
                        </p>
                    </div>

                    {/* Children Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                        {childrenList.map((child, i) => (
                            <div key={i} style={{
                                background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "20px", padding: "24px", textAlign: "center"
                            }}>
                                <img 
                                    src={child.photo} 
                                    alt={child.name}
                                    style={{
                                        width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover",
                                        border: "3px solid #38BDF8", margin: "0 auto 16px auto", display: "block"
                                    }}
                                />
                                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#FFF", fontWeight: "700" }}>
                                    {child.name}
                                </h3>
                                <span style={{
                                    background: "rgba(56, 189, 248, 0.08)", color: "#38BDF8",
                                    padding: "4px 12px", borderRadius: "100px", fontSize: "12px", fontWeight: "600"
                                }}>
                                    Age: {child.age} Years
                                </span>
                                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", marginTop: "20px", paddingTop: "16px", display: "flex", justifyContent: "space-around" }}>
                                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>🛡️ Status: Protected</span>
                                    <span style={{ fontSize: "12px", color: "#10B981" }}>🟢 Online</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Modal to Add Child */}
            {isModalOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(8, 17, 32, 0.8)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <form onSubmit={handleAddChild} style={{
                        background: "#0F172A", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "24px",
                        width: "100%", maxWidth: "400px", padding: "32px", boxSizing: "border-box"
                    }}>
                        <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#FFF" }}>
                            👨‍👧‍👦 Add Child Profile
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                            <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Name</label>
                            <input 
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px", padding: "10px 14px", color: "#FFF", outline: "none"
                                }}
                                placeholder="Child's name"
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                            <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Age</label>
                            <input 
                                type="number"
                                required
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px", padding: "10px 14px", color: "#FFF", outline: "none"
                                }}
                                placeholder="e.g. 12"
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
                            <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Avatar / Photo URL (Optional)</label>
                            <input 
                                type="url"
                                value={photo}
                                onChange={(e) => setPhoto(e.target.value)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)",
                                    borderRadius: "10px", padding: "10px 14px", color: "#FFF", outline: "none"
                                }}
                                placeholder="https://..."
                            />
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
                                Add Profile
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
