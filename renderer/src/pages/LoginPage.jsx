import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BookOpen, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password view state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotError, setForgotError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError(t('auth.enterEmailPassword', null, 'Email va parol kiriting'))
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

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError(t('auth.enterEmail', null, 'Email manzilini kiriting.'))
      return
    }
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)
    try {
      if (window.api && window.api.resetPasswordEmail) {
        const res = await window.api.resetPasswordEmail(forgotEmail.trim(), window.location.origin)
        setForgotSuccess(res.message || t('auth.resetLinkSent', null, 'Parolni tiklash havolasi yuborildi.'))
      }
    } catch (err) {
      setForgotError(err.message || t('auth.errorOccurred', null, 'Xatolik yuz berdi.'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIconWrap}>
            <BookOpen size={18} color="#a78bfa" />
          </div>
          <span className="font-logo" style={styles.logoText}>notelab</span>
        </div>

        {!showForgot ? (
          <>
            <h2 style={styles.title}>{t('auth.loginTitle')}</h2>
            <p style={styles.subtitle}>{t('auth.loginSubtitle')}</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>{t('auth.email')}</label>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>{t('auth.password')}</label>
                  <span
                    onClick={() => {
                      setForgotEmail(email)
                      setShowForgot(true)
                    }}
                    style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {t('auth.forgotPassword')}
                  </span>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...styles.input, width: '100%', paddingRight: 40 }}
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

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? '...' : t('auth.loginButton')}
              </button>
            </form>

            <p style={styles.switchText}>
              {t('auth.noAccount')}{' '}
              <span style={styles.switchLink} onClick={onSwitch}>
                {t('auth.registerLink')}
              </span>
            </p>
          </>
        ) : (
          <>
            <div
              onClick={() => {
                setShowForgot(false)
                setForgotSuccess('')
                setForgotError('')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <ArrowLeft size={14} /> {t('auth.backToLogin', null, 'Ortga qaytish')}
            </div>

            <h2 style={styles.title}>{t('auth.forgotTitle', null, 'Parolni tiklash')}</h2>
            <p style={styles.subtitle}>{t('auth.forgotSubtitle', null, 'Email manzilingizga parolni tiklash havolasini yuboramiz')}</p>

            {forgotSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 16, color: '#10b981', fontSize: 13, lineHeight: 1.45 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <CheckCircle2 size={18} /> {t('auth.sent', null, 'Yuborildi!')}
                </div>
                <div>{forgotSuccess}</div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('auth.email')}</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="email@example.com"
                    style={styles.input}
                    autoFocus
                    disabled={forgotLoading}
                  />
                </div>

                {forgotError && <div style={styles.error}>{forgotError}</div>}

                <button type="submit" style={{ ...styles.btn, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>
                  {forgotLoading ? '...' : t('auth.sendResetLink', null, 'Tiklash havolasini yuborish')}
                </button>
              </form>
            )}
          </>
        )}
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
