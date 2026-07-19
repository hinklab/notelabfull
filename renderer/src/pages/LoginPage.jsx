import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email va parol kiriting')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📓</span>
          <span style={styles.logoText}>notelab</span>
        </div>

        <h2 style={styles.title}>Kirish</h2>
        <p style={styles.subtitle}>Hisobingizga kiring</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              style={styles.input}
              autoFocus
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Parol</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <p style={styles.switchText}>
          Hisobingiz yo'qmi?{' '}
          <span style={styles.switchLink} onClick={onSwitch}>
            Ro'yxatdan o'tish
          </span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: { fontSize: 28 },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'Space Grotesk, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#ef4444',
    fontSize: 13,
  },
  btn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    marginTop: 4,
    transition: 'background 0.15s',
  },
  switchText: {
    marginTop: 20,
    fontSize: 13,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  switchLink: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
