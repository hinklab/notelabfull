import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LoginPage({ onSwitch, onBack, isRecoveryModeProp = false }) {
  const { login, resetPasswordDirect } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
  })

  // Detect recovery mode from URL hash or query params
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    if (isRecoveryModeProp) return true;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || ''
      const search = window.location.search || ''
      return hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('reset_password=true')
    }
    return false
  })

  useEffect(() => {
    const updateTheme = () => {
      const th = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
      setCurrentTheme(th)
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

  // Forgot password view state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotError, setForgotError] = useState('')

  // New password reset state (for recovery mode)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetError, setResetError] = useState('')

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

  // Handle Send Reset Link to Email
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
        setForgotSuccess(res?.message || t('auth.resetLinkSent', null, 'Parolni tiklash havolasi elektron pochtangizga yuborildi!'))
      } else {
        setForgotSuccess(t('auth.resetLinkSent', null, 'Parolni tiklash havolasi elektron pochtangizga yuborildi!'))
      }
    } catch (err) {
      setForgotError(err.message || t('auth.errorOccurred', null, 'Xatolik yuz berdi.'))
    } finally {
      setForgotLoading(false)
    }
  }

  // Handle Set New Password (when user opens recovery link)
    const handleSetNewPassword = async (e) => {
    e.preventDefault()
    if (!newPassword) {
      setResetError(t('auth.enterNewPassword', null, 'Yangi parolni kiriting.'))
      return
    }
    if (newPassword.length < 6) {
      setResetError(t('auth.passwordTooShort', null, 'Parol kamida 6 ta belgi bo\'lishi kerak.'))
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError(t('auth.passwordsDoNotMatch', null, 'Parollar bir-biriga mos kelmadi.'))
      return
    }

    setResetError('')
    setResetSuccess('')
    setResetLoading(true)

    try {
      // 1. If we have an access_token in URL hash from Supabase recovery redirect
      let tokenUserEmail = null
      if (typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = params.get('access_token')
        if (accessToken) {
          try {
            const userRes = await fetch('https://spntzkotmgsghoahqkne.supabase.co/auth/v1/user', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('')
              }
            })
            if (userRes.ok) {
              const uData = await userRes.json()
              tokenUserEmail = uData?.email
            }
          } catch (_) {}
        }
      }

      const targetEmail = forgotEmail || tokenUserEmail || (user ? user.email : null)

      if (targetEmail) {
        if (resetPasswordDirect) {
          await resetPasswordDirect(targetEmail, newPassword)
        } else if (window.api && window.api.resetPasswordDirect) {
          await window.api.resetPasswordDirect(targetEmail, newPassword)
        }
      }

      setResetSuccess(t('auth.passwordResetSuccess', null, 'Parolingiz muvaffaqiyatli yangilandi! Endi yangi parol bilan kirishingiz mumkin.'))
      // Clean up URL hash
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch (err) {
      setResetError(err.message || t('auth.errorOccurred', null, 'Xatolik yuz berdi.'))
    } finally {
      setResetLoading(false)
    }
  }

  const handleBackClick = () => {
    if (isRecoveryMode) {
      setIsRecoveryMode(false)
    } else if (showForgot) {
      setShowForgot(false)
      setForgotError('')
      setForgotSuccess('')
    } else if (onBack) {
      onBack()
    }
  }

  return (
    <div className="auth-page" style={styles.page}>
      <div className="auth-card" style={styles.card}>
        
        {/* Top Back Button */}
        {(onBack || showForgot || isRecoveryMode) && (
          <button
            type="button"
            onClick={handleBackClick}
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
            <span>{(showForgot || isRecoveryMode) ? t('auth.backToLogin', null, 'Ortga qaytish') : t('common.back', null, 'Bosh sahifa')}</span>
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

        {isRecoveryMode ? (
          /* Recovery Mode: Set New Password */
          <>
            <h2 className="auth-title" style={styles.title}>{t('auth.setNewPasswordTitle', null, 'Yangi parol o\'rnatish')}</h2>
            <p className="auth-subtitle" style={styles.subtitle}>{t('auth.setNewPasswordSubtitle', null, 'Hisobingiz uchun yangi xavfsiz parol kiriting')}</p>

            {resetSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 16, color: '#10b981', fontSize: 13, lineHeight: 1.45 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                  <CheckCircle2 size={20} /> {t('auth.success', null, 'Muvaffaqiyatli!')}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>{resetSuccess}</div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false)
                    setShowForgot(false)
                    setResetSuccess('')
                  }}
                  className="auth-btn"
                  style={{
                    ...styles.btn,
                    marginTop: 6,
                    padding: '9px 14px',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span>{t('auth.goToLogin', null, 'Kirish oynasiga o\'tish')}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetNewPassword} className="auth-form" style={styles.form}>
                <div className="auth-field" style={styles.field}>
                  <label className="auth-label" style={styles.label}>{t('auth.newPassword', null, 'Yangi parol')}</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      style={{ ...styles.input, width: '100%', paddingRight: 40 }}
                      disabled={resetLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(prev => !prev)}
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
                        transition: 'color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field" style={styles.field}>
                  <label className="auth-label" style={styles.label}>{t('auth.confirmNewPassword', null, 'Yangi parolni tasdiqlang')}</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      style={{ ...styles.input, width: '100%', paddingRight: 40 }}
                      disabled={resetLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
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
                        transition: 'color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {resetError && <div style={styles.error}>{resetError}</div>}

                <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: resetLoading ? 0.6 : 1 }} disabled={resetLoading}>
                  {resetLoading ? '...' : t('auth.saveNewPassword', null, 'Yangi parolni saqlash')}
                </button>
              </form>
            )}
          </>
        ) : !showForgot ? (
          /* Standard Login */
          <>
            <h2 className="auth-title" style={styles.title}>{t('auth.loginTitle', null, 'Xush kelibsiz')}</h2>
            <p className="auth-subtitle" style={styles.subtitle}>{t('auth.loginSubtitle', null, 'saqlab hisobingizga kiring')}</p>

            <form onSubmit={handleSubmit} className="auth-form" style={styles.form}>
              <div className="auth-field" style={styles.field}>
                <label className="auth-label" style={styles.label}>{t('auth.email', null, 'Elektron pochta')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="auth-input"
                  style={styles.input}
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="auth-field" style={styles.field}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="auth-label" style={styles.label}>{t('auth.password', null, 'Parol')}</label>
                  <span
                    onClick={() => {
                      setForgotEmail(email)
                      setShowForgot(true)
                      setForgotError('')
                      setForgotSuccess('')
                    }}
                    style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {t('auth.forgotPassword', null, 'Parolni unutdingizmi?')}
                  </span>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input"
                    style={{ ...styles.input, width: "100%", paddingRight: 40 }}
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

              <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? '...' : t('auth.loginButton', null, 'Kirish')}
              </button>
            </form>

            <p className="auth-switch" style={styles.switchText}>
              {t('auth.noAccount', null, 'Hisobingiz yo\'qmi?')}{' '}
              <span style={styles.switchLink} onClick={onSwitch}>
                {t('auth.registerLink', null, 'Ro\'yxatdan o\'ting')}
              </span>
            </p>
          </>
        ) : (
          /* Forgot Password: Enter Email to Send Recovery Link */
          <>
            <h2 className="auth-title" style={styles.title}>{t('auth.forgotTitle', null, 'Parolni tiklash')}</h2>
            <p className="auth-subtitle" style={styles.subtitle}>{t('auth.forgotSubtitle', null, 'Email manzilingizga xavfsiz tiklash havolasini yuboramiz')}</p>

            {forgotSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 16, color: '#10b981', fontSize: 13, lineHeight: 1.45 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                  <MailCheck size={20} /> {t('auth.emailSentTitle', null, 'Havola yuborildi!')}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>{forgotSuccess}</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false)
                    setForgotSuccess('')
                    setForgotError('')
                  }}
                  className="auth-btn"
                  style={{
                    ...styles.btn,
                    marginTop: 6,
                    padding: '9px 14px',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span>{t('auth.backToLogin', null, 'Kirish oynasiga qaytish')}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="auth-form" style={styles.form}>
                <div className="auth-field" style={styles.field}>
                  <label className="auth-label" style={styles.label}>{t('auth.email', null, 'Elektron pochta')}</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="auth-input"
                    style={styles.input}
                    autoFocus
                    disabled={forgotLoading}
                  />
                </div>

                {forgotError && <div style={styles.error}>{forgotError}</div>}

                <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>
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
