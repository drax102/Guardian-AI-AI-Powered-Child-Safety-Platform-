import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import "../styles/Login.css"

/* Google "G" logo SVG — inline so no extra asset needed */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2045c0-.638-.0573-1.2518-.164-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7168v2.258h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6154z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.258c-.8059.5405-1.836.8605-3.0477.8605-2.3436 0-4.3282-1.583-5.036-3.7105H.9574v2.332C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71c-.18-.54-.2827-1.1182-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574A9.0048 9.0048 0 0 0 0 9c0 1.4523.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
    <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5813C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" fill="#EA4335"/>
  </svg>
)

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
    <div className="gai-login-root">
      {/* Animated background orbs */}
      <div className="gai-orb gai-orb-1" />
      <div className="gai-orb gai-orb-2" />
      <div className="gai-orb gai-orb-3" />
      <div className="gai-grid" />

      {/* Glassmorphism card */}
      <div className="gai-card">

        {/* Brand / Logo */}
        <div className="gai-brand">
          <div className="gai-shield-wrap">
            <div className="gai-shield-bg">🛡️</div>
          </div>
          <div className="gai-brand-text">
            <h1>GuardianAI</h1>
            <p>AI-Powered Child Safety Platform</p>
          </div>
        </div>

        {/* Trust badge */}
        <div className="gai-trust">
          <span className="gai-trust-dot" />
          Trusted by 10,000+ families worldwide
        </div>

        {/* Heading */}
        <p className="gai-heading">Welcome back</p>
        <p className="gai-sub">Sign in to monitor and protect your child&apos;s digital world.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="gai-field">
            <label htmlFor="login-email">Email</label>
            <div className="gai-input-wrap">
              <span className="gai-input-icon">✉</span>
              <input
                id="login-email"
                className="gai-input"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={busy}
              />
            </div>
          </div>

          {/* Password */}
          <div className="gai-field">
            <label htmlFor="login-password">Password</label>
            <div className="gai-input-wrap">
              <span className="gai-input-icon">🔒</span>
              <input
                id="login-password"
                className="gai-input"
                name="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="gai-error">
              ⚠ {error}
            </div>
          )}

          {/* Sign In */}
          <button
            id="btn-login"
            className="gai-btn-primary"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <><span className="gai-spinner" />Signing in…</>
            ) : (
              "Sign In →"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="gai-divider">or continue with</div>

        {/* Google */}
        <button
          id="btn-google"
          className="gai-btn-google"
          type="button"
          disabled={busy}
          onClick={() => {/* Google OAuth handler can be wired here */}}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Create account */}
        <p className="gai-footer">
          Don&apos;t have an account?{" "}
          <Link to="/signup">Create account</Link>
        </p>

      </div>
    </div>
  )
}
