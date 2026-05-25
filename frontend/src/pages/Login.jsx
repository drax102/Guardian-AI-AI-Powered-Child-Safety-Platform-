import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]   = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy]   = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError("Email and password are required.")
      return
    }

    setBusy(true)
    try {
      await login(form.email, form.password)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.")
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
            <p className="auth-sub">Sign in to your parent account</p>
          </div>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
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
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={busy}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button id="btn-login" className="auth-btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}
