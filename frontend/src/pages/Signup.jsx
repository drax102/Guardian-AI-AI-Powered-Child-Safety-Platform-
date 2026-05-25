import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Signup() {
  const { signup } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]   = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy]   = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setBusy(true)
    try {
      await signup(form.name, form.email, form.password)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || "Sign up failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />

      <div className="auth-card">
        {/* Header */}
        <div className="auth-logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <h1 className="auth-title">GuardianAI</h1>
            <p className="auth-sub">Create your parent account</p>
          </div>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="Sarah Johnson"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              disabled={busy}
            />
          </div>

          <div className="field-group">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={busy}
            />
          </div>

          <div className="field-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button id="btn-signup" className="auth-btn" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
