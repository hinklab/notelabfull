import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function RegisterPage({ onSwitch, onBack }) {
  const { register } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    const updateTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
      setCurrentTheme(t)
    }
    window.addEventListener('storage', updateTheme)
    window.addEventListener('notelab_theme_changed', updateTheme)
    const observer = new MutationObserver(() => updateTheme())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('storage', updateTheme)
      window.removeEventListener('notelab_theme_changed', updateTheme)
      observer.disconnect()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError(t('auth.fillAllFields', null, 'Barcha maydonlarni to\'ldiring'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordMinLength', null, 'Parol kamida 6 ta belgi bo\'lishi kerak'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDoNotMatch', null, 'Parollar mos kelmadi'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(email.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={styles.page}>
      <div className="auth-card" style={styles.card}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12.5,
              cursor: 'pointer',
              marginBottom: 12,
              alignSelf: 'flex-start',
              padding: 0,
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={14} />
            <span>{t('common.back', null, 'Bosh sahifa')}</span>
          </button>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img
            src={currentTheme === 'light' ? '/saqlab-logo-b.png' : '/saqlab-logo-w.png'}
            alt="saqlab"
            style={{ height: 24, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <h2 className="auth-title" style={styles.title}>{t('auth.registerTitle', null, 'Ro\'yxatdan o\'tish')}</h2>
        <p className="auth-subtitle" style={styles.subtitle}>{t('auth.registerSubtitle', null, 'Yangi hisob yaratish')}</p>

        <form onSubmit={handleSubmit} className="auth-form" style={styles.form}>
          <div className="auth-field" style={styles.field}>
            <label className="auth-label" style={styles.label}>{t('auth.email', null, 'Email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="auth-input" style={styles.input}
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="auth-field" style={styles.field}>
            <label className="auth-label" style={styles.label}>{t('auth.password', null, 'Parol')}</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input" style={{ ...styles.input, width: "100%", paddingRight: 40 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-field" style={styles.field}>
            <label className="auth-label" style={styles.label}>{t('auth.confirmPassword', null, 'Parolni tasdiqlang')}</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="auth-input" style={{ ...styles.input, width: "100%", paddingRight: 40 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(prev => !prev)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? '...' : t('auth.registerButton', null, 'Ro\'yxatdan o\'tish')}
          </button>
        </form>

        <p className="auth-switch" style={styles.switchText}>
          {t('auth.hasAccount', null, 'Hisobingiz bormi?')}{' '}
          <span style={styles.switchLink} onClick={onSwitch}>
            {t('auth.loginLink', null, 'Kirish')}
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
  logoIconWrap: {
    width: 36, height: 36,
    background: 'rgba(124,58,237,0.15)',
    border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
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
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
