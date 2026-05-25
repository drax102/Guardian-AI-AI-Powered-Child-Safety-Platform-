import React, { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [toastMessage, setToastMessage] = useState("")

    if (!isOpen) return null

    const handleFileChange = (e) => {
        const selected = e.target.files[0]
        if (selected) {
            setFile(selected)
            setPreview(URL.createObjectURL(selected))
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setToastMessage("")

        const formData = new FormData()
        formData.append("file", file)

        try {
            const token = localStorage.getItem("guardian_token")
            await axios.post(`${API}/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`
                }
            })

            setToastMessage("🎉 Evidence uploaded successfully!")
            setFile(null)
            setPreview(null)

            setTimeout(() => {
                setToastMessage("")
                onUploadSuccess()
                onClose()
            }, 1500)
        } catch (err) {
            console.error("Upload error:", err)
            setToastMessage("❌ Failed to upload evidence. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 17, 32, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
            boxSizing: "border-box"
        }}>
            <div style={{
                background: "#0F172A",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "480px",
                padding: "32px",
                boxSizing: "border-box",
                position: "relative",
                color: "#F1F5F9",
                fontFamily: "system-ui, -apple-system, sans-serif"
            }}>
                {/* Close Button */}
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
                        cursor: "pointer"
                    }}
                >
                    &times;
                </button>

                <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "700" }}>
                    📤 Upload Evidence File
                </h3>
                <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#94A3B8", lineHeight: "1.5" }}>
                    Provide local media files or threat screenshots. GuardianAI will automatically sync them for active child risk analysis.
                </p>

                {/* Custom File Selector */}
                <div style={{
                    border: "2px dashed rgba(56, 189, 248, 0.25)",
                    borderRadius: "16px",
                    padding: "32px 20px",
                    textAlign: "center",
                    background: "rgba(56, 189, 248, 0.02)",
                    marginBottom: "24px",
                    cursor: "pointer",
                    position: "relative"
                }}>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0,
                            cursor: "pointer"
                        }}
                    />
                    {preview ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <img 
                                src={preview} 
                                alt="Selected preview" 
                                style={{ width: "100%", maxHeight: "150px", objectFit: "contain", borderRadius: "10px" }} 
                            />
                            <span style={{ fontSize: "12px", color: "#38BDF8" }}>
                                {file.name}
                            </span>
                        </div>
                    ) : (
                        <div>
                            <span style={{ fontSize: "40px", display: "block", marginBottom: "10px" }}>📸</span>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#FFF", display: "block" }}>
                                Select screenshot or image
                            </span>
                            <span style={{ fontSize: "12px", color: "#94A3B8", display: "block", marginTop: "4px" }}>
                                Drag and drop files here to upload
                            </span>
                        </div>
                    )}
                </div>

                {toastMessage && (
                    <div style={{
                        background: toastMessage.startsWith("❌") ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                        border: toastMessage.startsWith("❌") ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                        color: toastMessage.startsWith("❌") ? "#EF4444" : "#10B981",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        marginBottom: "20px",
                        textAlign: "center"
                    }}>
                        {toastMessage}
                    </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            background: "transparent",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#94A3B8",
                            padding: "12px",
                            borderRadius: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        style={{
                            flex: 1,
                            background: !file || uploading ? "rgba(30, 58, 138, 0.5)" : "#1E3A8A",
                            border: "1px solid #38BDF8",
                            color: "#FFF",
                            padding: "12px",
                            borderRadius: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: !file || uploading ? "not-allowed" : "pointer"
                        }}
                    >
                        {uploading ? "Uploading..." : "Confirm Upload"}
                    </button>
                </div>
            </div>
        </div>
    )
}
